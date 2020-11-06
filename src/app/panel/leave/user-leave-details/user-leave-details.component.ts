import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewEncapsulation } from '@angular/core';
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
  selector: 'app-user-leave-details',
  templateUrl: './user-leave-details.component.html',
  styleUrls: ['./user-leave-details.component.scss'],
   encapsulation:ViewEncapsulation.None,
})
export class UserLeaveDetailsComponent implements OnInit,OnChanges {
  @Input() detailsData:any;
  @Output() returnBack = new EventEmitter<any>();
  private details:any;
  private data: any;
  actionType: string='back';
  userCalendarYear: any;
  orgCalendarYear: any;
  detailsNote:string = '';
  changeHistory:any =[];
  leaveColors: any;

  constructor(
    private notification: NotificationService,
    private alertMessage: SweetAlertService,
    private searchMap: TextSearchService,
    private db: AllCollectionsService,
    private cal: CalenderFunctionsService,
    private spinner:NgxSpinnerService
  ) {
    //console.log("constructor data detailsData", this.detailsData);
  }

  ngOnInit() {

  }

  ngOnChanges(){
  if(this.detailsData){
    this.data = this.detailsData.data;
    this.details = this.detailsData.details;
    this.actionType = this.detailsData.actionType;
    this.leaveColors = this.cal.leaveColors;


    console.log("---- details");
    console.log(this.details);
    console.log("---- data");
    console.log(this.data);


    let prevStatus = {
    comment: this.details.data.data.comment ? this.details.data.data.comment : this.details.data.data.reason,
    status: this.details.data.data.status,
    actionType: this.details.data.data.actionType,
    updatedBy: this.details.data.data.updatedBy ? this.details.data.data.updatedBy : this.details.data.data.user,
    updatedOn: this.details.data.data.updatedOn ? this.details.data.data.updatedOn : this.details.data.data.applied,
  }
    if(!this.details.data.data.changeHistory){
      this.changeHistory=[prevStatus,]
    } else {
      this.changeHistory = [...this.details.data.data.changeHistory,prevStatus];
    }
    this.getuserLeaveCalendar();
    this.getOrgLeaveCalendar();
    }
  }
  searchtextRebuild(type){
    // let prevSearchTexts = this.details.data.searchMap;
    // let newSearchTexts = this.data.user.name+" "+this.data.user.email+" "+type;
    // let result = await this.searchMap.createSearchMap(newSearchTexts);
    let searchStrings = this.details.data.data.type+" "+
    // this.data.user.name +" "+this.data.user.email+ " " +
    this.details.data.data.user.name +" "+this.details.data.data.user.email+ " " +
    moment(this.details.data.data.startDate.seconds*1000).format("YYYY") + " "+
    moment(this.details.data.data.startDate.seconds*1000).format("MMMM") + " " +
    moment(this.details.data.data.startDate.seconds*1000).format("MMM") + " " +
    moment(this.details.data.data.endDate.seconds*1000).format("YYYY") + " "+
    moment(this.details.data.data.endDate.seconds*1000).format("MMMM") + " " +
    moment(this.details.data.data.endDate.seconds*1000).format("MMM") + " " + type;
    return this.searchMap.createSearchMap(searchStrings);
  }
  // cancel the request
  cancel(){
    this.alertMessage.confirmAlert("Are you sure that you want to cancel the leave request ?","Confirmation")
    .then(()=>{
      this.cancelLeave();
    }).catch(()=>{});
  }

  cancelLeave(){
    this.spinner.show();
    // NOTE: Note that the cancel request can be of two types:
    // 1. Normal CANCEL REQUEST when the leave is not approved
    // 2. User tries to cancel an existing APPROVED leave
    // set the batch process
    let batch = this.db.afs.firestore.batch();
    // update document status
    let actionType = this.details.data.data.status=='APPROVED' ?
            'Cancellation request'
            :
            this.details.data.data.status=='PENDING' && this.details.data.data.previousStatus=='APPROVED' ?
            'Reverting cancellation request'
            :
            'Cancelled';
    let status = this.details.data.data.status=='APPROVED' ? 'PENDING' :
        this.details.data.data.status=='PENDING' && this.details.data.data.previousStatus=='APPROVED' ? 'APPROVED' : 'CANCELLED';
    let cancelRef = this.db.afs.collection(this.db._LEAVES_APPLIED).doc(this.details.docId).ref;
    batch.set(cancelRef,{
      status: status,
      actionType: actionType,
      previousStatus: this.details.data.data.status,
      comment:  this.detailsNote,
      updatedBy: { uid: this.data.uid, name: this.data.name, email: this.data.email, picUrl: this.data.picUrl,},
      updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
      changeHistory: this.changeHistory,
    },{merge:true});
    // Purposefully another write to override the existing searchmap to reflect latest serach criterion
    batch.update(cancelRef,{searchMap: this.searchtextRebuild(actionType + ' ' + status)});

    batch.commit().then(res=>{
      // check if the document in pending or approved
      // if document is approved this following status will also change
      this.alertMessage.showAlert("success","You have cancelled the leave request successfully","Leave Cancelled");
      this.spinner.hide();
    }).catch((err: any)=>{
      this.spinner.hide();
      this.alertMessage.showAlert("error",err,"Please Try Again");
    })
  }

  // reject the request
  reject(){
    this.spinner.show();

    let batch = this.db.afs.firestore.batch();
    let actionType = this.details.data.data.previousStatus=='APPROVED' ?
            'Rejected cancellation request'
            :
            'Rejected';
    let status = this.details.data.data.previousStatus=='APPROVED' ? 'APPROVED' : 'REJECTED';

    // update data
    let rejectRef = this.db.afs.collection(this.db._LEAVES_APPLIED).doc(this.details.docId).ref;
    let data = {
      status: status,
      actionType: actionType,
      previousStatus: this.details.data.data.status,
      comment:  this.detailsNote,
      updatedBy: { uid: this.data.uid, name: this.data.name, email: this.data.email, picUrl: this.data.picUrl,},
      updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
      changeHistory: this.changeHistory,
    }
    console.log("....write batch data",data);
    console.log("....search map result",this.searchtextRebuild(actionType + ' ' + status));
    batch.update(rejectRef, data);
    // another update
    batch.update(rejectRef, {searchMap: this.searchtextRebuild(actionType + ' ' + status)});

    // send notification
    let eventInfo = {
      origin: 'leaveRejected',
      eventType: 'reject',
      session: this.data,
      leave: this.details.data.data,
      data: {
        id: this.details.docId,
        subscriberId: this.data.subscriberId,
        ...data
      },
    };
    this.notification.createNotifications(eventInfo);

    batch.commit().then(()=>{
        this.alertMessage.showAlert("success","You have rejected the leave request successfully","Leave Rejected");
        this.spinner.hide();
        this.toBackPage();
    }).catch(()=>{
        this.spinner.hide();
      this.alertMessage.showAlert("error","Something went wrong..","Error",);
    })
  }

  // approve the request
  approve(){
    this.spinner.show();
    this.transaction();
  }
  transaction(){
    console.log(this.details);
    // NOTE: Note that the approval request can be of two types:
    // 1. Normal APPROVAL REQUEST when user applies leave for the first time
    // 2. User tries to cancel an existing APPROVED leave,
    // document reference of the leave request
    let docRef = this.db.afs.collection(this.db._LEAVES_APPLIED).doc(this.details.docId).ref;
    let ifactor = this.details.data.data.previousStatus == 'APPROVED' ? -1 : 1;
    // transaction provide here
    return this.db.afs.firestore.runTransaction(function(transaction) {
      return transaction.get(docRef).then(function(regDoc) {
          let {data} = this.details;
          let endDate = moment(new Date(data.data.endDate.seconds*1000));
          let startDate = moment(new Date(data.data.startDate.seconds*1000));
          let yearMonth = moment(startDate).format('YYYYMM');
          // initialise the summary view object
          let increment = ifactor*0;
          let regionalLeaveSummary: any = {  subscriberId: data.data.subscriberId,
                                        country: data.data.country,
                                        region: data.data.region,
                                        year: moment(startDate).format("YYYY"),
                                        month: moment(startDate).format("MM"),
                                        yearMonth: moment(startDate).format("YYYYMM"),
                                        monthlySummary: firebase.firestore.FieldValue.increment(increment),
                                        leaveSummary: {
                                            [moment(startDate).format("YYYYMMDD")] :
                                                { onLeave: firebase.firestore.FieldValue.increment(ifactor*1),
                                                  users: {[data.data.uid]: ifactor==1 ?
                                                                          {...data.data,
                                                                             startDate: new Date(data.data.startDate.seconds*1000),
                                                                             endDate: new Date(data.data.endDate.seconds*1000),
                                                                           }
                                                                           :
                                                                           {}
                                                                       },}
                                            }
                                        };
          // let increment = 0;
          let summaryId = data.data.subscriberId+"_"+data.data.country+"_"+
                      data.data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+"_"+
                      yearMonth;
          let summaryRef = this.db.afs.collection(this.db._COLL_LEAVE_REGULATOR).doc(summaryId).ref;
          while(startDate <= endDate){
            if(yearMonth != moment(startDate).format('YYYYMM')){
              summaryId = data.data.subscriberId+"_"+data.data.country+"_"+
                          data.data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+"_"+
                          yearMonth;
              summaryRef = this.db.afs.collection(this.db._COLL_LEAVE_REGULATOR).doc(summaryId).ref;
              transaction.set(summaryRef, regionalLeaveSummary, {merge: true});
              yearMonth = moment(startDate).format('YYYYMM');
              increment = ifactor*1;
              regionalLeaveSummary = {      subscriberId: data.data.subscriberId,
                                            country: data.data.country,
                                            region: data.data.region,
                                            year: moment(startDate).format("YYYY"),
                                            month: moment(startDate).format("MM"),
                                            yearMonth: moment(startDate).format("YYYYMM"),
                                            monthlySummary: firebase.firestore.FieldValue.increment(increment),
                                            leaveSummary: {
                                                [moment(startDate).format("YYYYMMDD")] :
                                                    { onLeave: firebase.firestore.FieldValue.increment(ifactor*1),
                                                      users: {[data.data.uid]: ifactor==1 ?
                                                                              {...data,
                                                                               startDate: new Date(data.data.startDate.seconds*1000),
                                                                               endDate: new Date(data.data.endDate.seconds*1000),
                                                                              }
                                                                              :
                                                                              {}
                                                                            },}
                                                }
                                            };
              // console.log("In the if of loop",moment(startDate).format("YYYYMMDD"), regionalLeaveSummary,  )
            } else {
              if(!this.checkOrgHoliday(startDate)){
                if(ifactor==1){
                  increment ++;
                } else {
                  increment--;
                }
                Object.assign(regionalLeaveSummary,
                                {
                                  monthlySummary: firebase.firestore.FieldValue.increment(increment),
                                  yearMonth: moment(startDate).format("YYYYMM"),
                                });
                Object.assign(regionalLeaveSummary.leaveSummary,{
                                    [moment(startDate).format("YYYYMMDD")] :
                                        { onLeave: firebase.firestore.FieldValue.increment(ifactor*1),
                                          users: {[data.data.uid]:ifactor==1 ?
                                                                  {...data,
                                                                   startDate: new Date(data.data.startDate.seconds*1000),
                                                                   endDate: new Date(data.data.endDate.seconds*1000),
                                                                  }
                                                                  :
                                                                  {}
                                                                },}
                                    }
                                );
              }
              // console.log("In the else of loop",moment(startDate).format("YYYYMMDD"), regionalLeaveSummary,  );
            }

            startDate = startDate.add(1, 'days');
          }
          // Complete the last transaction which is to be executed out of while loop
          summaryId = data.data.subscriberId+"_"+data.data.country+"_"+
                      data.data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+"_"+
                      yearMonth;
          summaryRef = this.db.afs.collection(this.db._COLL_LEAVE_REGULATOR).doc(summaryId).ref;
          console.log("regionalLeaveSummary",regionalLeaveSummary);
          transaction.set(summaryRef, regionalLeaveSummary, {merge: true});

          // now increment the leave taken count
          let kpiId = data.data.uid + data.data.subscriberId+data.data.country+
                      data.data.region.replace(/[^A-Za-z]/g,'').toUpperCase()+
                      data.data.year;
          let kpiRef = this.db.afs.collection(this.db._USER_LEAVE_CALENDAR).doc(kpiId).ref;

          transaction.update(kpiRef, {
            [`leaveTypes.${data.data.code}.taken`]: firebase.firestore.FieldValue.increment(ifactor*data.data.daysCount),
          });
          // finally mark the leave as approved
          let actionType = ifactor==1 ?
                  'Approved'
                  :
                  'Cancellation request approved';
          let objLeaveApproval = {
                                    status: ifactor==1 ? 'APPROVED' : 'CANCELLED',
                                    actionType: actionType,
                                    previousStatus: this.details.data.data.status,
                                    comment:  this.detailsNote,
                                    updatedBy: { uid: this.data.uid, name: this.data.name, email: this.data.email, picUrl: this.data.picUrl,},
                                    updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
                                    changeHistory: this.changeHistory,
                                  };
          transaction.set(docRef, objLeaveApproval, {merge: true});
          transaction.update(docRef, {searchMap: this.searchtextRebuild(actionType + ' ' + (ifactor==1 ? 'APPROVED' : 'CANCELLED'))});

          // send notification
          let eventInfo = {
            origin: 'leaveApproved',
            eventType: 'approve',
            session: this.data,
            leave: this.details.data.data,
            data: {
              id: this.details.docId,
              subscriberId: this.data.subscriberId,
              ...objLeaveApproval
            },
          };
          this.notification.createNotifications(eventInfo);
      }.bind(this));
    }.bind(this)).then(function() {
        this.alertMessage.showAlert("success","You have approved the leave request successfully","Leave Approved");
        this.spinner.hide();
        this.toBackPage()
    }.bind(this)).catch(function(error) {

        this.spinner.hide();
        this.alertMessage.showAlert("error",error,"Error Leave Approval");
        console.log(error)
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
            ref => ref.where('uid','==',this.details.data.data.uid)
            .where("year","==",this.details.data.data.year)
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
      var code=this.details.data.data.code; //.replace(/\s/g,'').toLowerCase();
      let amount = (type == "increse") ? this.details.data.data.daysCount : -this.details.data.data.daysCount;

      const batch = this.db.afs.firestore.batch();
      const kpiRef = this.db.afs.collection(this.db._USER_LEAVE_CALENDAR).doc(docId).ref;

      batch.update(kpiRef, {
        [`leaveTypes.${code}.taken`]: firebase.firestore.FieldValue.increment(amount),
        // [`${type}taken`]: firebase.firestore.FieldValue.increment(1),
      });

      let orgDocId = this.details.data.data.subscriberId + "_" + this.details.data.data.country +
                     "_" + this.details.data.data.region.replace(/[^A-Za-z]/g,'').toUpperCase() + "_" + this.details.data.data.year;
      const orgRef = this.db.afs.collection(this.db._LEAVE_CALENDER).doc(orgDocId).ref;

      batch.update(orgRef, {
        [`leaveTypes.${code}.taken`]: firebase.firestore.FieldValue.increment(amount),
        // [`${type}taken`]: firebase.firestore.FieldValue.increment(1),
      });
      batch.commit().then(() =>{
          this.spinner.hide();
           this.toBackPage();
      }).catch((err) => {});
  }
  // we need the organisation calendar year to fetch the user leave calendar
  getuserLeaveCalendar(){
    if(this.details.data.data){
      this.spinner.show();
      console.log(this.details.data)
      return this.db.afs.collection(this.db._USER_LEAVE_CALENDAR,
        ref=> ref.where("subscriberId","==",this.details.data.data.subscriberId)
        .where("uid","==",this.details.data.data.uid)
        .where("country","==",this.details.data.data.country)
        .where("region","==",this.details.data.data.region)
        .where("year","==",this.details.data.data.year)
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
          this.alertMessage.showAlert("info","Please note that no region or region calendar has been associated to your account. Please request your leave manager to associate a region calendar through manage region calendar option.","Info",);
        }
      },(error)=>{console.log(error)});
    } else {
      this.userCalendarYear = [];
    }
  }


  // we need the organisation calendar year to fetch the user leave calendar
  getOrgLeaveCalendar(){
    if(this.details.data){
      this.spinner.show();
      console.log(this.details.data);
      return this.db.afs.collection(this.db._LEAVE_CALENDER,
        ref=> ref.where("subscriberId","==",this.details.data.data.subscriberId)
        .where("country","==",this.details.data.data.country)
        .where("region","==",this.details.data.data.region)
        .where("year","==",this.details.data.data.year)
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
      },(error)=>{console.log(error)});
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

  getDateFormat(date: any,type:string='ll',data?){
    return moment(date).format(type);
  }


  toBackPage(){
    this.returnBack.emit();
  }
}
