import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import * as moment from 'moment';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { AllMembersDataService } from 'src/app/shared/all-members-data.service';
import { CalenderFunctionsService } from 'src/app/shared/calender-functions.service';
import { SweetAlertService } from 'src/app/shared/sweet-alert.service';

@Component({
  selector: 'app-admin-leave-calender',
  templateUrl: './admin-leave-calender.component.html',
  styleUrls: ['./admin-leave-calender.component.scss'],
  encapsulation:ViewEncapsulation.None,
})
export class AdminLeaveCalenderComponent implements OnInit {

  calendarMeta: any;
  session: any;
  leaveGraph:any =[];
  maxValue:any = 1;
  pageObj: any = {
    availableRegions: [],
    selectedDate: new Date(),
    monthSelected: null,
    selectedRegion: '',
    selectedCountry: '',
    dataOfThisMonth: {},
    allMonthsdata: [],
    graphViewMode: 'daily',
    yearMonthArr: [],
    graphViewArray: {
      currentMonth: parseInt(moment().format("MM")),
      currentYear: parseInt(moment().format("MM")),
      data: []
    }
  }
  constructor(
    private allMembers:AllMembersDataService,
    private alertMessage: SweetAlertService,
    private db: AllCollectionsService,
    private cal: CalenderFunctionsService,
    private spinner:NgxSpinnerService
  ) { 
      this.session = this.allMembers.getCurrLogUserData();;
      this.calendarMeta = this.cal.getCalendarMeta();
      this.calendarMeta.calendarOptions.disableWeeks = [];
      Object.assign(this.calendarMeta,{excludeStatus: [], isUserCalendarRequired: false});
  }

  ngOnInit() {
      if(this.session.leaveAdmin){
      this.pageObj.availableRegions = Object.values(this.session.leaveAdmin).sort();
      if(this.pageObj.availableRegions.length > 0){
        this.regionChange(0);
      } else {
        this.alertMessage.showAlert("info", "Please note that your account is not linked to any valid region as leave admin. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Propagate Region Calendar","No Leave Region");
        //this.toBackPage();
      }
    } else {
      this.alertMessage.showAlert("info", "Please note that your account is not linked to any valid region as leave admin. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Propagate Region Calendar","No Leave Region");
      //this.toBackPage();
    }
  }
    // when region change
  async regionChange(e){
    this.pageObj.selectedCountry = this.pageObj.availableRegions[e].country;
    this.pageObj.selectedRegion = this.pageObj.availableRegions[e].region;
    this.getMonthsData(null);
  }
  async getMonthsData(e){
    // for positioning the graph data
    if(!e || this.pageObj.graphViewArray.currentMonth!= e.newMonth.months ||
       this.pageObj.graphViewArray.currentYear != e.newMonth.years ||
       (this.pageObj.graphViewMode=='monthly' && this.pageObj.yearMonthArr.length == 1 )){
       this.pageObj.selectedDate = e ? e.newMonth.dateObj : (this.pageObj.selectedDate ? this.pageObj.selectedDate : new Date());
       this.pageObj.monthSelected = e;
       const month = e ? e.newMonth.months.toString().padStart(2, '0') : moment(this.pageObj.selectedDate).format('MM');
       const year = e ? e.newMonth.years : moment(this.pageObj.selectedDate).format('YYYY');

       await this.cal.getCalendarYearData(month,year, {user: this.session}, this.calendarMeta, !e ? true : false);

        this.pageObj.graphViewArray.currentMonth = parseInt(month); // for graph view
        this.pageObj.graphViewArray.currentYear = parseInt(year); // for graph view

        // console.log("monchange inside if", this.pageObj.graphViewArray.currentMonth, this.pageObj.graphViewArray.currentYear);

        this.spinner.show();
        this.pageObj.allMonthsdata = [];

        this.pageObj.yearMonthArr = [moment(this.pageObj.selectedDate).format("YYYYMM"),];
        if(this.pageObj.graphViewMode=='monthly'){
          this.pageObj.yearMonthArr.push(moment(this.pageObj.selectedDate).startOf('month').subtract(2, 'months').format("YYYYMM"));
          this.pageObj.yearMonthArr.push(moment(this.pageObj.selectedDate).startOf('month').subtract(1, 'months').format("YYYYMM"));
          // this.pageObj.yearMonthArr.push(moment(this.pageObj.selectedDate).format("YYYYMM"));
          this.pageObj.yearMonthArr.push(moment(this.pageObj.selectedDate).startOf('month').add(1, 'months').format("YYYYMM"));
          this.pageObj.yearMonthArr.push(moment(this.pageObj.selectedDate).startOf('month').add(2, 'months').format("YYYYMM"));
        }
        this.getDataOfCollectedMonths();
    } else {
      if(this.pageObj.graphViewMode=='daily'){
        this.getPercentage();
      } else {
        this.getPercentage();
        this.getMonthlyPercentage();
      }
    }
  }
  getDataOfCollectedMonths(){
    return this.db.afs.collection(this.db._COLL_LEAVE_REGULATOR,
                    ref=> ref.where("subscriberId","==", this.session.subscriberId)
                    .where("country","==", this.pageObj.selectedCountry)
                    .where("region","==", this.pageObj.selectedRegion)
                    .where("yearMonth","in",this.pageObj.yearMonthArr))
                  .snapshotChanges().pipe(
                    map((actions: any[]) => actions.map((a: any) => {
                      const data = a.payload.doc.data();
                      const id = a.payload.doc.id;
                      return { id, ...data };
                  }))).subscribe((snapshot: any[]) => {
                      if(snapshot.length > 0){
                        let data = snapshot.sort((a,b)=>a.yearMonth - b.yearMonth);
                        // return data;
                        this.pageObj.allMonthsdata = data;
                        if(this.pageObj.graphViewMode=='daily'){
                          this.getPercentage();
                        } else {
                          this.getPercentage();
                          this.getMonthlyPercentage();
                        }

                      } else {
                        this.pageObj.allMonthsdata =[]
                        if(this.pageObj.graphViewMode=='daily'){
                          this.getPercentage();
                        } else {
                          this.getPercentage();
                          this.getMonthlyPercentage();
                        }
                        this.spinner.hide();
                      }
                  })
  }
    getPercentage(){
    this.leaveGraph =[];
    let leaveData = [];
    this.maxValue = 1;

    let startDate = moment(this.pageObj.selectedDate).startOf('month');
    let endDate = moment(this.pageObj.selectedDate).endOf('month');
    let selectedMonth = moment(this.pageObj.selectedDate).format("YYYYMM");
    let data = this.pageObj.allMonthsdata.filter(m=>m.yearMonth==selectedMonth); // holiday counter
    this.pageObj.dataOfThisMonth = data.length == 1 ? data[0] : {};
    let leaveSummary = data.length == 1 ? data[0].leaveSummary : {};
    let values = Object.keys(leaveSummary).map(d=>leaveSummary[d].onLeave ? leaveSummary[d].onLeave : 0);
    this.maxValue = values.length > 0 ? Math.max(...values) : 1;
    this.pageObj.dataOfThisMonth.maxLeave = values.length > 0 ? Math.max(...values) : 0;
    this.pageObj.dataOfThisMonth.averageLeave = data.length == 1 ?
                                                Math.round(this.pageObj.dataOfThisMonth.monthlySummary / parseInt(moment(endDate).format('DD')))
                                                :
                                                0;
    this.pageObj.dataOfThisMonth.dailyLeaveSummary=[];
    let cardIndex = 0;
    while(startDate <= endDate){
      let key = moment(startDate).format('YYYYMMDD');
      let onLeave = leaveSummary[key] ? leaveSummary[key].onLeave : 0;
      let height = (onLeave/(this.maxValue!=0 ? this.maxValue : 1)); //Math.floor(Math.random()*100);
      let users = onLeave > 0 ? leaveSummary[key].users : {};
      let day = startDate.format('DD');
      let holidayIdx = this.calendarMeta.orgHolidays.findIndex(o=>moment(o.date).format('YYYY-MM-DD')==startDate.format('YYYY-MM-DD'));
      if(this.calendarMeta.calendarOptions.disableWeeks.includes(parseInt(startDate.format('e'))) || holidayIdx !=-1){
        cardIndex++;
      }
      
      let graphElement = {
          startDate: new Date(startDate.format('YYYY-MM-DD')),
          endDate: new Date(startDate.format('YYYY-MM-DD')),
          date: new Date(startDate.format('YYYY-MM-DD')),
          users: Object.keys(users).map(u=>users[u]),
          onLeave: onLeave,
          isHoliday: this.calendarMeta.calendarOptions.disableWeeks.includes(parseInt(startDate.format('e'))) ?
                     //if weekly holiday add the description
                     { desc: 'Weekly holiday'}
                     :
                     // if calendar holiday, get the details from calendarMeta
                     holidayIdx !=-1
                     ?
                     {...this.calendarMeta.orgHolidays[holidayIdx]}
                     : false,
          day: parseInt(day)==1 ? 'Date' : parseInt(day)%7==0 ? parseInt(day) : null,
          key: key,
          cardIndex: cardIndex,
          maxHeight: 100, // since we only have no of people on leave and do not compare with any other values
          height: height*100, //leaveSummary[key] ? Math.floor(leaveSummary[key].present / this.maxValue)*100 : Math.floor(Math.random()*100),
          status:'exceed',
          cssClass: 'exceed' 
        };
      if(onLeave > 0){ leaveData.push({...graphElement});}
      this.leaveGraph.push({ ...graphElement });
      this.pageObj.dataOfThisMonth.dailyLeaveSummary.push({...graphElement, weekday: startDate.format('YYYY-MM-DD')});
      startDate = startDate.add(1, 'days');
    }
    this.cal.extractHolidays(leaveData,
                    'user',
                    'leave',
                    this.calendarMeta,
                    selectedMonth
                  );
    this.spinner.hide();
  }
  getMonthlyPercentage(){
    this.leaveGraph =[];
    this.maxValue = 1;

    let months = this.pageObj.yearMonthArr.sort((a,b)=>parseInt(a)-parseInt(b));

    let leaveSummary = this.pageObj.allMonthsdata;
    let values = leaveSummary.map(d=>d.monthlySummary ? d.monthlySummary : 0);
    this.maxValue = values.length > 0 ? Math.max(...values) : 1;
    months.forEach(m=>{
      let key = m;
      let record = leaveSummary.filter(l=>l.yearMonth==m);
      let monthlySummary = record.length==1 ? record[0].monthlySummary : 0;
      let height = (monthlySummary/(this.maxValue!=0 ? this.maxValue : 1)); //Math.floor(Math.random()*100);
      let month = moment(m+'01','YYYYMMDD').format('MMM');

      this.leaveGraph.push({
          date: new Date(moment(m+'01','YYYYMMDD').format('YYYY-MM-DD')),
          day: month,
          key: key,
          maxHeight: 100, // since we only have no of people on leave and do not compare with any other values
          height: height*100, //leaveSummary[key] ? Math.floor(leaveSummary[key].present / this.maxValue)*100 : Math.floor(Math.random()*100),
          cssClass:  key==moment(this.pageObj.selectedDate).format('YYYYMM') ? //leaveSummary[key].present > 20 ?
                      'exceed'
                      :
                      'moderate'
                });
    })
    this.spinner.hide();
  }
  // graph placement
  makeGraph(){
    let total = 0;
    let eachDataArr = [];
    if(this.pageObj.graphViewMode == "monthly"){
      let months = [];
      this.pageObj.allMonthsdata.forEach(element => {
        eachDataArr.push( (element) ? parseInt(element.monthlySummary) : 0  );
        months.push( (element) ? element.month : '' );
      });
      total = Math.max(...eachDataArr);
      this.pageObj.graphViewArray.data = [];
      for(var i =0; i < eachDataArr.length; i++){
        let percent = (eachDataArr[i] / total) * 100;
        this.pageObj.graphViewArray.data.push({
          title: months[ i % 5 ],
          total: total,
          now: eachDataArr[i],
          percent: percent,
          boxStyle: {'width': Math.ceil((100 / eachDataArr.length)) + "%", 'margin': '0px 7px'},
          style: {'font-size': '12px','height': percent+'%', 'border-top-right-radius': '4px', 'border-top-left-radius': '4px', 'background': percent < 40 ? 'linear-gradient(40deg, rgb(32, 150, 255), rgb(5, 255, 163))' : percent > 60 ? 'linear-gradient(40deg, rgb(255, 216, 111), rgb(252, 98, 98))' : 'linear-gradient(40deg, rgb(48, 63, 159), rgb(69, 202, 252))'},
        })
      }
    }else if(this.pageObj.graphViewMode == "daily"){
      this.pageObj.graphViewArray.data = [];
      let data = (this.pageObj.dataOfThisMonth) ? this.pageObj.dataOfThisMonth.leaveSummary : null;
      let totalDayInThisMonth = new Date(this.pageObj.graphViewArray.currentYear, this.pageObj.graphViewArray.currentMonth, 0).getDate();
      let total = 0;
      let eachDataArr = [];
      for(var j = 0; j < totalDayInThisMonth; j++){
        let movingDate = this.pageObj.graphViewArray.currentYear + "" + (parseInt(this.pageObj.graphViewArray.currentMonth) < 10 ? "0"+this.pageObj.graphViewArray.currentMonth : this.pageObj.graphViewArray.currentMonth)+ "" + ((j+1) < 10 ? "0"+(j+1) : (j + 1));
        eachDataArr.push(((data && data[movingDate] != undefined) ? data[movingDate].onLeave : 0));
      }
      total = Math.max(...eachDataArr);
      // arrenge graph
      for(var k = 0; k < eachDataArr.length; k++){
        let percent = (eachDataArr[k] / total) * 100;
        this.pageObj.graphViewArray.data.push({
          title: ((k+1) % 10 == 0) ? (k+1) : '',
          total: total,
          now: eachDataArr[k],
          percent: percent,
          boxStyle: {'width': Math.ceil((100 / eachDataArr.length)) + "%", 'margin': '0px 1px'},
          style: {'font-size': '8px','height': percent+'%', 'border-top-right-radius': '0', 'border-top-left-radius': '0' ,'background': percent < 40 ? 'linear-gradient(40deg, rgb(32, 150, 255), rgb(5, 255, 163))' : percent > 60 ? 'linear-gradient(40deg, rgb(255, 216, 111), rgb(252, 98, 98))' : 'linear-gradient(40deg, rgb(48, 63, 159), rgb(69, 202, 252))'},
        })
      }
    }else{

    }
    this.spinner.hide();
  }

  // a date selected
  daySelectedInMonth(e){
    let monthStartDate = new Date(this.pageObj.graphViewArray.currentYear+"-"+this.pageObj.graphViewArray.currentMonth.toString().padStart(2, '0')+"-01");
    let monthEndDate = new Date(moment(monthStartDate).endOf('month').format('YYYY-MM-DD'));
    if(new Date(moment(e.time).format('YYYY-MM-DD')) < monthStartDate || new Date(e.time) > monthEndDate ){
      this.alertMessage.showAlert("error","Please select a date of " + moment(monthStartDate).format('MMM, YYYY') + " to view details.","Invalid Date");
    }else if(!this.pageObj.dataOfThisMonth.dailyLeaveSummary || this.pageObj.dataOfThisMonth.dailyLeaveSummary.length==0){
      this.alertMessage.showAlert("error","No leave record is available for " + moment(e.time).format('MMM, YYYY'),"No LeaveRecords Found");
    }else{
      // this.navCtrl.push(AdminLeaveCalenderViewPage,{
      //   data: this.session,
      //   moreInfo:{
      //     dateSelected: new Date(e.time),
      //     monthData: this.pageObj.dataOfThisMonth.dailyLeaveSummary,
      //     region: this.pageObj.selectedRegion,
      //     country: this.pageObj.selectedCountry,
      //     type: 'leave'
      //   }
      // })
    }
  }


}
