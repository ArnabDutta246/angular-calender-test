import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-manage-yearly-calender',
  templateUrl: './manage-yearly-calender.component.html',
  styleUrls: ['./manage-yearly-calender.component.scss']
})
export class ManageYearlyCalenderComponent implements OnInit {
  session: any;
  countryData: any;
  users: any = [];
  leaveAdmins: any = [];
  expenseAdmins: any = [];
  team: any = [];
  propagationRequired: boolean = false;
  showAdminMangers: boolean = false;
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
        Travel: {icon: 'md-plane', type:'Travel', allowed: 0, selectedIcon: 0},
        Hotel: {icon: 'ios-podium', type:'Hotel', allowed: 0, selectedIcon: 1},
        Food: {icon: 'ios-restaurant', type:'Food', allowed: 0, selectedIcon: 2},
        Telephone: {icon: 'md-call', type:'Telephone', allowed: 0, selectedIcon: 3},
        zMiscellaneous: {icon: 'md-infinite', type:'Miscellaneous', allowed: 0, selectedIcon:4},
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
  showLeaveTypes: any = false;
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
                          'md-plane',
                          'ios-podium',
                          'ios-restaurant',
                          'md-infinite',
                          'md-call',
                          'ios-archive',
                          'ios-car',
                          'ios-card',
                          'md-train',
                          'md-trophy',
                          'md-boat',
                          'ios-body',
                          'md-briefcase',
                          'md-cafe',
                          'ios-cash',
                          'ios-color-fill',
                          'md-desktop',
                          'md-film',
                          'md-laptop',
                          'ios-leaf',
                          'md-list-box',
                          'md-print',
                          'md-pricetags',
                          'md-share',
                        ];
  constructor() { }

  ngOnInit() {
        // first add a year previous to the current calendar date
    this.years.push(moment().subtract('years', 1).format("YYYY"));
    for(var i=0;i<10;i++){
      this.years.push(moment().add('years', i).format("YYYY"));
    }
  }

}
