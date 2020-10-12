import { Component, Input, OnChanges, OnInit } from '@angular/core';
import * as moment from 'moment';
import { ConnectionService } from 'ng-connection-service';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
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
    {content:"fas Fab to Jan",month:2, startMonth: 2, endMonth: 1},
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
  constructor(
    private allMemberDataService: AllMembersDataService,
    private connectionService: ConnectionService,
    private alertMessage: SweetAlertService,
    private allCol: AllCollectionsService,
    private spinner: NgxSpinnerService
  ) {
    this.session = this.allMemberDataService.getCurrLogUserData();
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
    if(this.data !== null) this.forCountryData = this.data;
  }
  getHolidayCalendar(){
    this.pageObj.documentId = this.session.admin.subscriberId+
                              "_"+this.countryData.countryCode+
                              "_"+this.countryData.region.replace(/[^A-Za-z]/g,'').toUpperCase()+
                              "_"+this.pageObj.yearSelected;
    if(navigator.onLine){
      this.session.user.loader = true;
      let cotage = this.allCol.afs.collection(this.allCol._LEAVE_CALENDER).doc(this.pageObj.documentId).snapshotChanges();
      cotage.pipe(
        map(a => {
          return a.payload.data();
        })).subscribe((data: any)=>{
          this.session.user.loader = false;
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
            //this.extratHolidays();
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
        subscriberId: this.session.admin.subscriberId,
        year: this.pageObj.yearSelected,
        calendarStartMonth: this.pageObj.session.calendarStartMonth ? this.pageObj.session.calendarStartMonth : 1,
        calendarEndMonth: this.pageObj.session.calendarEndMonth ? this.pageObj.session.calendarEndMonth : 12,
        country: this.countryData.countryCode,
        region: this.countryData.region,
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


  onSelectIcon(index){
    this.pageObj.newexpenseTypes.selectedIcon=index;
    this.pageObj.newexpenseTypes.icon=this.expenseIcons[index];
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
        this.alertMessage.showAlert("info", msg,"Added");
        this.propagationRequired = true;
        this.spinner.hide();
      }).catch(()=>{
         this.spinner.hide();
      })
    } else {
      this.alertMessage.showAlert("info", "Expense type description is required to add new expense type. Please check and try again","Please try again");
    }
  }
}
