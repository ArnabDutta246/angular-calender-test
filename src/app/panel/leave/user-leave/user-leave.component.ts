import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
import { AdminLeaveCalenderComponent } from '../../admin/leave/admin-leave-calender/admin-leave-calender.component';

@Component({
  selector: 'app-user-leave',
  templateUrl: './user-leave.component.html',
  styleUrls: ['./user-leave.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class UserLeaveComponent implements OnInit {

  session: any;
  leaveAdminRegions: any = false;
  calendarMeta: any;
  leaveColors: any;
  monthStartDate: any = moment().startOf('month').subtract(1,'month');
  monthEndDate: any = moment().endOf('month').add(1,'month');
  monthsData: any[] = [];
  status = "ONLINE"; //initializing as online by default
  isConnected = true;
  switchApplyform:boolean = false;

  leaveAdmins: any = [];
  applierDateDiff: any[] = [];
  toggleMode: string = "single";
    pageObj: any = {
    documentId: "",
    yearSelected: '',
    allLeavesOrgHave: [],
    allHolidays: [],
    weeklyOffDays: [],
    session:{
      startMonth: 0,
      endMonth: 11
    },
    apllyingLeave:{
      type: 0,
      startDate: '',
      endDate: '',
      reason: '',
      noOfDays: 0,
      resultDescribe: ""
    }
  }

 //=============my leaves/pending applied status
  private data: any;
  pageTitle: string = "";
  viewMode: any = '';
  selectedRegionCode: any;
  selectedCountry: any ='';
  selectedRegion: any = '';
  private dataSource=[];
  pendingData: any[] = [];
  otherData: any[] = [];

  searchTexts: string=null;
  searchMode: string = 'all';
  showHidePendingLeaves = false;
  leaveAdminView = false;
  detailsData = null;
  constructor(
    private db: AllCollectionsService,
    private cal: CalenderFunctionsService,
    private allMembers:AllMembersDataService,
    private alertMessage:SweetAlertService,
    private spinner:NgxSpinnerService,
    private connectionService: ConnectionService,
    private searchMap:TextSearchService,
    private notification:NotificationService,
  ) {
      this.session = this.allMembers.getCurrLogUserData();
      //this.leaveAdminRegions = this.cal.isUserRegionLeaveAdmin(this.session, false);
   }

  async ngOnInit() {
    //----------------------network check function------------------
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.status = "ONLINE";
      } else {
        this.status = "OFFLINE";
      }
    });
    this.leaveColors = this.cal.leaveColors;
    this.calendarMeta = this.cal.getCalendarMeta();
    this.calendarMeta.isCrossMonthDaysConfigAllowed = true;
    Object.assign(this.calendarMeta,{excludeStatus: [], isUserCalendarRequired: true});
    let year = moment().format('YYYY');
    let month = moment().format('MM');
    // this.getCalendarYearData(month,year);
    this.cal.getCalendarYearData(month, year, {user: this.session}, this.calendarMeta);
    this.getListOfleaves();

    this.calendarMeta.calendarOptions.from = moment().startOf('month').subtract(12,'month');
    Object.assign(this.calendarMeta,{excludeStatus: ['rejected'], isUserCalendarRequired: true});
    this.getLeavAdmins();



    //this.viewMode = this.navParams.get("viewMode") ? this.navParams.get("viewMode") : 'USER';
     this.viewMode = 'USER';
     if(this.status === 'ONLINE') {
      this.spinner.show();
      if(this.viewMode != 'USER' && (this.session.role == "ADMIN" || this.viewMode == 'LEAVEADMIN')){ // when admin comes
        this.pageTitle = "Leave Approval Requests";
        this.getLeaveAdminRegions();
      }else{ // when user comes sees his own views
        this.pageTitle = "My Leaves";
      }
      this.apporveRequestData();
    }else{
      this.alertMessage.poorNetwork();
    }
  }
  async getListOfleaves(){
    if(this.status ==='ONLINE'){
      this.spinner.show();
      this.db.afs.collection(this.db._LEAVES_APPLIED,
        ref=> ref.where("uid","==",this.session.uid)
        .where("subscriberId","==",this.session.subscriberId)
        .where("startDate",">=",new Date(this.monthStartDate))
        .where("startDate","<=",new Date(this.monthEndDate))
        .where("status","in",['PENDING','APPROVED','REJECTED'])
        )
        .snapshotChanges()
        .pipe(map((actions: any[]) => actions.map((a: any) => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          return { id, ...data };
        }))).subscribe((data: any[]) => {
          this.monthsData = data;
          this.cal.extractHolidays(data,
                          'user',
                          'leave',
                          this.calendarMeta,
                          // moment(this.monthStartDate).format('YYYYMM')
                        );
          this.spinner.hide();
        })
    }else{
      this.alertMessage.poorNetwork();
    }
  }
  // don't change method name
  // modify the inner data and to render data in the calender please call the method below
  async monthChanges(e){
    // get the selected month and year
    const month = e.newMonth.months.toString().padStart(2, '0');
    const year = e.newMonth.years;
    this.monthStartDate =  moment(year+month+'01','YYYYMMDD').startOf('month').subtract(1,'month');
    this.monthEndDate = moment(year+month+'01','YYYYMMDD').endOf('month').add(1,'month');
    // console.log("this.calendarMeta",this.calendarMeta);
    // await this.getCalendarYearData(month, year);
    await this.cal.getCalendarYearData(month, year, {user: this.session}, this.calendarMeta,);
    await this.getListOfleaves();

  }

  dateFormatting(date, type){
    return date ? moment(date).format(type) : moment(this.monthStartDate).format(type);
  }
  details(data){
    console.log(data);
    let showData = {
      docId: data.data.id,
      startDate:moment(data.startDate.seconds*1000).format('ll'),
      endDate: moment(data.endDate.seconds*1000).format('ll'),
      appliedAgo: (data.data.status == 'PENDING' && data.data.previousStatus ? 'Re-submitted ': 'Applied ')+
                  (
                    data.data.applied && data.data.applied.seconds ?
                    (
                      moment().diff(data.data.applied.seconds * 1000,'days') > 0 ?
                      (
                        moment().diff(data.data.applied.seconds * 1000,'days')==1 ?
                        moment().diff(data.data.applied.seconds * 1000,'days') + ' day ago'
                        :
                        moment().diff(data.data.applied.seconds * 1000,'days') + ' days ago'
                      )
                      :
                      moment().diff(data.data.applied.seconds * 1000,'hour') + ' hr ago'
                    )
                    :
                    '0 hr ago'
                  ),
      updatedOn: (data.data.status == 'CANCELLED' ? 'Canceled ': data.data.status == 'APPROVED'? 'Approved ' : 'Rejected ')+(
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
      data:{
        id: data.data.id,
        ...data
      }
    };
    let actionType = 'back';
    if(this.session.role == "ADMIN" || this.viewMode == 'LEAVEADMIN'){ // if admin
      if(data.data.uid == this.session.uid && ['PENDING','APPROVED'].includes(data.data.status)){ // if own requests
        actionType = 'cancel';
      }else if(data.data.status=='PENDING'){
        actionType = 'approve';
      }
    }else{ // if not admin
      if(['PENDING','APPROVED'].includes(data.data.status)){
        actionType = 'cancel';
      }
    }

    this.detailsData = {
      data:this.session,
      details:showData,
      actionType: actionType
    };


    let element = document.getElementById("my-leaves"); //leave-details
    element.scrollIntoView({behavior: "smooth"});


  }
detailsAdj(data){
  let id = data.id;
  let dataAdjNew = {
    docId: id,
    startDate:moment(data.startDate.seconds*1000).format('ll'),
    endDate: moment(data.endDate.seconds*1000).format('ll'),
    appliedAgo: (data.status == 'PENDING' && data.previousStatus ? 'Re-submitted ': 'Applied ')+
                (
                  data.applied && data.applied.seconds ?
                  (
                    moment().diff(data.applied.seconds * 1000,'days') > 0 ?
                    (
                      moment().diff(data.applied.seconds * 1000,'days')==1 ?
                      moment().diff(data.applied.seconds * 1000,'days') + ' day ago'
                      :
                      moment().diff(data.applied.seconds * 1000,'days') + ' days ago'
                    )
                    :
                    moment().diff(data.applied.seconds * 1000,'hour') + ' hr ago'
                  )
                  :
                  '0 hr ago'
                ),
    updatedOn: (data.status == 'CANCELLED' ? 'Canceled ': data.status == 'APPROVED'? 'Approved ' : 'Rejected ')+(
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
    data:{
      id: id,
      ...data
    }
  };


    this.showHidePendingLeaves = !this.showHidePendingLeaves ;
    this.leaveAdminView = false;
    this.viewMode = 'USER'
    // let element = document.getElementById("my-leaves"); //leave-details
    // element.scrollIntoView({behavior: "smooth"});
    console.log("dataAdjNew", dataAdjNew);
    this.details(dataAdjNew);
  }

  //=============================== apply leave ====================
    getLeavAdmins(){
    let ur = {country: this.session.countryServe, region: this.session.regionServe};
    return this.db.afs.collection(this.db.users,
      ref=> ref.where("subscriberId","==",this.session.subscriberId)
      .where("leaveAdmin." + ur.country + "_" + ur.region.replace(/[^A-Za-z]/g,''),"==",ur))
      .snapshotChanges()
      .pipe(map((actions: any[]) => actions.map((a: any) => {
        const data = a.payload.doc.data();
        const id = a.payload.doc.id;
        return { id, ...data };
      }))).subscribe((data: any[]) => {
        this.leaveAdmins = data;
        // this.session.user.loader = false;
      })
  }

  changeToggleMode(){
    this.toggleMode = (this.toggleMode == 'range') ? 'single' : 'range';
    this.calendarMeta.calendarOptions.pickMode = this.toggleMode;
    this.pageObj.apllyingLeave.noOfDays = 0;
    this.dayCounter();
    this.cal.renderDataSet(this.calendarMeta);
    // this.renderDataSet();
  }

  // seleting the date between
  // user seleting the dates
  onSelect(event){
    if(this.toggleMode=='single'){
      this.pageObj.apllyingLeave.startDate = new Date(event.time).getTime();
      this.pageObj.apllyingLeave.endDate = new Date(event.time).getTime();
      if(this.checkConflicts()){
        let leaveDate = moment(this.pageObj.apllyingLeave.startDate).format('ll');
        this.alertMessage.showAlert("info","Please note that " + leaveDate + " is not valid, it is either a holiday or you applied leave for the day earlier. Check the date and try again.","Warning");
      }
      this.dayCounter();
    } else {
      // Do nothing
    }
    // this.diffEr()
  }

  onSelectStart(event){
    this.pageObj.apllyingLeave.startDate = new Date(event.time).getTime();
  }

  onSelectEnd(event){
    this.pageObj.apllyingLeave.endDate = new Date(event.time).getTime();
    // The timeout is added here as onSelectStart will be called if end date is less than start date
    setTimeout(()=>{
      if(this.checkConflicts()){
        let leaveStartDate = moment(this.pageObj.apllyingLeave.startDate).format('ll');
        let leaveEndDate = moment(this.pageObj.apllyingLeave.endDate).format('ll');
        this.alertMessage.showAlert("info","Please note that the period, " + leaveStartDate + " to " + leaveEndDate + " you are trying to apply leave is not valid, it either contains other holidays or leaves you applied earlier. Check the dates and try again.","Check the dates and try again");
      }
      this.dayCounter();
    },100);
  }

  checkConflicts(){
    let endDate = this.pageObj.apllyingLeave.endDate ?
                           this.pageObj.apllyingLeave.endDate
                           :
                           this.pageObj.apllyingLeave.startDate;
    let startDate = this.pageObj.apllyingLeave.startDate;
    this.pageObj.apllyingLeave.noOfDays = 0;
    if(this.toggleMode=='single'){
      let result= this.calendarMeta.newObj.filter(h=>h.cssClass!='rejected' && moment(h.date).format('YYYYMMDD') == moment(startDate).format('YYYYMMDD'));

      if(result.length == 0){
        this.pageObj.apllyingLeave.noOfDays = 1;
      }
      return result.length > 0;
    } else {

      let holidays = this.calendarMeta.newObj.filter(h=>h.cssClass!='rejected').map(n=>moment(n.date).format('YYYY-MM-DD'));
      // console.log("holidays inside checkConflicts", holidays);
      let noOfDays = moment(endDate).diff(startDate,'days') + 1;
      startDate = moment(startDate).format("YYYY-MM-DD");
      endDate = moment(endDate).format("YYYY-MM-DD");
      while(startDate <= endDate){
        console.log("Processing weekday", moment(startDate).format('e'),noOfDays)
        if(this.calendarMeta.orgCalendarYear.weeklyOffDays.includes(parseInt(moment(startDate).format('e')))){
          noOfDays--;
        }
        if(holidays.includes(startDate)){
          return true;
        }
        // this.newObj.push({date: new Date(startDate), cssClass: status});
        startDate = moment(startDate).add(1, 'days').format("YYYY-MM-DD");
      }
      this.pageObj.apllyingLeave.noOfDays = noOfDays;
      // end of the while lopp, which means no match found
      return false;
    }

  }

  // returning day count
  dayCounter(){
    // console.log("this.pageObj.apllyingLeave.type",this.pageObj.apllyingLeave.type, this.calendarMeta.userCalendarYear.leaveTypes,this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code]);
    if(this.calendarMeta.allLeavesOrgHave.length >0 && this.pageObj.apllyingLeave){
      let title = this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type];
      let noOfdays = this.pageObj.apllyingLeave.noOfDays;
      this.pageObj.apllyingLeave.resultDescribe = title.type+" for "+noOfdays+ " day"+((noOfdays > 1) ? "s":"");
    }
  }
   searchTextImplementation(){
    let searchStrings = this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].type+" "+
    this.session.name +" "+this.session.email+ " " +
    moment(this.pageObj.apllyingLeave.startDate).format("YYYY") + " "+
    moment(this.pageObj.apllyingLeave.startDate).format("MMMM") + " " +
    moment(this.pageObj.apllyingLeave.startDate).format("MMM") + " " +
    moment(this.pageObj.apllyingLeave.endDate).format("YYYY") + " "+
    moment(this.pageObj.apllyingLeave.endDate).format("MMMM") + " " +
    moment(this.pageObj.apllyingLeave.endDate).format("MMM") + " pending applied";
    return this.searchMap.createSearchMap(searchStrings);
  }

  // submit the form
  applyLeave(){
    // check if there is already a date exits that this user applied
    // check for start date
    if(!this.leaveAdmins || (this.leaveAdmins && this.leaveAdmins.length ==0)){
      this.alertMessage.showAlert("info", "No leave admin defined for you, please contact administrator to assign a leave manager for you","No leave admin defined for you");
    } else if(!this.calendarMeta.userCalendarYear || (this.calendarMeta.userCalendarYear && !this.calendarMeta.userCalendarYear.year)){
      this.alertMessage.showAlert("info","No leave calendar found for the calendar year. Please ask admin to associate your account to <b>"+this.session.regionServe+"</b> of country code: <b>"+this.session.countryServe+"</b> for " +  moment(this.pageObj.apllyingLeave.startDate).format('MMM, YYYY'),"No Leave Calendar");
    } else if(this.calendarMeta.userCalendarYear &&
              (
                parseInt(this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code].allowed)
                -
                (this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code].taken ?
                parseInt(this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code].taken)
                :
                0)
              ) < this.pageObj.apllyingLeave.noOfDays){
      this.alertMessage.showAlert("info","Number of days selected for  " +
                                                this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].type +
                                                " is more than the " +
                                                (
                                                  parseInt(this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code].allowed)
                                                  -
                                                  (this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code].taken ?
                                                  parseInt(this.calendarMeta.userCalendarYear.leaveTypes[this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code].taken)
                                                  :
                                                  0)
                                                )
                                                + " days available for the calendar year. Please check dates and try again.","Check No Of Days");
    } else if(this.pageObj.apllyingLeave.reason && this.pageObj.apllyingLeave.noOfDays > 0){
        this.spinner.show();
        // let res = this.session.user.uid;
        // now submit the form
        let batch = this.db.afs.firestore.batch();

        let docId = this.db.afs.createId();
        let data = {
          subscriberId: this.session.subscriberId,
          uid: this.session.uid,
          startDate:new Date(this.pageObj.apllyingLeave.startDate),
          endDate: new Date(this.pageObj.apllyingLeave.endDate),
          type: this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].type,
          code: this.calendarMeta.allLeavesOrgHave[this.pageObj.apllyingLeave.type].code,
          reason: this.pageObj.apllyingLeave.reason,
          status: "PENDING",
          actionType: 'Applied',
          searchMap: this.searchTextImplementation(),
          country: this.session.countryServe,
          region: this.session.regionServe,
          year: this.calendarMeta.userCalendarYear.year, //this.pageObj.yearSelected,
          daysCount: this.pageObj.apllyingLeave.noOfDays,
          applied: firebase.firestore.FieldValue.serverTimestamp(),
          user:{
            uid: this.session.uid,
            name: this.session.name,
            email: this.session.email,
            picUrl: this.session.picUrl
          },
        };

        // application form
        let applyForm = this.db.afs.collection(this.db._LEAVES_APPLIED).doc(docId).ref;
        batch.set(applyForm,data);

        // notification
        let eventInfo = {
              origin: 'applyleave',
              eventType: 'new',
              session: this.session,
              leaveAdmins: [...this.leaveAdmins],
              data: {
                id: docId,
                subscriberId: this.session.subscriberId,
                ...data
              },
            };
        this.notification.createNotifications(eventInfo);


        batch.commit().then(()=>{
          this.spinner.hide();
          this.pageObj.apllyingLeave.reason = '';
          this.pageObj.apllyingLeave.noOfDays = 0;
          this.alertMessage.showAlert("success","Please note that leave applied successfully.","Leave Applied");
        }).catch(err=>{
          this.spinner.hide();
          this.alertMessage.showAlert("error",err,"Please Try Again");
        });

    } else { // blank fields
      this.alertMessage.showAlert("info","Please select the date and provide notes for the leave application to proceed.","Please Try Again");
    }

  }
//======================= my leaves / applied leaves ==============

   changeSearchMode(){
    this.searchMode = this.searchMode=='all' ? 'any' : 'all';
    if(this.searchTexts){
      this.getDataOfallSearch();
    } else {
      this.apporveRequestData();
    }
  }

  getDataOfallSearch()
  {
    this.spinner.show();
    let searchString = '';
    if(this.searchTexts && this.searchTexts.trim()){
      searchString = this.searchTexts;
      let leaveRef = this.db.afs.collection<any>(this.db._LEAVES_APPLIED,
          ref=>this.searchMap.getSearchMapQuery(
                  this.session.leaveAdmin && this.leaveAdminRegions.length > 0 && this.viewMode=='LEAVEADMIN' ?
                  ref.where("subscriberId","==", this.session.subscriberId)
                  .where("country","==",this.selectedCountry)
                  .where("region","==",this.selectedRegion)
                  :
                  ref.where("subscriberId","==",this.session.subscriberId)
                    .where("uid","==",this.session.uid)
                  ,
                  'searchMap',
                  searchString,
                  this.searchMode ? this.searchMode : 'all')
          );
          // get data from database
          leaveRef.snapshotChanges()
          .pipe(
            map((actions: any[]) => actions.map((a: any) => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              // let meetingTime = moment(data.meetingStart.seconds*1000).format('LT') + " - " + moment(data.meetingEnd.seconds*1000).format('LT');

              return {
                docId: id,
                startDate:moment(data.startDate.seconds*1000).format('ll'),
                endDate: moment(data.endDate.seconds*1000).format('ll'),
                appliedAgo: (data.status == 'PENDING' && data.previousStatus ? 'Re-submitted ': 'Applied ')+
                            (
                              data.applied && data.applied.seconds ?
                              (
                                moment().diff(data.applied.seconds * 1000,'days') > 0 ?
                                (
                                  moment().diff(data.applied.seconds * 1000,'days')==1 ?
                                  moment().diff(data.applied.seconds * 1000,'days') + ' day ago'
                                  :
                                  moment().diff(data.applied.seconds * 1000,'days') + ' days ago'
                                )
                                :
                                moment().diff(data.applied.seconds * 1000,'hour') + ' hr ago'
                              )
                              :
                              '0 hr ago'
                            ),
                updatedOn: (data.status == 'CANCELLED' ? 'Canceled ': data.status == 'APPROVED'? 'Approved ' : 'Rejected ')+(
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
                data:{
                  id: id,
                  ...data
                }
              };
            })))
            .subscribe(data =>{
              this.dataSource = data;
              this.pendingData = data.filter(function(finding) { return finding.data.status == "PENDING"; });
              this.otherData = data.filter(function(finding) { return finding.data.status !== "PENDING"; });
              this.spinner.hide();
            });
          }else {
            this.apporveRequestData();
          }
  }

  getLeaveAdminRegions(){
    // this.cal.isUserRegionValid(this.data);
    this.leaveAdminRegions = this.session.leaveAdmin ?
                             Object.keys(this.session.leaveAdmin)
                             :
                             [];
   if(this.leaveAdminRegions.length==0){
     this.alertMessage.showAlert("info", "Please note that your account is not linked to any valid region as leave admin. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Propagate Region Calendar","No Leave Region",);
   }
   this.selectedRegionCode = this.leaveAdminRegions.length > 0 ? this.leaveAdminRegions[0] : '';
   this.selectedCountry = this.leaveAdminRegions.length > 0 ? this.session.leaveAdmin[this.selectedRegionCode].country : '';
   this.selectedRegion = this.leaveAdminRegions.length > 0 ? this.session.leaveAdmin[this.selectedRegionCode].region : '';
   // console.log("getLeaveAdminRegions",this.leaveAdminRegions.length,this.leaveAdminRegions[0],this.session.leaveAdmin[this.selectedRegionCode],this.selectedCountry,this.selectedRegion,this.session.role, this.viewMode);
  }

  @ViewChild(AdminLeaveCalenderComponent,{static:true}) adminLeaveCalenderComponent: AdminLeaveCalenderComponent
  getSelectedRegion(){
    this.selectedCountry = this.session.leaveAdmin[this.selectedRegionCode].country;
    this.selectedRegion = this.session.leaveAdmin[this.selectedRegionCode].region;
    this.apporveRequestData();
    this.adminLeaveCalenderComponent.pageObj.selectedCountry = this.session.leaveAdmin[this.selectedRegionCode].country;
    this.adminLeaveCalenderComponent.pageObj.selectedRegion = this.session.leaveAdmin[this.selectedRegionCode].region;
    this.adminLeaveCalenderComponent.getMonthsData(null);
  }

  leaveAdminViewToggle(adminView?:boolean){
    if(adminView){
    this.viewMode = 'LEAVEADMIN';
    this.leaveAdminView = !this.leaveAdminView;
    this.getLeaveAdminRegions();
  }
    this.apporveRequestData();
    this.showHidePendingLeaves = !this.showHidePendingLeaves;
  }
  // for admin view
  apporveRequestData(){
    this.spinner.show();
    let leaveRef = null;
    if(this.viewMode == 'LEAVEADMIN' && this.session.role == "ADMIN" && !this.selectedCountry && !this.selectedRegion){
      leaveRef = this.db.afs.collection<any>(this.db._LEAVES_APPLIED, ref=> ref
        .where("subscriberId","==",this.session.subscriberId)
      )
    } else if(this.viewMode == 'LEAVEADMIN' && (this.session.leaveAdmin || this.session.role == "ADMIN")){
      // if the mode is approval view
      leaveRef = this.db.afs.collection<any>(this.db._LEAVES_APPLIED, ref=> ref
        .where("subscriberId","==",this.session.subscriberId)
        .where("country","==",this.selectedCountry)
        .where("region","==",this.selectedRegion)
      )
    } else {
      leaveRef = this.db.afs.collection<any>(this.db._LEAVES_APPLIED, ref=> ref
        .where("subscriberId","==",this.session.subscriberId)
        .where("uid","==",this.session.uid)
      )
    }
    leaveRef
      .snapshotChanges()
      .pipe(
        map((actions: any[]) => actions.map((a: any) => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          // let meetingTime = moment(data.meetingStart.seconds*1000).format('LT') + " - " + moment(data.meetingEnd.seconds*1000).format('LT');

          return {
            docId: id,
            startDate:moment(data.startDate.seconds*1000).format('ll'),
            endDate: moment(data.endDate.seconds*1000).format('ll'),
            appliedAgo: (data.status == 'PENDING' && data.previousStatus ? 'Re-submitted ': 'Applied ')+
                        (
                          data.applied && data.applied.seconds ?
                          (
                            moment().diff(data.applied.seconds * 1000,'days') > 0 ?
                            (
                              moment().diff(data.applied.seconds * 1000,'days')==1 ?
                              moment().diff(data.applied.seconds * 1000,'days') + ' day ago'
                              :
                              moment().diff(data.applied.seconds * 1000,'days') + ' days ago'
                            )
                            :
                            moment().diff(data.applied.seconds * 1000,'hour') + ' hr ago'
                          )
                          :
                          '0 hr ago'
                        ),
            updatedOn: (data.status == 'CANCELLED' ? 'Canceled ': data.status == 'APPROVED'? 'Approved ' : 'Rejected ')+(
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
            data:{
              id: id,
              ...data
            }
          };
        })))
        .subscribe(data =>{
          this.dataSource = data;
          this.pendingData = data.filter(function(finding) { return finding.data.status == "PENDING"; });
          this.otherData = data.filter(function(finding) {
            return this.leaveAdminView == true ? !['CANCELLED','PENDING'].includes(finding.data.status) : finding.data.status !== "PENDING";
            }.bind(this)
          );
          this.spinner.hide();
        });
  }

  toggleCondition(){
    this.showHidePendingLeaves = !this.showHidePendingLeaves;
    this.detailsData = null;
    this.leaveAdminView = this.leaveAdminView ? false:this.leaveAdminView;
    this.viewMode = this.viewMode !== 'USER'? 'USER' : this.viewMode;
    //console.log(this.detailsData);
  }
  returnBack(){
    this.detailsData = null;
  }
}
