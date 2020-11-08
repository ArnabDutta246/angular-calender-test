import { AfterViewInit, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as firebase from 'firebase';
import * as moment from 'moment';
import { ConnectionService } from 'ng-connection-service';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { AllMembersDataService } from 'src/app/shared/all-members-data.service';
import { CalenderFunctionsService } from 'src/app/shared/calender-functions.service';
import { NotificationService } from 'src/app/shared/notification.service';
import { SweetAlertService } from 'src/app/shared/sweet-alert.service';
import { TextSearchService } from 'src/app/shared/text-search.service';

@Component({
  selector: 'app-user-expenses',
  templateUrl: './user-expenses.component.html',
  styleUrls: ['./user-expenses.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class UserExpensesComponent implements OnInit,AfterViewInit {

    myObject: any = {
    selctedMonth: {
      date: moment(),
      generated: moment().format('MMM, YYYY')
    },
    expenseDetails: {
      isExpenseAdmin: false,
      selectedAdminArea: {
        countryCode: '',
        region: ''
      },
      adminAreas: []
    },
    viewMode: 'monthly',
    currentPanel: 'user',
    graphColors : ['peachbg','bluebg','aquabg','purplebg','redbg','ashbg']
  }
  session: any;
  calendarMeta: any;
  expenseAdminRegions: any =[];
  leaveColors: any;
  monthStartDate: any = moment().startOf('month').subtract(1,'month');
  monthEndDate: any = moment().endOf('month').add(1,'month');
  graphX ={'month' : [], 'ytd': []};
  graphY = {'months': [], 'allMonthsdata': [], 'expenseGraph': [], 'maxValue': 1};
  grphXViewType: string = 'month';



  addExpense:boolean =false;
  expenseAdminView:boolean = false;


  // add expense form data
  expenseAdmins: any = [];
  formGroup: FormGroup;
  addnewspentTotal:any = 0;
  errorCode: string = null;
  formSubmitionCalendarYear = 2020;
  pageObj:any = {};


  //======= details section =========
  private dataSource=[];
  pendingData: any[] = [];
  otherData: any[] = [];

  searchTexts: string=null;
  searchMode: string = 'all';

  private data: any;
  pageTitle: string = "";
  viewMode: any = 'USER';
  selectedRegionCode: any;
  selectedCountry: any ='';
  selectedRegion: any = '';
  detailsData:any = null;

  constructor(
    private db: AllCollectionsService,
    private cal: CalenderFunctionsService,
    private allMembers:AllMembersDataService,
    private alertMessage:SweetAlertService,
    private spinner:NgxSpinnerService,
    private connectionService: ConnectionService,
    private searchMap:TextSearchService,
    private notification:NotificationService,
    private formBuilder: FormBuilder,
  ) {
    let session = this.allMembers.getCurrLogUserData();
    this.calendarMeta = this.cal.getCalendarMeta();
    this.session = {};
    Object.assign(this.session,{ user: session },{ calendarMeta: this.calendarMeta},{ admin: session });
    console.log("......session clg.....",this.session);
   }

  ngOnInit() {
    if(this.session.user.expenseAdmin){
      this.myObject.expenseDetails.isExpenseAdmin = true;
      this.myObject.expenseDetails.adminAreas = Object.values(this.session.user.expenseAdmin).sort();
    }


    //============ Add expense form data ================
    this.calendarMeta.calendarOptions.from = moment().startOf('month').subtract(12,'month');
    Object.assign(this.calendarMeta,{excludeStatus: ['rejected'], isUserCalendarRequired: true});
    this.getExpenseAdmins();
    let year = moment().format('YYYY');
    let month = moment().format('MM');
    this.cal.getCalendarYearData(month, year, this.session, this.calendarMeta,true);
    this.spinner.hide();
    // form for form submission
    this.formGroup = this.formBuilder.group({
      startDate: ['', Validators.compose([Validators.required])],
      endDate: ['', Validators.compose([Validators.required])],
      title: ['', Validators.compose([Validators.required])],
      description: ['', Validators.compose([Validators.required])],
      advance: [0, Validators.compose([Validators.required])]
    })

    this.createGraphX();


    // details section init
    if(this.session.user.expenseAdmin && this.viewMode == 'EXPENSEADMIN'){
      this.expenseAdminRegions = Object.values(this.session.user.expenseAdmin).sort();
      this.pageTitle = "Admin view expenses";
    } else {
      this.pageTitle = "User view expenses";
    }
    this.dataProcess({target:{value:0}});
  }

  ngAfterViewInit(){
    this.graphXMonth('now');
  }

  //---------> region changes function
   regionChanged(e){
    let data = this.myObject.expenseDetails.adminAreas[e];
    this.myObject.expenseDetails.selectedAdminArea.countryCode = data.country;
    this.myObject.expenseDetails.selectedAdminArea.region = data.region;
    this.graphY.months = [];
    this.graphXMonth('');
  }

  graphXMonth(type: string){
    if(type == 'back'){
      this.myObject.selctedMonth.date = moment(this.myObject.selctedMonth.date).subtract(1, 'months'); //.format("YYYY-MM-DD");
      this.myObject.selctedMonth.generated = moment(this.myObject.selctedMonth.date).format("MMM, YYYY");
    }else if(type == 'forward'){
      this.myObject.selctedMonth.date = moment(this.myObject.selctedMonth.date).add(1, 'months'); //.format("YYYY-MM-DD");
      this.myObject.selctedMonth.generated = moment(this.myObject.selctedMonth.date).format("MMM, YYYY");
    }else{
      this.myObject.selctedMonth.date = this.myObject.selctedMonth.date ? this.myObject.selctedMonth.date : moment();//.format("YYYY-MM-DD");
      this.myObject.selctedMonth.generated = this.myObject.selctedMonth.generated ? this.myObject.selctedMonth.generated : moment().format("MMM, YYYY");
    }
    this.createGraphX();
    this.createGraphY();
  }
  createGraphX(){
    this.spinner.show();
    this.graphX ={'month':[],'ytd':[]};
    let {countryCode,region} = this.myObject.expenseDetails.selectedAdminArea;
    // get the data from the related document, lets assume the data is available
    // this would be available from userLeaveCalendar collection for the user, similar to leave summary data
    let expensesRef;
    if(this.session.user.role == "ADMIN" && this.myObject.currentPanel=='admin' && !countryCode && !region){
      // nothing as of now
    }else if(this.session.user.expenseAdmin && this.expenseAdminRegions.length > 0 && this.myObject.currentPanel=='admin'){
      let {countryCode,region} = this.myObject.expenseDetails.selectedAdminArea;
      expensesRef = this.db.afs.collection(this.db._COLL_EXPENSE_REGULATOR, ref=> ref
        .where("subscriberId","==", this.session.admin.subscriberId)
        .where("country","==",countryCode)
        .where("region","==",region)
        .where("yearMonth","==",moment(this.myObject.selctedMonth.date).format('YYYYMM'))
        );
    }else{
      expensesRef = this.db.afs.collection(this.db._COLL_USER_EXPENSE_REGULATOR, ref=> ref
        .where("subscriberId","==", this.session.admin.subscriberId)
        .where("uid","==",this.session.user.uid)
        .where("yearMonth","==",moment(this.myObject.selctedMonth.date).format('YYYYMM'))
        );
    }
    // get data from database
    expensesRef.snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
        let data = a.payload.doc.data();
        const id = a.payload.doc.id;
        return {id, ...data};
      }))).subscribe(data=>{

        // this is to cover the case where no data found
        let expenseTypes = this.session.calendarMeta ?
                          this.session.calendarMeta.allExpensesOrgHave
                          :
                          {
                            Travel: {icon: 'md-plane', type:'Travel', allowed: 0, spent: 0},
                            Hotel: {icon: 'ios-podium', type:'Hotel', allowed: 0, spent: 0 },
                            // Club: {icon: 'ios-podium', type:'Club', allowed: 0, spent: 1100 },
                            Food: {icon: 'ios-restaurant', type:'Food', allowed: 0, spent: 0},
                            Telephone: {icon: 'md-call', type:'Telephone', allowed: 0, spent: 0},
                            zMiscellaneous: {icon: 'md-infinite', type:'Miscellaneous', allowed: 0, spent: 0},
                            OfficeStationary: {icon: 'ios-archive', type:'Office Stationary', allowed: 0, spent: 0},
                          };

        if(data.length > 0){
          expenseTypes = data[0].expenseSummary;
        }


        let values = expenseTypes ? Object.keys(expenseTypes).map(e=>expenseTypes[e].spent ? expenseTypes[e].spent : 0) : [];
        let maxValue = values.length > 0 ? 1.1*Math.max(...values) : 1.1;
        this.graphX.month = expenseTypes ? Object.keys(expenseTypes).map(et=>{
                                    let spent = expenseTypes[et].spent ? expenseTypes[et].spent : 0;
                                    return {...expenseTypes[et],
                                            spent: parseFloat(spent).toFixed(2),
                                            width: (spent/(maxValue>0 ? maxValue : 1))*100}
                                  })
                                  .sort((a,b)=>b.width-a.width)
                                  :
                                  [
                                    {icon: 'md-alert', type:'No expense calendar found', allowed: 0, spent: null, width: 0},
                                    {icon: 'md-cube', type:'Go to admin panel', allowed: 0, spent: null, width: 0},
                                    {icon: 'md-globe', type:'Select manage region', allowed: null, spent: null, width: 0 },
                                    {icon: 'md-calendar', type:'Select the period', allowed: 0, spent: null, width: 0 },
                                    {icon: 'md-cash', type:'Manage expense types', allowed: 0, spent: null, width: 0 },
                                  ];


        // Lets get the YTD figures now
        expenseTypes = this.myObject.currentPanel=='admin' ?
                       this.session.calendarMeta.orgCalendarYear.expenseTypes
                       :
                       this.session.calendarMeta.userCalendarYear.expenseTypes;
        let ytdvalues = expenseTypes ? Object.keys(expenseTypes).map(e=>expenseTypes[e].spent ? expenseTypes[e].spent : 0) : [];
        let ytdmaxValue = ytdvalues.length > 0 ? 1.1*Math.max(...ytdvalues) : 1.1;
        this.graphX.ytd = expenseTypes && Object.keys(expenseTypes).length >0 ? Object.keys(expenseTypes).map(et=>{
                                    let spent = expenseTypes[et].spent ? expenseTypes[et].spent : 0;
                                    return {...expenseTypes[et],
                                            spent: parseFloat(spent).toFixed(2),
                                            width: (spent/(ytdmaxValue>0 ? ytdmaxValue : 1))*100}
                                  })
                                  .sort((a,b)=>b.width-a.width)
                                  :
                                  [
                                    {icon: 'md-alert', type:'No expense calendar found', allowed: 0, spent: null, width: 0},
                                    {icon: 'md-cube', type:'Go to admin panel', allowed: 0, spent: null, width: 0},
                                    {icon: 'md-globe', type:'Select manage region', allowed: null, spent: null, width: 0 },
                                    {icon: 'md-calendar', type:'Select the period', allowed: 0, spent: null, width: 0 },
                                    {icon: 'md-cash', type:'Manage expense types', allowed: 0, spent: null, width: 0 },
                                  ];

        this.spinner.hide();
      })
  }





  // graph Y view responses
  createGraphY(){
    let selectedMonthYear = moment(this.myObject.selctedMonth.date).format("YYYYMM").toString();
    if(this.graphY.months.includes(selectedMonthYear) && this.graphY.months[2]==selectedMonthYear){
      // nothing to do here
    }else{
      this.graphY.months = [moment(this.myObject.selctedMonth.date).subtract(2, 'months').format("YYYYMM"),
                    moment(this.myObject.selctedMonth.date).subtract(1, 'months').format("YYYYMM"),
                    moment(this.myObject.selctedMonth.date).format("YYYYMM"),
                    moment(this.myObject.selctedMonth.date).add(1, 'months').format("YYYYMM"),
                    moment(this.myObject.selctedMonth.date).add(2, 'months').format("YYYYMM")];
      let dataRef;
      if(this.myObject.currentPanel == "user"){ // check if this is user panel
        dataRef = this.db.afs.collection(this.db._COLL_USER_EXPENSE_REGULATOR, ref=> ref
          .where("subscriberId","==",this.session.admin.subscriberId)
          .where("uid","==", this.session.user.uid)
          .where("yearMonth","in",this.graphY.months))
      }else{ // if this is admin panel
        dataRef = this.db.afs.collection(this.db._COLL_EXPENSE_REGULATOR, ref=> ref
          .where("subscriberId","==",this.session.admin.subscriberId)
          .where("country", "==", this.myObject.expenseDetails.selectedAdminArea.countryCode)
          .where("region","==",this.myObject.expenseDetails.selectedAdminArea.region)
          .where("yearMonth","in",this.graphY.months))
      }
      dataRef.snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
        let data = a.payload.doc.data();
        const id = a.payload.doc.id;
        return {id, ...data};
      }))).subscribe((data: any[])=>{
        this.graphY.allMonthsdata = data;
        this.getMonthlyPercentage();
      })
    }
  }
  getMonthlyPercentage(){
    this.graphY.expenseGraph =[];
    this.graphY.maxValue = 1;

    let months = this.graphY.months.sort((a,b)=>parseInt(a)-parseInt(b));

    let leaveSummary = this.graphY.allMonthsdata;
    let values = leaveSummary.map(d=>d.monthlyTotalExpense ? d.monthlyTotalExpense : 0);
    let graphYmaxValue = values.length > 0 ? Math.max(...values) : 1;
    this.graphY.maxValue = parseInt(graphYmaxValue.toString());
    months.forEach(m=>{
      let key = m;
      let record = leaveSummary.filter(l=>l.yearMonth==m);
      let monthlySummary = record.length==1 ? record[0].monthlyTotalExpense : 0;
      let height = (monthlySummary/(graphYmaxValue!=0 ? graphYmaxValue : 1)); //Math.floor(Math.random()*100);
      let month = moment(m+'01','YYYYMMDD').format('MMM');

      this.graphY.expenseGraph.push({
          date: new Date(moment(m+'01','YYYYMMDD').format('YYYY-MM-DD')),
          day: month,
          key: key,
          maxHeight: 100, // since we only have no of people on leave and do not compare with any other values
          height: height*100, //leaveSummary[key] ? Math.floor(leaveSummary[key].present / this.maxValue)*100 : Math.floor(Math.random()*100),
          cssClass:  height >= 0.80 ? //leaveSummary[key].present > 20 ?
                      'poor'
                      :
                      height>=0.5 ?
                      'peachbg'
                      :
                      'exceed'
                });
    })
     this.spinner.hide();;
  }
  changeView(){
    this.myObject.currentPanel = (this.myObject.currentPanel == 'admin') ? 'user' : 'admin';
    this.graphY.months = [];
    if(this.myObject.currentPanel=='user'){
      this.myObject.expenseDetails.selectedAdminArea.countryCode = this.session.user.countryServe;
      this.myObject.expenseDetails.selectedAdminArea.region = this.session.user.regionServe;
    } else {
      let data = this.myObject.expenseDetails.adminAreas[0];
      this.myObject.expenseDetails.selectedAdminArea.countryCode = data.country;
      this.myObject.expenseDetails.selectedAdminArea.region = data.region;
    }
    this.graphXMonth('');
  }


  toggleBack(){
    this.expenseAdminView = false;
    this.addExpense = false;
    this.detailsData = null;
  }


  getExpenseAdmins(){
    let ur = {country: this.session.user.countryServe, region: this.session.user.regionServe};
    return this.db.afs.collection(this.db.users,
      ref=> ref.where("subscriberId","==",this.session.admin.subscriberId)
      .where("expenseAdmin." + ur.country + "_" + ur.region.replace(/[^A-Za-z]/g,''),"==",ur))
      .snapshotChanges()
      .pipe(map((actions: any[]) => actions.map((a: any) => {
        const data = a.payload.doc.data();
        const id = a.payload.doc.id;
        return { id, ...data };
      }))).subscribe((data: any[]) => {
        this.expenseAdmins = data;
        // this.session.user.loader = false;
      })
  }

  calendarYear(e){
    this.formSubmitionCalendarYear = this.calendarMeta.userCalendarYear.year;
    this.spinner.hide();
  }

  dateFormation(date){
    return moment(date).format("ll");
  }
  // search text implementation
  searchText(){
    let searchText = this.formGroup.get("title").value+" "
    +this.session.user.name+" "
    +this.session.user.email+" "+
    moment(this.formGroup.get("startDate").value).format("YYYY")+" " +
    moment(this.formGroup.get("startDate").value).format("MMMM") + " " +
    moment(this.formGroup.get("startDate").value).format("MMM") + " " +
    moment(this.formGroup.get("endDate").value).format("YYYY")+" " +
    moment(this.formGroup.get("endDate").value).format("MMMM") + " " +
    moment(this.formGroup.get("endDate").value).format("MMM") + " pending applied " +
    Object.keys(this.calendarMeta.userCalendarYear.expenseTypes).map(k=>this.calendarMeta.userCalendarYear.expenseTypes[k].spent > 0 ? this.calendarMeta.userCalendarYear.expenseTypes[k].type : '' ).join(' ');

    let searchMap = this.searchMap.createSearchMap(searchText);
    return searchMap;
  }
  // form submit first validation
  formSubmit(){
      this.pushIntoCollection();
  }
  pushIntoCollection(){
    this.spinner.show();
    if(this.addnewspentTotal<=0){
      this.alertMessage.showAlert("error","Total expense should be more than zero, please check the amounts and try submitting again.","Invalid Total Expense")
      this.spinner.hide();
    } else if(!this.expenseAdmins || (this.expenseAdmins && this.expenseAdmins.length ==0)){
      this.alertMessage.showAlert("info", "No expense admin defined for you, please contact administrator to assign a expense manager for you","Warning");
    } else if(!this.calendarMeta.userCalendarYear || (this.calendarMeta.userCalendarYear && !this.calendarMeta.userCalendarYear.year)){
      this.alertMessage.showAlert("info","No expense calendar found for the calendar year. Please ask admin to associate your account to <b>"+this.session.user.regionServe+"</b> of country code: <b>"+this.session.user.countryServe+"</b>.","No Expense Calendar");
    } else {
      let {userexpenseTypes, userCalendarYear } = this.calendarMeta;
      userexpenseTypes.forEach(e=>{
        let o = userCalendarYear.expenseTypes[e];
        delete Object.assign(o, {['spent']: o['addnewspent'] ? parseFloat(o['addnewspent']) : 0 })['addnewspent'];
      });

      this.formSubmitionCalendarYear = this.calendarMeta.userCalendarYear.year;

      let expenseObj = {
                          subscriberId: this.session.admin.subscriberId,
                          uid: this.session.user.uid,
                          expenses: userCalendarYear.expenseTypes,
                          year: this.formSubmitionCalendarYear,
                          title: this.formGroup.get("title").value,
                          description: this.formGroup.get("description").value,
                          advance: parseFloat(this.formGroup.get("advance").value),
                          startDate: new Date(this.formGroup.get("startDate").value),
                          endDate: new Date(this.formGroup.get("endDate").value),
                          searchMap: this.searchText(),
                          status: "PENDING",
                          actionType: 'Applied',
                          appliedOn: firebase.firestore.FieldValue.serverTimestamp(),
                          country: this.session.user.countryServe,
                          region: this.session.user.regionServe,
                          expenseTotal: parseFloat(this.addnewspentTotal),
                          user: {
                            uid: this.session.user.uid,
                            name: this.session.user.name,
                            email: this.session.user.email,
                            picUrl: this.session.user.picUrl
                          }
                        };
      this.db.adddata(this.db._EXPENSES,expenseObj).then(res=>{
        this.spinner.hide();
        // notification
        let eventInfo = {
              origin: 'applyexpense',
              eventType: 'new',
              session: this.session,
              expenseAdmins: [...this.expenseAdmins],
              data: {
                id: res.id,
                subscriberId: this.session.admin.subscriberId,
                ...expenseObj
              },
            };
        this.notification.createNotifications(eventInfo);

        this.alertMessage.showAlert("successs", "You successfully created the expense request","Expense entry created");
        this.formGroup.reset();
        this.addnewspentTotal = 0;
        this.toggleBack();
      }).catch(err=>{
        this.spinner.hide();
        this.alertMessage.showAlert("Error",err,"Please Try Again");
      })
    }
  }

  onexpenseAmountChange(et){
    this.addnewspentTotal = 0;
    this.calendarMeta.userCalendarYear.expenseTypes[et].addnewspent = parseFloat(this.calendarMeta.userCalendarYear.expenseTypes[et].addnewspent);
    this.calendarMeta.userexpenseTypes.forEach(et=>{
    this.addnewspentTotal += this.calendarMeta.userCalendarYear.expenseTypes[et].addnewspent ?
                               this.calendarMeta.userCalendarYear.expenseTypes[et].addnewspent
                               :
                               0;
    })
    this.addnewspentTotal = parseFloat(this.addnewspentTotal).toFixed(2)
  }


  //============== details section ===========
  changeSearchMode(){
    this.searchMode = this.searchMode=='all' ? 'any' : 'all';
    if(this.searchTexts){
      this.getDataOfallSearch();
    } else {
      this.getAllExpenses();
    }
  }


  getDataOfallSearch()
  {
    this.spinner.show();
    let searchString = '';
    if(this.searchTexts && this.searchTexts.trim()){
      searchString = this.searchTexts;
      let expensesRef = this.db.afs.collection<any>(this.db._EXPENSES,
          ref=>this.searchMap.getSearchMapQuery(
                  this.session.user.expenseAdmin && this.expenseAdminRegions.length > 0 && this.viewMode=='EXPENSEADMIN' ?
                  ref.where("subscriberId","==", this.session.admin.subscriberId)
                  .where("country","==",this.selectedCountry)
                  .where("region","==",this.selectedRegion)
                  :
                  ref.where("subscriberId","==",this.session.admin.subscriberId)
                    .where("uid","==",this.session.user.uid)
                  ,
                  'searchMap',
                  searchString,
                  this.searchMode ? this.searchMode : 'all')
          );
          // get data from database
          expensesRef.snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
            let data = a.payload.doc.data();
            const id = a.payload.doc.id;
            let newTime = {
              expenseTypes: Object.keys(data.expenses).sort(),
              displayappliedOn: data.appliedOn && data.appliedOn.seconds ? moment(data.appliedOn.seconds*1000).format("ll") : 'Now',
              displaystartDate:moment(data.startDate.seconds*1000).format('ll'),
              displayendDate: moment(data.endDate.seconds*1000).format('ll'),
              appliedAgo: (data.status == 'PENDING' && data.previousStatus ? 'Re-submitted ': 'Applied ')+
                          (
                            data.appliedOn && data.appliedOn.seconds ?
                            (
                              moment().diff(data.appliedOn.seconds * 1000,'days') > 0 ?
                              (
                                moment().diff(data.appliedOn.seconds * 1000,'days')==1 ?
                                moment().diff(data.appliedOn.seconds * 1000,'days') + ' day ago'
                                :
                                moment().diff(data.appliedOn.seconds * 1000,'days') + ' days ago'
                              )
                              :
                              moment().diff(data.appliedOn.seconds * 1000,'hour') + ' hr ago'
                            )
                            :
                            '0 hr ago'
                          ),
              updateMadeOn: (data.status == 'CANCELLED' ? 'Canceled ': data.status == 'APPROVED'? 'Approved ' : 'Rejected ')+(
                              (data.updatedOn) ?
                                moment().diff(data.updatedOn.seconds * 1000,'days') > 0
                                ?
                                moment().diff(data.updatedOn.seconds * 1000,'days')==1
                                  ?
                                  moment().diff(data.updatedOn.seconds * 1000,'days') + ' day ago'
                                  :
                                  moment().diff(data.updatedOn.seconds * 1000,'days') + ' days ago'

                                :
                                moment().diff(data.updatedOn.seconds * 1000,'hour') + ' hr ago'
                              :
                              '0 hr ago'),
              }
              Object.assign(data, newTime);
              return {id, ...data};
            }))).subscribe(data=>{
              this.pendingData = data.filter(function(finding) { return finding.status == "PENDING"; });
            this.otherData = data.filter(function(finding) {
              return this.expenseAdminView == true ? finding.status === "APPROVED" : finding.status !== "PENDING";
              }.bind(this)
              );
              this.spinner.hide();
            })
          }else {
            this.getAllExpenses();
          }
  }

  dataProcess(position){
    if(this.session.user.expenseAdmin && this.viewMode == 'EXPENSEADMIN'){
      // this.expenseAdminRegions = Object.values(this.session.user.expenseAdmin).sort();
      if(this.expenseAdminRegions.length==0){
        this.alertMessage.showAlert("info", "Please note that your account is not linked to any valid region as expense admin. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Assign Expense Admin","No Expense Region");
        //this.toBackPage();
      } else {
        this.selectedCountry = this.expenseAdminRegions[position.target.value].country;
        this.selectedRegion = this.expenseAdminRegions[position.target.value].region;
      }
    }
    this.regionChanged(position.target.value);
    this.getAllExpenses();
  }

  getAllExpenses(){
    this.spinner.show();
    let expensesRef;
    if(this.session.user.role == "ADMIN" && this.viewMode=='EXPENSEADMIN' && !this.selectedCountry && !this.selectedRegion){
      expensesRef = this.db.afs.collection(this.db._EXPENSES, ref=> ref
        .where("subscriberId","==",this.session.admin.subscriberId));
    }else if(this.session.user.expenseAdmin && this.expenseAdminRegions.length > 0 && this.viewMode=='EXPENSEADMIN'){
      expensesRef = this.db.afs.collection(this.db._EXPENSES, ref=> ref
        .where("subscriberId","==", this.session.admin.subscriberId)
        .where("country","==",this.selectedCountry)
        .where("region","==",this.selectedRegion));
    }else{
      expensesRef = this.db.afs.collection(this.db._EXPENSES, ref=> ref
        .where("subscriberId","==",this.session.admin.subscriberId)
        .where("uid","==",this.session.user.uid));
    }
    // get data from database
    expensesRef.snapshotChanges().pipe(map((actions: any[]) => actions.map((a: any) => {
        let data = a.payload.doc.data();
        const id = a.payload.doc.id;
        let newTime = {
          expenseTypes: Object.keys(data.expenses).sort(),
          displayappliedOn: data.appliedOn && data.appliedOn.seconds ? moment(data.appliedOn.seconds*1000).format("ll") : 'Now',
          displaystartDate:moment(data.startDate.seconds*1000).format('ll'),
          displayendDate: moment(data.endDate.seconds*1000).format('ll'),
          appliedAgo: (data.status == 'PENDING' && data.previousStatus ? 'Re-submitted ': 'Applied ')+
                      (
                        data.appliedOn && data.appliedOn.seconds ?
                        (
                          moment().diff(data.appliedOn.seconds * 1000,'days') > 0 ?
                          (
                            moment().diff(data.appliedOn.seconds * 1000,'days')==1 ?
                            moment().diff(data.appliedOn.seconds * 1000,'days') + ' day ago'
                            :
                            moment().diff(data.appliedOn.seconds * 1000,'days') + ' days ago'
                          )
                          :
                          moment().diff(data.appliedOn.seconds * 1000,'hour') + ' hr ago'
                        )
                        :
                        '0 hr ago'
                      ),
          updateMadeOn: (data.status == 'CANCELLED' ? 'Canceled ': data.status == 'APPROVED'? 'Approved ' : 'Rejected ')+(
                          (data.updatedOn) ?
                            moment().diff(data.updatedOn.seconds * 1000,'days') > 0
                            ?
                            moment().diff(data.updatedOn.seconds * 1000,'days')==1
                              ?
                              moment().diff(data.updatedOn.seconds * 1000,'days') + ' day ago'
                              :
                              moment().diff(data.updatedOn.seconds * 1000,'days') + ' days ago'

                            :
                            moment().diff(data.updatedOn.seconds * 1000,'hour') + ' hr ago'
                          :
                          '0 hr ago'),
        }
        Object.assign(data, newTime);
        return {id, ...data};
      }))).subscribe(data=>{
        this.pendingData = data.filter(function(finding) { return finding.status == "PENDING"; });
        this.otherData = data.filter(function(finding) {
          return this.expenseAdminView == true ? finding.status === "APPROVED" : finding.status !== "PENDING";
          }.bind(this)
       );

       console.log("...pendding array..",this.pendingData);
       console.log("...pendding array..",this.otherData);
        this.spinner.hide();
      })
  }

  details(data){
    console.log("......... details object.....",data)
    let actionType = 'back';
    if(this.session.user.role == "ADMIN" || this.viewMode == 'EXPENSEADMIN'){ // if admin
      if(data.uid == this.session.user.uid && ['PENDING','APPROVED'].includes(data.status)){ // if own requests
        actionType = 'cancel';
      }else if(data.status=='PENDING'){
        actionType = 'approve';
      }
    }else{ // if not admin
      if(['PENDING','APPROVED'].includes(data.status)){
        actionType = 'cancel';
      }
    }
    //this.navCtrl.push(ExpenseDetailsPage,{data:this.session,details:data,actionType: actionType});

    this.addExpense = false;
    this.detailsData = {
      data:this.session,
      details:{...data},
      actionType: actionType
    }

    let element = document.getElementById("my-expenses"); //leave-details
    element.scrollIntoView({behavior: "smooth"});
  }

  toggleExpenseAdminView(){
    this.expenseAdminView = !this.expenseAdminView;
    this.viewMode = this.expenseAdminView? 'EXPENSEADMIN':'USER';
    if(this.session.user.expenseAdmin && this.viewMode == 'EXPENSEADMIN'){
      this.expenseAdminRegions = Object.values(this.session.user.expenseAdmin).sort();
      console.log("expense admin ... ",this.expenseAdminRegions);
    }
    this.changeView()
    this.changeSearchMode();
  }

  returnBack(){
    this.detailsData = null;
  }
}
