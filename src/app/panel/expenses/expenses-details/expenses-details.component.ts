import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as firebase from 'firebase';
import * as moment from 'moment';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { CalenderFunctionsService } from 'src/app/shared/calender-functions.service';
import { NotificationService } from 'src/app/shared/notification.service';
import { SweetAlertService } from 'src/app/shared/sweet-alert.service';
import { TextSearchService } from 'src/app/shared/text-search.service';

@Component({
  selector: 'app-expenses-details',
  templateUrl: './expenses-details.component.html',
  styleUrls: ['./expenses-details.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class ExpensesDetailsComponent implements OnInit,OnChanges {
  @Input() detailsData:any;
  @Output() returnBack = new EventEmitter<any>();
  private details:any;
  private data: any;
  private actionType: string='back';
  userCalendarYear: any;
  orgCalendarYear: any;
  detailsNote:string = '';
  changeHistory:any =[];
  showExpenseCategories: boolean = false;
  expensesToProcess: any =[];
  graphX ={'month' : [], 'ytd': []};
  graphColors : any = ['peachbg','bluebg','aquabg','purplebg','redbg','ashbg'];
  constructor(
    private notification: NotificationService,
    private alertMessage: SweetAlertService,
    private searchMap: TextSearchService,
    private db: AllCollectionsService,
    private cal: CalenderFunctionsService,
    private spinner:NgxSpinnerService
  ) { }

  ngOnInit() {
  }
  ngOnChanges(){
  if(this.detailsData){
    this.data = this.detailsData.data;
    this.details = this.detailsData.details;
    this.actionType = this.detailsData.actionType;

    //Object.assign(this.details,this.data);

    console.log("---- details");
    console.log(this.details);
    console.log("---- data");
    console.log(this.data);


    let prevStatus = {
      comment: this.details.comment ? this.details.comment : this.details.description,
      status: this.details.status,
      actionType: this.details.actionType,
      updatedBy: this.details.updatedBy ? this.details.updatedBy : this.details.user,
      updatedOn: this.details.updatedOn ? this.details.updatedOn : this.details.appliedOn,
    }

    if(!this.details.changeHistory){
      this.changeHistory=[prevStatus,]
    } else {
      this.changeHistory = [...this.details.changeHistory,prevStatus];
    }
    this.createGraphX();
  }
  }
    createGraphX(){
    this.spinner.show();
    this.graphX ={'month':[],'ytd':[]};
    let {country,region, uid, subscriberId, year} = this.details;
    // get the data from the related document, lets assume the data is available
    // this would be available from userLeaveCalendar collection for the user, similar to leave summary data
    let expensesRef;
    expensesRef = this.db.afs.collection(this.db._USER_LEAVE_CALENDAR, ref=> ref
        .where("subscriberId","==", subscriberId)
        .where("uid","==",uid)
        .where("country","==",country)
        .where("region","==",region)
        .where("year","==",year)
        );
    // get data from database
    expensesRef.snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
        let data = a.payload.doc.data();
        const id = a.payload.doc.id;
        return {id, ...data};
      }))).subscribe(data=>{
        // this is to cover the case where no data found
        let expenseTypes = {};
        if(data.length > 0){
          expenseTypes = data[0].expenseTypes;
        }
        // Lets get the YTD figures now
        let ytdvalues = expenseTypes ? Object.keys(expenseTypes).map(e=>expenseTypes[e].spent ? expenseTypes[e].spent : 0) : [];
        let ytdmaxValue = ytdvalues.length > 0 ? 1.1*Math.max(...ytdvalues) : 1.1;
        this.graphX.ytd = expenseTypes && Object.keys(expenseTypes).length >0 ? Object.keys(expenseTypes).map(et=>{
                                    let spent = expenseTypes[et].spent ? expenseTypes[et].spent : 0;
                                    return {...expenseTypes[et],
                                            spent: parseFloat(spent).toFixed(2),
                                            width: (spent/(ytdmaxValue>0 ? ytdmaxValue : 1))*100}
                                  }).sort((a,b)=>b.width-a.width) : [];
        this.spinner.hide();
      })
  }

  @ViewChild('noteTxt',{static:true}) myDetails: ElementRef;
  resizeNote(){
    this.myDetails.nativeElement.style.height = 'auto';
    this.myDetails.nativeElement.style.height = this.myDetails.nativeElement.scrollHeight + 'px';
  }

  searchtextRebuild(type){
    // let prevSearchTexts = this.details.searchMap;
    // let newSearchTexts = this.data.user.name+" "+this.data.user.email+" "+type;
    let searchText = this.details.title +" "
    +this.details.user.name+" "
    +this.details.user.email+" "+
    moment(this.details.startDate.seconds*1000).format("YYYY")+" " +
    moment(this.details.startDate.seconds*1000).format("MMMM") + " " +
    moment(this.details.startDate.seconds*1000).format("MMM") + " " +
    moment(this.details.endDate.seconds*1000).format("YYYY")+" " +
    moment(this.details.endDate.seconds*1000).format("MMMM") + " " +
    moment(this.details.endDate.seconds*1000).format("MMM") + " " +
    // action owner details
    type + " " +
    Object.keys(this.details.expenses).map(k=>this.details.expenses[k].spent > 0 ? this.details.expenses[k].type : '' ).join(' ');

    let searchMap = this.searchMap.createSearchMap(searchText);
    return searchMap;
    // return Object.assign(prevSearchTexts, result);
  }

  // cancel the request
  cancel(){
    this.alertMessage.confirmAlert("Confirmation","Are you sure that you want to cancel the expense claim ?")
    .then(res=>{
      this.cancelExpense();
    }).catch(err=>{});
  }

  cancelExpense(){
    this.spinner.show();
    // NOTE: Note that the cancel request can be of two types:
    // 1. Normal CANCEL REQUEST when the leave is not approved
    // 2. User tries to cancel an existing APPROVED leave
    // set the batch process
    let batch = this.db.afs.firestore.batch();
    // update document status
    let actionType = this.details.status=='APPROVED' ?
            'Cancellation request'
            :
            this.details.status=='PENDING' && this.details.previousStatus=='APPROVED' ?
            'Reverting cancellation request'
            :
            'Cancelled';
    let status = this.details.status=='APPROVED' ?
            'PENDING'
            :
            this.details.status=='PENDING' && this.details.previousStatus=='APPROVED' ?
            'APPROVED'
            :
            'CANCELLED';
    let cancelRef = this.db.afs.collection(this.db._EXPENSES).doc(this.details.id).ref;
    batch.set(cancelRef,{
      status: status,
      actionType: actionType,
      previousStatus: this.details.status,
      comment:  this.detailsNote,
      updatedBy: { uid: this.data.user.uid, name: this.data.user.name, email: this.data.user.email, picUrl: this.data.user.picUrl,},
      updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
      changeHistory: this.changeHistory,
    },{merge:true});
    // Purposefully another write to override the existing searchmap to reflect latest serach criterion
    batch.update(cancelRef,{searchMap: this.searchtextRebuild(actionType + ' ' + status)});

    batch.commit().then(res=>{
      this.alertMessage.showAlert("success","You have cancelled the expense request successfully","Expense Request Cancelled");
        this.spinner.hide();
        this.toBackPage();
    }).catch((err: any)=>{
      this.spinner.hide();
      this.alertMessage.showAlert("error",err,"Please Try Again");
    })
  }

  // reject the request
  reject(){
    this.spinner.show();

    let batch = this.db.afs.firestore.batch();
    let actionType = this.details.previousStatus=='APPROVED' ?
            'Rejected cancellation request'
            :
            'Rejected';
    let status = this.details.previousStatus=='APPROVED' ? 'APPROVED' : 'REJECTED';

    let data = {
      status: status,
      actionType: actionType,
      previousStatus: this.details.status,
      comment:  this.detailsNote,
      updatedBy: { uid: this.data.user.uid, name: this.data.user.name, email: this.data.user.email, picUrl: this.data.user.picUrl,},
      updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
      changeHistory: this.changeHistory,
    }
    let rejectRef = this.db.afs.collection(this.db._EXPENSES).doc(this.details.id).ref;
    batch.update(rejectRef, data);
    // another update
    batch.update(rejectRef, {searchMap: this.searchtextRebuild(actionType + ' ' + status)});

    // send notification
    let eventInfo = {
      origin: 'expenseRejected',
      eventType: 'reject',
      session: this.data,
      expense: this.details,
      data: {
        id: this.details.id,
        subscriberId: this.data.admin.subscriberId,
        ...data
      },
    };
    this.notification.createNotifications(eventInfo);

    batch.commit().then(()=>{
      this.alertMessage.showAlert("success","You have rejected the expense request successfully","Expense Request Rejected");
      this.spinner.hide();
      this.toBackPage();
    }).catch(err=>{
      this.alertMessage.showAlert("Error","Something went wrong...");
      this.spinner.hide();
    })
  }

  // approve the request
  approve(){
    this.spinner.show();
    this.transaction();
  }

  splitExpenseAmount(){
    // let expenseTotal = this.details.expenseTotal;
    let startDate = moment(new Date(this.details.startDate.seconds*1000));
    let endDate = moment(new Date(this.details.endDate.seconds*1000));
    let totalNoOfDays = moment(endDate).diff(startDate,'days') + 1;
    let isLastLeg = false;
    let ifactor = this.details.previousStatus == 'APPROVED' ? -1 : 1;
    let expenses = {};
    Object.keys(this.details.expenses).forEach(k=>{
      expenses[k] = {...this.details.expenses[k]};
      expenses[k].spent = expenses[k].spent * ifactor;
    });

    this.expensesToProcess =[];
    while(startDate <= endDate){
      let year = moment(startDate).format("YYYY");
      let month = moment(startDate).format("MM");
      let yearMonth = moment(startDate).format('YYYYMM');
      let expenseSummaryObj: any = {
                                    subscriberId: this.details.subscriberId,
                                    country: this.details.country,
                                    region: this.details.region,
                                    year: year,
                                    month: month,
                                    yearMonth: yearMonth,
                                    };
      let regionalSummary = {...expenseSummaryObj};
      let userSummary = {...expenseSummaryObj}
      // split according to months
      let factor = 1; //ifactor;
      if(moment(startDate).format('YYYYMM')==moment(endDate).format('YYYYMM')){
        factor = 1; //ifactor; this is because we already catored the signage with the spent amounts againt each type
        isLastLeg = true;
      } else {
        let noOfDays = moment(startDate).endOf('month').diff(startDate,'days') + 1;
        factor = ifactor*(noOfDays/totalNoOfDays);
      }
      let proportionateTotal = 0;
      let proportionalexpenses = {};
      Object.keys(expenses).forEach(k=>{
                    let foctoredspent = isLastLeg ?
                                expenses[k].spent*factor
                                :
                                this.details.expenses[k].spent*factor;
                    console.log("value of K", k, foctoredspent,expenses[k].spent)
                    Object.assign(proportionalexpenses,
                        {[k]:{...expenses[k],
                              spent: firebase.firestore.FieldValue.increment(foctoredspent)
                            }
                          });
                    proportionateTotal += foctoredspent;
                    expenses[k].spent -= foctoredspent;
                    // expenseTotal -= foctoredspent;
                });
      Object.assign(regionalSummary,{
                                      monthlyTotalExpenseCount: firebase.firestore.FieldValue.increment(ifactor),
                                      monthlyTotalExpense: firebase.firestore.FieldValue.increment(proportionateTotal),
                                      expenseSummary: proportionalexpenses,
                                      users: {[this.details.user.uid]:{...this.details.user,
                                                 count: firebase.firestore.FieldValue.increment(ifactor)
                                               }
                                             },
                                    }
                                    );
      Object.assign(userSummary,{
                                      monthlyTotalExpenseCount: firebase.firestore.FieldValue.increment(ifactor),
                                      monthlyTotalExpense: firebase.firestore.FieldValue.increment(proportionateTotal),
                                      expenseSummary: proportionalexpenses,
                                      uid: this.details.user.uid,
                                      userInfo: {...this.details.user},
                                    }
                                    );
      this.expensesToProcess.push({yearMonth, regionalSummary, userSummary});

      startDate = moment(startDate).startOf('month').add(1,'month');
    }

  }


  transaction(){
    // NOTE: Note that the approval request can be of two types:
    // 1. Normal APPROVAL REQUEST when user applies leave for the first time
    // 2. User tries to cancel an existing APPROVED leave,
    // document reference of the leave request
    let docRef = this.db.afs.collection(this.db._EXPENSES).doc(this.details.id).ref;
    let ifactor = this.details.previousStatus == 'APPROVED' ? -1 : 1;

    // transaction provide here
    return this.db.afs.firestore.runTransaction(function(transaction) {
      return transaction.get(docRef).then(function(regDoc) {
          let data = this.details;
          let endDate = moment(new Date(data.endDate.seconds*1000));
          let startDate = moment(new Date(data.startDate.seconds*1000));
          let yearMonth = moment(startDate).format('YYYYMM');
          // First get the expenseTypes to to be saved for the user
          let expenseTypes = {};

          Object.keys(data.expenses).forEach(k=>{
                        Object.assign(expenseTypes,
                            {[k]:{...data.expenses[k],
                                  spent: firebase.firestore.FieldValue.increment(data.expenses[k].spent*ifactor)
                                }
                              });
                    });
          // Now split into proportionate amounts
          this.splitExpenseAmount();
          // initialise the summary view object
          this.expensesToProcess.forEach(e=>{
            // let increment regional summary
            let regSummaryId = data.subscriberId+"_"+data.country+"_"+
                        data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+"_"+
                        e.yearMonth;
            let regSummaryRef = this.db.afs.collection(this.db._COLL_EXPENSE_REGULATOR).doc(regSummaryId).ref;
            transaction.set(regSummaryRef, e.regionalSummary, {merge: true});
            // Now increse user summary
            let userSummaryId = data.uid + "_" + data.subscriberId+"_"+
                        // data.country+"_"+data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+"_"+
                        e.yearMonth;
            let userSummaryRef = this.db.afs.collection(this.db._COLL_USER_EXPENSE_REGULATOR).doc(userSummaryId).ref;
            transaction.set(userSummaryRef, e.userSummary, {merge: true});
          });

          // now increment the expense spent amount
          let kpiId = data.user.uid + data.subscriberId+data.country+
                      data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+
                      data.year;
          let kpiRef = this.db.afs.collection(this.db._USER_LEAVE_CALENDAR).doc(kpiId).ref;

          transaction.set(kpiRef, {expenseTypes},{merge: true});

          let orgkpiId = data.subscriberId+"_"+data.country+"_"+
                      data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+"_"+
                      data.year;
          let orgkpiRef = this.db.afs.collection(this.db._LEAVE_CALENDER).doc(orgkpiId).ref;

          transaction.set(orgkpiRef, {expenseTypes},{merge: true});
          // finally mark the leave as approved
          let actionType = ifactor==1 ?
                  'Approved'
                  :
                  'Cancellation request approved';
          let objExpenseApproval = {
                                    status: ifactor==1 ? 'APPROVED' : 'CANCELLED',
                                    actionType: actionType,
                                    previousStatus: this.details.status,
                                    comment:  this.detailsNote,
                                    updatedBy: { uid: this.data.user.uid, name: this.data.user.name, email: this.data.user.email, picUrl: this.data.user.picUrl,},
                                    updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
                                    changeHistory: this.changeHistory,
                                  };
          transaction.set(docRef, objExpenseApproval, {merge: true});
          transaction.update(docRef, {searchMap: this.searchtextRebuild(actionType + ' ' + (ifactor==1 ? 'APPROVED' : 'CANCELLED'))});
          // send notification
          let eventInfo = {
            origin: 'expenseApproved',
            eventType: 'approve',
            session: this.data,
            expense: this.details,
            data: {
              id: this.details.id,
              subscriberId: this.data.admin.subscriberId,
              ...objExpenseApproval
            },
          };
          this.notification.createNotifications(eventInfo);
      }.bind(this));
    }.bind(this)).then(function() {
        this.alertMessage.showAlert("success","You have approved the expense request successfully","Expense Approved");
        this.spinner.hide();
        this.toBackPage()
    }.bind(this)).catch(function(error) {
        this.alertMessage.showAlert("error", error ,"Error Expense Approval");
        this.spinner.hide();
    }.bind(this));
  }

  checkOrgHoliday(checkDate: any){
    if(this.orgCalendarYear.weeklyOffDays.includes(parseInt(moment(checkDate).format('e')))){
      return true;
    }
    let idx = Object.keys(this.orgCalendarYear.holidays)
                    .findIndex(h=>{
                              let start = moment(this.orgCalendarYear.holidays[h].startDate.seconds*1000);
                              let end = moment(this.orgCalendarYear.holidays[h].endDate.seconds*1000);
                              if(start <= checkDate && end >= checkDate){
                                return true;
                              }
                            });
    if(idx!=-1){
      return true;
    }
  }

  find_user_leave_calendar_doc(){
        let docId;
        return new Promise((resolve: any, reject: any)=> {
          this.db.afs.collection(this.db._USER_LEAVE_CALENDAR,
            ref => ref.where('uid','==',this.details.uid)
            .where("year","==",this.details.year)
          ).get().toPromise().then(function(querySnapshot){
            querySnapshot.forEach(function(doc){
              docId = doc.id;
            }.bind(this));
            resolve(docId);
          }.bind(this)).catch(err =>{
            this.spinner.hide();
            reject(err);
          })
        });
  }

  increment_decrement(docId, type){
      var code=this.details.code; //.replace(/\s/g,'').toLowerCase();
      let amount = (type == "increse") ? this.details.daysCount : -this.details.daysCount;

      const batch = this.db.afs.firestore.batch();
      const kpiRef = this.db.afs.collection(this.db._USER_LEAVE_CALENDAR).doc(docId).ref;

      batch.update(kpiRef, {
        [`leaveTypes.${code}.taken`]: firebase.firestore.FieldValue.increment(amount),
        // [`${type}taken`]: firebase.firestore.FieldValue.increment(1),
      });

      let orgDocId = this.details.subscriberId + "_" + this.details.country +
                     "_" + this.details.region.replace(/[^A-Za-z]/g,'').toUpperCase() + "_" + this.details.year;
      const orgRef = this.db.afs.collection(this.db._LEAVE_CALENDER).doc(orgDocId).ref;

      batch.update(orgRef, {
        [`leaveTypes.${code}.taken`]: firebase.firestore.FieldValue.increment(amount),
        // [`${type}taken`]: firebase.firestore.FieldValue.increment(1),
      });
      batch.commit().then(() =>{
          this.data.user.loader=false;
          this.toBackPage();
      }).catch((err) => {});
  }
  // we need the organisation calendar year to fetch the user leave calendar
  getuserLeaveCalendar(){
    if(this.details.id){
      this.spinner.show();
      return this.db.afs.collection(this.db._USER_LEAVE_CALENDAR,
        ref=> ref.where("subscriberId","==",this.details.subscriberId)
        .where("uid","==",this.details.user.uid)
        .where("country","==",this.details.country)
        .where("region","==",this.details.region)
        .where("year","==",this.details.year)
      ).snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          return { id, ...data };
      }))).subscribe((data: any)=>{
        this.spinner.hide();
        if(data.length > 0){
          this.userCalendarYear = Object.keys(data[0].leaveTypes).sort().map(key => ({type: key, value: data[0].leaveTypes[key]}));
        } else {
          this.userCalendarYear = [];
          this.alertMessage.showAlert("info","Please note that no region or region calendar has been associated to your account. Please request your leave manager to associate a region calendar through manage region calendar option.","Info");
        }
      });
    } else {
      this.userCalendarYear = [];
    }
  }


  // we need the organisation calendar year to fetch the user leave calendar
  getOrgLeaveCalendar(){
    if(this.details.id){
      this.spinner.show();
      return this.db.afs.collection(this.db._LEAVE_CALENDER,
        ref=> ref.where("subscriberId","==",this.details.subscriberId)
        .where("country","==",this.details.country)
        .where("region","==",this.details.region)
        .where("year","==",this.details.year)
      ).snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          return { id, ...data };
      }))).subscribe((data: any)=>{
        this.spinner.hide();
        if(data.length > 0){
          this.orgCalendarYear = data[0];
        } else {
          this.orgCalendarYear = [];
          this.alertMessage.showAlert("info","Please note that no region or region calendar has been associated to your account. Please request your leave manager to associate a region calendar through manage region calendar option.","Info");
        }
      });
    } else {
      this.userCalendarYear = [];
    }
  }
  // getting percentage of summary
  gettingPercentage(data){
    const allowed = parseInt(data.allowed);
    const taken = parseInt((data.taken) ? data.taken : "0");
    let reult = Math.floor((taken / allowed) * 100);
    return reult+'%';
  }
  getDateFormat(date: any,type:string='ll'){
    return moment(date).format(type);
  }
  // targetting to other pages
  toBackPage(){
    //this.navCtrl.pop();
    this.returnBack.emit();
  }
}
