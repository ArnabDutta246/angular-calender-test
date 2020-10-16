import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { ConnectionService } from 'ng-connection-service';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
import { CalendarComponentOptions } from 'src/app/calenders';
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { AllMembersDataService } from 'src/app/shared/all-members-data.service';
import { SweetAlertService } from 'src/app/shared/sweet-alert.service';

@Component({
  selector: 'app-manage-yearly-calender',
  templateUrl: './manage-yearly-calender.component.html',
  styleUrls: ['./manage-yearly-calender.component.scss']
})
export class ManageYearlyCalenderComponent implements OnInit,OnChanges {
  @Input() data: any;

  //@Output() taskUpdateParent = new EventEmitter<any>();
  forCountryData:any;
  allMemberSelectObject:any;
  session: any;
  countryData: any;
  users: any = [];
  leaveAdmins: any = [];
  expenseAdmins: any = [];
  team: any = [];
  propagationRequired: boolean = false;
  showAdminMangers: boolean =false;
  showExpenseMangers: boolean = false;
  showTeam: boolean = false;
  newObj: any =[];
  calendarMonths:  any = 'Jan to Dec';
  regionleaveTypes: any =[];
  regionexpenseTypes: any =[];
  pageObj: any = {
    documentId: '',
    yearSelected: moment().format("YYYY"),
    selectedMonthRage: new Date().getMonth(),
    generalHoliday: [],
    holidayList : {},
    newleaveTypes: { code: '',type: '', allowed: 0},
    newexpenseTypes: { code: '',type: '', allowed: 0, icon: '', selectedIcon: null},
    expenseTypes: {
        Travel: {icon: 'fas fa-plane', type:'Travel', allowed: 0, selectedIcon: 0},
        Hotel: {icon: 'fas fa-hotel', type:'Hotel', allowed: 0, selectedIcon: 1},
        Food: {icon: 'fas fa-utensils', type:'Food', allowed: 0, selectedIcon: 2},
        Telephone: {icon: 'fas fa-phone-alt', type:'Telephone', allowed: 0, selectedIcon: 3},
        zMiscellaneous: {icon: 'fas fa-infinity', type:'Miscellaneous', allowed: 0, selectedIcon:4},
      },
    leaveTypes: {
        CasualLeave: {type:'Casual leave', allowed: 0},
        SickLeave: {type: 'Sick Leave',allowed: 0},
        AnnualLeave: {type: 'Annual Leave',allowed: 0},
      },
    session:{
      calendarStartMonth: 1,
      calendarEndMonth: 12
    }
  }
  lastSelectedDate_before_toggle:any;
  toggleMode: string = "single";
  showLeaveTypes: any =false;
  showExpenseTypes: any = false;
  public years=[];
  public months=[
    {content:"Jan to Dec",month:1, startMonth: 1, endMonth: 12},
    {content:"Fab to Jan",month:2, startMonth: 2, endMonth: 1},
    {content:"Mar to Feb",month:3, startMonth: 3, endMonth: 2},
    {content:"Apr to Mar",month:4, startMonth: 4, endMonth: 3},
    {content:"May to apr",month:5, startMonth: 5, endMonth: 4},
    {content:"Jun to May",month:6, startMonth: 6, endMonth: 5},
    {content:"Jul to Jun",month:7, startMonth: 7, endMonth: 6},
    {content:"Aug to Jul",month:8, startMonth: 8, endMonth: 7},
    {content:"Sep to Aug",month:9, startMonth: 9, endMonth: 8},
    {content:"Oct to Sep",month:10, startMonth: 10, endMonth: 9},
    {content:"Nov to Oct",month:11, startMonth: 11, endMonth: 10},
    {content:"Dec to Nov",month:12, startMonth: 12, endMonth: 11}
  ];

  private expenseIcons = [
                          'fas fa-box-open',
                          'fas fa-car',
                          'fas fa-credit-card',
                          'fas fa-train',
                          'fas fa-trophy',
                          'fas fa-ship',
                          'fas fa-child',
                          'fas fa-suitcase',
                          'fas fa-mug-hot',
                          'fas fa-camera-retro',
                          'fas fa-desktop',
                          'fas fa-film',
                          'fas fa-laptop',
                          'fab fa-envira',
                          'far fa-sticky-note',
                          'fas fa-print',
                          'fas fa-tags',
                          'fas fa-share',
                        ];


  holiday_desc:any;
  single_or_range_date:any;
  type: 'string'; // 'string' | 'js-date' | 'moment' | 'time' | 'object'
  optionsRange: CalendarComponentOptions = {
    pickMode: 'range',
    weekStart: 1,
    from: new Date("2019-01-01"),
    disableWeeks: [0, 6],
  };
  optionsSingle: CalendarComponentOptions = {
    pickMode: 'single',
    weekStart: 1,
    from: new Date("2019-01-01"),
    disableWeeks: [0, 6],
  };
  singleDaysEvents: boolean = false;

  // =================== calender functions =================
    options: any = {
    pickMode: "range",
    weekStart: 1,
    from: new Date("2019-01-01"),
    disableWeeks: [0, 6],
    daysConfig: [
      { date: new Date("2020-09-01"), cssClass: "attendance" },
      { date: new Date("2020-09-02"), cssClass: "attendance" },
      { date: new Date("2020-09-03"), cssClass: "attendance" },
      { date: new Date("2020-09-04"), cssClass: "attendance" },
      { date: new Date("2020-09-16"), cssClass: "approvedDate" },
      { date: new Date("2020-09-17"), cssClass: "approvedDate" },
      { date: new Date("2020-09-24"), cssClass: "pendingDate" },
      { date: new Date("2020-09-25"), cssClass: "holiday" },
    ],
  };


  constructor(
    private allMemberDataService: AllMembersDataService,
    private connectionService: ConnectionService,
    private alertMessage: SweetAlertService,
    private allCol: AllCollectionsService,
    private spinner: NgxSpinnerService
  ) {
    this.session = this.allMemberDataService.getCurrLogUserData();
    this.allMemberDataService.fetchAllMember(this.session.subscriberId).subscribe((arr) => {  this.users = arr});
    console.log(this.users);
    this.regionleaveTypes = Object.keys(this.pageObj.leaveTypes).sort();
    this.regionexpenseTypes = Object.keys(this.pageObj.expenseTypes).sort();
    let usedIcons = this.regionexpenseTypes.map(e=>this.pageObj.expenseTypes[e].icon);
    this.expenseIcons = this.expenseIcons.filter(i=>!usedIcons.includes(i));
   }

  ngOnInit() {

    // first add a year previous to the current calendar date
    this.years.push(moment().subtract('years', 1).format("YYYY"));
    for(var i=0;i<10;i++){
      this.years.push(moment().add('years', i).format("YYYY"));
    }
  }
  ngOnChanges(){
    this.forCountryData = null;
    if(this.data !== null){
     this.forCountryData = this.data;
     this.getHolidayCalendar();
    this.getTeam();
    this.getLeaveAdmin();
    this.getExpenseAdmin();
    } 

  
  }
  getHolidayCalendar(){
    this.pageObj.documentId = this.session.subscriberId+
                              "_"+this.forCountryData.countryData.countryCode+
                              "_"+this.forCountryData.countryData.region.replace(/[^A-Za-z]/g,'').toUpperCase()+
                              "_"+this.pageObj.yearSelected;
    if(navigator.onLine){
      this.spinner.show();
      let cotage = this.allCol.afs.collection(this.allCol._LEAVE_CALENDER).doc(this.pageObj.documentId).snapshotChanges();
      cotage.pipe(
        map(a => {
          return a.payload.data();
        })).subscribe((data: any)=>{
          this.spinner.hide();
          if(data){
            this.pageObj.generalHoliday = data.weeklyOffDays;
            this.pageObj.holidayList = data.holidays;
            this.pageObj.leaveTypes = data.leaveTypes;
            this.pageObj.expenseTypes = data.expenseTypes ? data.expenseTypes : {};
            this.pageObj.session.calendarStartMonth = data.calendarStartMonth;
            this.pageObj.session.calendarEndMonth = data.calendarEndMonth;
            this.calendarMonths = this.months[data.calendarStartMonth-1].content;
            this.regionleaveTypes = Object.keys(this.pageObj.leaveTypes).sort();
            this.regionexpenseTypes = Object.keys(this.pageObj.expenseTypes).sort();
            let usedIcons = this.regionexpenseTypes.map(e=>this.pageObj.expenseTypes[e].icon);
            this.expenseIcons = this.expenseIcons.filter(i=>!usedIcons.includes(i));
            this.extratHolidays();
          }else{
            this.createDocumentOnThisRegion();
          }
      });
    }else{
      this.alertMessage.poorNetwork();
    }
  }
  createDocumentOnThisRegion(){
    if(navigator.onLine){
      let expenseTypes = {};
      let leaveTypes = {};
      this.pageObj.expenseTypes &&
      Object.keys(this.pageObj.expenseTypes).forEach(et=>{
          Object.assign(expenseTypes,{[et]:{...this.pageObj.expenseTypes[et],spent:0}});
          delete expenseTypes[et].spent;
        });
      this.pageObj.leaveTypes &&
      Object.keys(this.pageObj.leaveTypes).forEach(lt=>{
          Object.assign(leaveTypes,{[lt]:{...this.pageObj.leaveTypes[lt],taken:0}});
          delete leaveTypes[lt].taken;
        });
      this.allCol.addDataInSpecificId(this.allCol._LEAVE_CALENDER, this.pageObj.documentId,{
        subscriberId: this.session.subscriberId,
        year: this.pageObj.yearSelected,
        calendarStartMonth: this.pageObj.session.calendarStartMonth ? this.pageObj.session.calendarStartMonth : 1,
        calendarEndMonth: this.pageObj.session.calendarEndMonth ? this.pageObj.session.calendarEndMonth : 12,
        country: this.forCountryData.countryData.countryCode,
        region: this.forCountryData.countryData.region,
        weeklyOffDays: this.pageObj.generalHoliday,
        holidays: {},
        noOfUsers: 0,
        expenseTypes: this.pageObj.expenseTypes ?
                    expenseTypes
                    :
                    {
                        Travel: {icon: 'md-plane', type:'Travel', allowed: 0, selectedIcon: 0},
                        Hotel: {icon: 'ios-podium', type:'Hotel', allowed: 0, selectedIcon: 1},
                        Food: {icon: 'ios-restaurant', type:'Food', allowed: 0, selectedIcon: 2},
                        Telephone: {icon: 'md-call', type:'Telephone', allowed: 0, selectedIcon: 3},
                        zMiscellaneous: {icon: 'md-infinite', type:'Miscellaneous', allowed: 0, selectedIcon:4},
                      },
        leaveTypes: this.pageObj.leaveTypes ?
                    leaveTypes
                    :
                    {
                        CasualLeave: {type:'Casual leave', allowed: 0},
                        SickLeave: {type: 'Sick Leave',allowed: 0},
                        AnnualLeave: {type: 'Annual Leave',allowed: 0},
                      }
      });
      this.pageObj.session.calendarStartMonth = this.pageObj.session.calendarStartMonth ? this.pageObj.session.calendarStartMonth : 1;
      this.pageObj.session.calendarEndMonth = this.pageObj.session.calendarEndMonth ? this.pageObj.session.calendarEndMonth : 12;
      this.calendarMonths = this.months[0].content;
      this.regionleaveTypes = Object.keys(this.pageObj.leaveTypes).sort();
      this.regionexpenseTypes = Object.keys(this.pageObj.expenseTypes).sort();
      let usedIcons = this.regionexpenseTypes.map(e=>this.pageObj.expenseTypes[e].icon);
      this.expenseIcons = this.expenseIcons.filter(i=>!usedIcons.includes(i));
      let newTeam = this.team.map(m=>{return {...m, checked:true, presentStatus: null}})
      //this.propagateLeaveforUser(newTeam,null,false);
    }else{
       this.alertMessage.poorNetwork();
    }
  }
  // view mentioned holiday list
  // given year
  giveMentionYearHoliday(){
    let h = this.pageObj.holidayList;
    return Object.keys(this.pageObj.holidayList).sort((a,b)=>h[a].startDate.seconds-h[b].startDate.seconds);
  }
  // set calendar session
  calendarMonth(e){
    if(navigator.onLine){
      let data = this.months[e];
      this.spinner.show();
      this.allCol.updateData(this.allCol._LEAVE_CALENDER, this.pageObj.documentId,{
        calendarEndMonth: data.endMonth,
        calendarStartMonth: data.startMonth,
      }).then(()=>{
        this.calendarMonths = this.months[e].content;
        this.spinner.hide();
      }).catch(()=>{
        this.spinner.hide();
      })
    }else{
      this.alertMessage.poorNetwork();
    }
  }

  onSelectIcon(index){
    this.pageObj.newexpenseTypes.selectedIcon=index;
    this.pageObj.newexpenseTypes.icon=this.expenseIcons[index];
  }
  leavetypeSave(){
    this.leavetypeAdd('save');
  }

  //add new leave type
  leavetypeAdd(mode: any = 'add'){
    let {type, allowed} = this.pageObj.newleaveTypes;
    if(type || mode=='save'){
      let leaveTypes = mode=='add' ?
            {
              ...this.pageObj.leaveTypes,
              [type.replace(/[^A-Za-z]/g,'')] : {type, allowed},
            }
            :
            {
              ...this.pageObj.leaveTypes,
            };
      this.allCol.updateData(this.allCol._LEAVE_CALENDER, this.pageObj.documentId,{
        leaveTypes: leaveTypes,
      }).then(()=>{
        this.pageObj.newleaveTypes.type='';
        this.pageObj.newleaveTypes.allowed=0;
        let msg = mode == 'add' ?
                  "Leave type added successfully."
                  :
                  "Leave types saved successfully."
        this.alertMessage.showAlert("success", msg,"Added Successfully");
        this.propagationRequired = true;
        this.spinner.hide();
      }).catch(err=>{
        this.spinner.hide();
      })
    } else {
      this.alertMessage.showAlert("Warning", "Leave type description is required to add new leave type. Please check and try again","Please try again");
    }
  }

  expensetypeSave(){
    this.expensetypeAdd('save');
  }

    //add new expense type
  expensetypeAdd(mode: any = 'add'){
    let {type, allowed, icon, selectedIcon} = this.pageObj.newexpenseTypes;
    if(type || mode=='save'){
      let expenseTypes = mode=='add' ?
            {
              ...this.pageObj.expenseTypes,
              [type.replace(/[^A-Za-z]/g,'')] : {type, allowed, icon, selectedIcon},
            }
            :
            {
              ...this.pageObj.expenseTypes,
            };
      this.allCol.updateData(this.allCol._LEAVE_CALENDER, this.pageObj.documentId,{
        expenseTypes: expenseTypes,
      }).then(()=>{
        this.pageObj.newexpenseTypes.type='';
        this.pageObj.newexpenseTypes.allowed=0;
        this.pageObj.newexpenseTypes.icon='';
        this.pageObj.newexpenseTypes.selectedIcon=null;
        let msg = mode == 'add' ?
                  "Expense type added successfully."
                  :
                  "Expense types saved successfully."
        this.alertMessage.showAlert("success", msg,"Added");
        this.propagationRequired = true;
        this.spinner.hide();
      }).catch(()=>{
         this.spinner.hide();
      })
    } else {
      this.alertMessage.showAlert("info", "Expense type description is required to add new expense type. Please check and try again","Please try again");
    }
  }

    // extract holidays for calendar daysConfig
  // extract the all applied leaves
  extratHolidays(){
    this.newObj = [];
    let holidays = this.pageObj.holidayList;
    Object.keys(holidays).forEach(h=>{
      let style = 'holiday';
      let startDate = moment(holidays[h].startDate.seconds*1000);
      let endDate = moment(holidays[h].endDate.seconds*1000);
      if(startDate==endDate){
        this.newObj.push({date: new Date(moment(startDate).format("YYYY-MM-DD")), cssClass: style});
      } else {

        while(startDate <= endDate){
          this.newObj.push({date: new Date(moment(startDate).format("YYYY-MM-DD")), cssClass: style});
          startDate = moment(startDate).add(1, 'days');
        }
      }

    });
    this.renderDataSet();
  //this.monthChanges({newMonth: {months: parseInt(moment().format("MM")), years: parseInt(moment().format("YYYY"))}});
  }

  getLeaveAdmin(){
    // console.log(this.users);
    let {region, countryCode} = this.forCountryData.countryData;
    this.leaveAdmins = this.users.filter(u=>u.leaveAdmin && Object.keys(u.leaveAdmin).includes(countryCode+"_"+region.replace(/[^A-Za-z]/g,'')));
  }

  getExpenseAdmin(){
    let {region, countryCode} = this.forCountryData.countryData;
    this.expenseAdmins = this.users.filter(u=>u.expenseAdmin && Object.keys(u.expenseAdmin).includes(countryCode+"_"+region.replace(/[^A-Za-z]/g,'')));
  }

  getTeam(){
    let {region, countryCode} = this.forCountryData.countryData;
    this.team = this.users.filter(u=>u.countryServe && u.regionServe && u.countryServe == countryCode && u.regionServe == region);
  }
  setAllMemberSelectObject(eventType:string,heading:string){
    this.allMemberSelectObject = {
      nav: this.session,
      countryData: this.data,
      eventType:eventType,
      heading:heading
     //eventType: 'propagateExpenseAdmin',
    }
  }
  //================= define expense admin===========
  defineExpenseAdmin(recipientList: any =[])
  {
    let batch = this.allCol.afs.firestore.batch();
    this.spinner.show();
    let adminregion = {};
    let regionCode = this.forCountryData.countryData.countryCode + "_" + this.forCountryData.countryData.region.replace(/[^A-Za-z]/g,'');
    adminregion[regionCode] = {country: this.forCountryData.countryData.countryCode, region: this.forCountryData.countryData.region};
    this.expenseAdmins = recipientList.filter(r=>r.checked);

    for (let data of recipientList)
    {
      if( data.checked && data.presentStatus != 'EXISTING'){
        if(data.expenseAdmin){
          Object.assign(data.expenseAdmin,adminregion);
        } else {
          Object.assign(data,{expenseAdmin: adminregion});
        }
      } else if (!data.checked && data.presentStatus == 'EXISTING'){
        delete data.expenseAdmin[regionCode];
      }

      if(
        ( data.checked && data.presentStatus != 'EXISTING') ||
        (!data.checked && data.presentStatus == 'EXISTING')
       ){

        let userDoc = data.uid + "_" + this.session.subscriberId;
        let userDocRef = this.allCol.afs.collection(this.allCol.users).doc(userDoc).ref;
        batch.set(userDocRef,{expenseAdmin: data.expenseAdmin}, {merge: true});
      }
    }

    batch.commit().then(()=>{
      this.spinner.hide();
    }).catch(err=>{
      this.spinner.hide();
      this.alertMessage.showAlert('error',err,'Please Try Again');
    });
    // Logic to send broadcust message for notifications
    // we can even provide option to share this using email for external users
    // Loop through the selected members and
    this.alertMessage.showAlert("success","Expense admin for the region " + this.forCountryData.countryData.countryCode +
    " - " + this.forCountryData.countryData.region +
    " updated successfully.","Rgeion Expense Admin",);
  } 

  //========================= define leave admin=========
  defineLeaveAdmin(recipientList: any =[])
  {
    let batch = this.allCol.afs.firestore.batch();
    this.spinner.show();
    let adminregion = {};
    let regionCode = this.forCountryData.countryData.countryCode + "_" + this.forCountryData.countryData.region.replace(/[^A-Za-z]/g,'');
    adminregion[regionCode] = {country: this.forCountryData.countryData.countryCode, region: this.forCountryData.countryData.region};
    this.leaveAdmins = recipientList.filter(r=>r.checked);
    for (let data of recipientList)
    {
      if( data.checked && data.presentStatus != 'EXISTING'){
        if(data.leaveAdmin){
          Object.assign(data.leaveAdmin,adminregion);
        } else {
          Object.assign(data,{leaveAdmin: adminregion});
        }
      } else if (!data.checked && data.presentStatus == 'EXISTING'){
        delete data.leaveAdmin[regionCode];
      }

      if(
        ( data.checked && data.presentStatus != 'EXISTING') ||
        (!data.checked && data.presentStatus == 'EXISTING')
       ){
           let userDoc = data.uid + "_" + this.session.subscriberId;
           let userDocRef = this.allCol.afs.collection(this.allCol.users).doc(userDoc).ref;
           batch.set(userDocRef,{leaveAdmin: data.leaveAdmin}, {merge: true});
       }

    }

    batch.commit().then(()=>{
      this.spinner.hide();
    }).catch(err=>{
      this.spinner.hide();
      this.alertMessage.showAlert("error",err,"Please Try Again");
    });
    // Logic to send broadcust message for notifications
    // we can even provide option to share this using email for external users
    // Loop through the selected members and
    this.alertMessage.showAlert("success","Leave admin for the region " + this.forCountryData.countryData.countryCode +
    " - " + this.forCountryData.countryData.region +
    " updated successfully.","Rgeion Leave Admin");
  }

propagateLeaveforUser(recipientList: any =[],broadcastMsg: any='', showAlert: boolean = true)
  {
    let batch = this.allCol.afs.firestore.batch();
    this.spinner.show();
    this.team = recipientList.filter(r=>r.checked);

    let expenseTypes = {};
    let leaveTypes = {};
    this.pageObj.expenseTypes &&
    Object.keys(this.pageObj.expenseTypes).forEach(et=>{
        Object.assign(expenseTypes,{[et]:{...this.pageObj.expenseTypes[et],spent:0}});
        delete expenseTypes[et].spent;
      });
    this.pageObj.leaveTypes &&
    Object.keys(this.pageObj.leaveTypes).forEach(lt=>{
        Object.assign(leaveTypes,{[lt]:{...this.pageObj.leaveTypes[lt],taken:0}});
        delete leaveTypes[lt].taken;
      });

    for (let data of recipientList)
    {
      if(data.checked && (data.presentStatus != 'EXISTING' || this.propagationRequired)){
        let leaveCalendarObj=
        {
          subscriberId: this.session.subscriberId,
          year: this.pageObj.yearSelected,
          uid: data.uid,
          user:{
                  name: data.name,
                  email: data.email,
                  picUrl: data.picUrl,
                  uid: data.uid,
                },
          calendarStartMonth: this.pageObj.session.calendarStartMonth,
          calendarEndMonth: this.pageObj.session.calendarEndMonth,
          country: this.forCountryData.countryData.countryCode,
          region: this.forCountryData.countryData.region,
          weeklyOffDays: this.pageObj.generalHoliday,
          leaveTypes: leaveTypes,
          expenseTypes: expenseTypes,
        };
        let leaveDocId = data.uid + this.session.subscriberId + this.forCountryData.countryData.countryCode + this.forCountryData.countryData.region.replace(/[^A-Za-z]/g,'').toUpperCase() + this.pageObj.yearSelected;
        let userLeaveDoc = this.allCol.afs.collection(this.allCol._USER_LEAVE_CALENDAR).doc(leaveDocId).ref;
        batch.set(userLeaveDoc,leaveCalendarObj,{merge: true});
        let userDoc = data.uid + "_" + this.session.subscriberId;
        let userDocRef = this.allCol.afs.collection(this.allCol.users).doc(userDoc).ref;
        batch.set(userDocRef,{countryServe: this.forCountryData.countryData.countryCode, regionServe: this.forCountryData.countryData.region,}, {merge: true});
      } else if(!data.checked && data.presentStatus=='EXISTING'){
        let userDocDel = data.uid + "_" + this.session.subscriberId;
        let userDocRefDel = this.allCol.afs.collection(this.allCol.users).doc(userDocDel).ref;
        batch.set(userDocRefDel,{countryServe: null, regionServe: null,}, {merge: true});
      }


    }
    // No of people for the region to be updated as well
    let regLeaveDocref = this.allCol.afs.collection(this.allCol._LEAVE_CALENDER).doc(this.pageObj.documentId).ref;
    batch.set(regLeaveDocref,{noOfUsers: recipientList.filter(r=>r.checked).length},{merge: true});

    batch.commit().then(()=>{
      this.propagationRequired = false;
      this.spinner.hide();
    }).catch(err=>{
  this.spinner.hide();
      this.alertMessage.showAlert("error",err,"Please Try Again");
    });
    if(showAlert){
      this.alertMessage.showAlert("success","Region and related leave calendar applied successfully for the selected users.","User Rgeion");
    }
  }
    //-----------------------caching image----------------------
  profileImgErrorHandler(user: any) {
    console.log("profile image", user);
    user.picUrl = "../../../../assets/image/imgs/profile.png";
  }


  onChange($event) {
    console.log($event);
  }
  onSelect($event) {
    console.log("onSelect", $event);
    this.singleDaysEvents = true;
  }
  onSelectStart($event) {
    console.log("onSelectStart", $event);
  }
  onSelectEnd($event) {
    console.log("onSelectEnd", $event);
  }
  onMonthChange($event) {
    console.log("onMonthChange", $event);
  }

  getArmDates(e, day){
    if(this.session.role == 'ADMIN' || this.session.leaveAdmin){
      if(e.target.checked){
        if(this.pageObj.generalHoliday.length >= 1){ // two or more weekly holiday already exsts
          this.alertMessage.confirmAlert("Are you sure you want "+(this.pageObj.generalHoliday.length + 1)+" weekly holidays? It could effect on previous day counts.","Confirmation").then(()=>{
            this.pageObj.generalHoliday.push(day);
            this.updateWeekends();
          }).catch(()=>{
            e.target.checked = false;
          });
        }else{
          this.pageObj.generalHoliday.push(day);
          this.updateWeekends();
        }
      }else{
        var index = this.pageObj.generalHoliday.indexOf(day);
        if(this.pageObj.generalHoliday.length == 1){ // last holiday left
          this.alertMessage.confirmAlert("Are you sure you do not want any weekly holidays in this region?","Confirmation").then(res =>{
            if(index !== -1){ // exists
              this.pageObj.generalHoliday.splice(index, 1);
              this.updateWeekends();
            }
          }).catch(() =>{ // confirmation failed
            e.target.checked = true;
          });
        }else{ // few more exists
          if(index !== -1){ // exists
            this.pageObj.generalHoliday.splice(index, 1);
            this.updateWeekends();
          }
        }
      }
    } else {
      this.alertMessage.showAlert("Info", "Please note that only leave admin can set the weekly holidays, liase with the leave admin to define weekly holidays for the region","Please note this");
      e.target.checked=!e.target.checked;
    }
  }
    // update weekends in database
  updateWeekends(){
    this.spinner.show();
    // start updating new holiday
    // batch process for future reference
    // somthing need to update/set/delete can be place here
    let batch = this.allCol.afs.firestore.batch();

    let newGenHoliday = this.allCol.afs.collection(this.allCol._LEAVE_CALENDER).doc(this.pageObj.documentId).ref;
    batch.update(newGenHoliday,{
      weeklyOffDays: this.pageObj.generalHoliday
    });
    batch.commit().then(res=>{
      this.spinner.hide();
    }).catch(err=>{
      this.spinner.hide();
    })
  }

  //======================= holiday =======================
  
  holiday_add(){

    if(this.holiday_desc){
      if(!this.single_or_range_date){
        this.alertMessage.showAlert("info","Please select a date or range of dates to add holiday to the calendar.","Please select a date");
      } else if(this.toggleMode=='single'){
        let hd = moment(this.single_or_range_date._d).format('DD-MMM-YYYY');
        // check if the holiday list already exists
        if(Object.keys(this.pageObj.holidayList).includes(hd)){
          this.alertMessage.showAlert("info","The selected date has already added to the list of holidays. Please check and try again.","Please check and try again.");
        } else {
          this.alertMessage.confirmAlert("Are you sure you want to add <b>"+ hd + "</b> as a holiday?","Confirmation",)
          .then(()=>{
            this.pageObj.holidayList[hd]={startDate: new Date(hd), endDate: new Date(hd),desc:this.holiday_desc};
            this.holiday_desc="";
            this.updateDataOfHolidays();
          }).catch(()=>{ this.holiday_desc=""; });
        }

      }else{
        let hdStart = moment(this.single_or_range_date.from._d).format('DD-MMM-YYYY');
        let hdEnd = moment(this.single_or_range_date.to._d).format('DD-MMM-YYYY');
        if(Object.keys(this.pageObj.holidayList).includes(hdStart+'_'+hdEnd)){
          this.alertMessage.showAlert("info","The selected date has already added to the list of holidays. Please check and try again.","Please check and try again");
        } else if (this.isRangeConflict(hdStart,hdEnd)){
          this.alertMessage.showAlert("info","There are other holidays defined between the selected dates <b>"+ hdStart+"</b> to <b>"+hdEnd+"</b>. Please check and try again.","Please check and try again");
        } else {
          this.alertMessage.confirmAlert("Are you sure you want to add <b>"+ hdStart+"</b> to <b>"+hdEnd+"</b> as holidays?","Confirmation")
          .then(res=>{
            this.pageObj.holidayList[hdStart+'_'+hdEnd]={startDate: new Date(hdStart), endDate: new Date(hdEnd),desc:this.holiday_desc};
            this.holiday_desc="";
            this.updateDataOfHolidays();
            this.holiday_desc="";
          }).catch(err=>{this.holiday_desc="";});
        }
      }
    }else{
      this.alertMessage.showAlert("error","Please enter the holiday description.","Error");
    }
  }

  // check date range validity
  isRangeConflict(hdStart: any,hdEnd: any){

    let idx = Object.keys(this.pageObj.holidayList)
              .findIndex(k=>{
                // console.log(moment(hdStart,'DD-MMM-YYYY') , moment(this.pageObj.holidayList[k].endDate,'DD-MMM-YYYY'));
                // console.log(moment(this.pageObj.holidayList[k].startDate,'DD-MMM-YYYY') , moment(hdEnd,'DD-MMM-YYYY'));
                let khlend = this.pageObj.holidayList[k].endDate.seconds ?
                          moment(this.pageObj.holidayList[k].endDate.seconds * 1000)
                          :
                          this.pageObj.holidayList[k].endDate;
                let khlstart = this.pageObj.holidayList[k].startDate.seconds ?
                          moment(this.pageObj.holidayList[k].startDate.seconds * 1000)
                          :
                          this.pageObj.holidayList[k].startDate;
                return !(moment(hdStart,'DD-MMM-YYYY') > khlend ||
                         khlstart > moment(hdEnd,'DD-MMM-YYYY') );
              })
    return (idx!=-1);
  }
  // update holiday in selected year
  updateDataOfHolidays(){
    if(navigator.onLine){
      this.session.user.loader = true;
      this.allCol.updateData(this.allCol._LEAVE_CALENDER, this.pageObj.documentId,{
        holidays: this.pageObj.holidayList
      }).then(()=>{
        this.session.user.loader = false;
      }).catch(()=>{
        this.session.user.loader = false;
        this.alertMessage.showAlert("error","Failed to update new holidays","Failed");
      })
    }else{
      this.alertMessage.poorNetwork();
    }
  }
  toggleCalender(){

    switch (this.toggleMode) {
      case 'single':
        this.options.pickMode = "range"
        this.toggleMode = "range";
            alert(this.options.pickMode+"...."+this.toggleMode);
        break;
      case 'range':
        this.options.pickMode = "single"
        this.toggleMode = "single";
        alert(this.options.pickMode+"...."+this.toggleMode);
        break;
    
      default:
        break;
    }
  }
    // render whole data in the array
  // only use this and send parameters
  renderDataSet(){
    setTimeout(()=>{
      const newOptions = { daysConfig: [...this.newObj]};
      this.optionsRange = { ...this.optionsRange,...newOptions};
      this.optionsSingle = {...this.optionsSingle,...newOptions};
    }, 100);
  }
  // convertDate to dd-mmm-yyyy
  dateConvert(day){
    return day ? moment(day.seconds*1000).format('ll') : moment().format('ll');
  }
}
