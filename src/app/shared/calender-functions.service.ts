import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
import { AllCollectionsService } from './all-collections.service';
import { SweetAlertService } from './sweet-alert.service';
@Injectable({
  providedIn: 'root'
})
export class CalenderFunctionsService {

  constructor(
    private allCol:AllCollectionsService,
    private alertMessage:SweetAlertService,
    private spinner:NgxSpinnerService
  ) { }

  public leaveColors: any = ['#3b9a91', '#f56538', '#9a75dc',
                      '#8d6e63','#fd7a70',
                      'rgb(5, 255, 163)','rgb(255, 110, 196)','#62b796',
                      'rgb(48, 63, 159)','rgb(255, 216, 111)','#e83a4f',
                      '#0f266a','#737272'];

    // calendar meta structure
    getCalendarMeta(){
     let calendarMeta: any ={
              newObj: [],
              orgHolidays: [],
              userLeaves: [],
              userAttendance: [],
              excludeStatus: [],
              orgCalendarYear: {},
              isUserCalendarRequired: false,
              enableCashing: true,
              userCalendarYear: {leaveTypes: [], expenseTypes: []},
              userleaveTypes: [],
              userexpenseTypes: [],
              calendaryears: { years:[''], data: [] },
              calendarOptions: {
                pickMode: 'single',
                weekStart: 1,
                from: new Date(moment().startOf('month').subtract(1,'year').format('YYYY-MM-DD')),
                disableWeeks: [],
                daysConfig: [],
              },
          };
      return calendarMeta;
    }

    isUserRegionValid(session,showAlert:boolean=true){
      if(!session.user.regionServe || session.user.regionServe=='' ||
         !session.user.countryServe || session.user.countryServe==''
       ){
         if(showAlert){
           this.alertMessage.showAlert("error", "Please note that your account is not linked to any valid region. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Propagate Region Calendar","Invalid Region",);
         }
         return false;
       } else {
         return true;
       }
    }

    isUserRegionLeaveAdmin(session, showAlert:boolean=true){
      if(this.isUserRegionValid(session,showAlert))
      {
          let leaveAdminRegions = session.leaveAdmin ?
                                  Object.keys(session.leaveAdmin)
                                  :
                                  [];
          if(leaveAdminRegions.length==0){
            if(showAlert){
              this.alertMessage.showAlert("info", "Please note that your account is not linked to any valid region as leave admin. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Assign Leave Admin","No Leave Region",);
            }
            return false;
          } else {
            return leaveAdminRegions;
          }
       } else {
         return false;
       }
    }

    isUserRegionExpenseAdmin(session, showAlert:boolean=true){
      if(this.isUserRegionValid(session,showAlert))
      {
          let expenseAdminRegions = session.user.expenseAdmin ?
                                  Object.keys(session.user.expenseAdmin)
                                  :
                                  [];
          if(expenseAdminRegions.length==0){
            if(showAlert){
              this.alertMessage.showAlert("Please note that your account is not linked to any valid region as expense admin. Request your administrator to associate your account to a valid region from Admin panel > Maintain Region > Assign Expense Admin","No Expense Region",);
            }
            return false;
          } else {
            return expenseAdminRegions;
          }
       } else {
         return false;
       }
    }

    // render whole data in the array
    // only use this and send parameters
    renderDataSet(calendarMeta){
      setTimeout(()=>{
        const newOptions = {daysConfig: [...calendarMeta.newObj]};
        calendarMeta.calendarOptions = {...calendarMeta.calendarOptions,...newOptions};
        // console.log("Rendaring 2....",calendarOptions,daysConfig);
      }, 100);
    }
    // get Year Data
    getCalendarYearData(month, year, session, calendarMeta,forced:boolean=false){

      // console.log("getCalendarYearData",calendarMeta.calendaryears.years,JSON.stringify(calendarMeta.calendarOptions), JSON.stringify(calendarMeta.userCalendarYear));
      if(this.isUserRegionValid(session)){
        this.spinner.show();

        let years = [(parseInt(year) -1 ).toString(),year.toString(),(parseInt(year) + 1 ).toString()];
        // fetch data only if required
        let array1 = calendarMeta.calendaryears.years;
        let array2 = years;
        if(JSON.stringify(array1) != JSON.stringify(array2)|| forced){
          calendarMeta.calendaryears.years = [...years];
          return this.allCol.afs.collection(this.allCol._LEAVE_CALENDER,
                              ref=> ref.where("subscriberId","==",session.user.subscriberId)
                              .where("country","==",session.user.countryServe)
                              .where("region","==",session.user.regionServe)
                              // we need to check for calendar data for selected year and a year before that
                              // as some may be spead over two years
                              .where("year","in",calendarMeta.calendaryears.years)
                            )
                            .snapshotChanges()
                            .pipe(map((actions: any[]) => actions.map((a: any) => {
                              const data = a.payload.doc.data();
                              const id = a.payload.doc.id;
                              return { id, ...data };
                            }))).subscribe((data: any)=>{
                              // console.log("data for orga leave calendar",data,month);
                              if(data){
                                calendarMeta.calendaryears.data = data;
                                let orgData = [];
                                let matched = false;

                                data.forEach(d=>{
                                  // console.log("calendaryears ", d);
                                  let calStart = d.year+d.calendarStartMonth.toString().padStart(2, '0');
                                  let calEnd = (d.calendarEndMonth > 1 ? (parseInt(d.year)+1).toString() : d.year)+d.calendarEndMonth.toString().padStart(2, '0');

                                  if(calStart <= (year+month) && calEnd >= (year+month)){
                                    matched = true;

                                    calendarMeta.orgCalendarYear = d;
                                    calendarMeta.calendarOptions.disableWeeks = d.weeklyOffDays;
                                    calendarMeta.allLeavesOrgHave = Object.keys(d.leaveTypes).sort().map(k=>{return({code: k, ...d.leaveTypes[k]});});
                                    calendarMeta.allExpensesOrgHave = Object.keys(d.expenseTypes).sort().map(k=>{return({code: k, ...d.expenseTypes[k], spent:0});});
                                    if(calendarMeta.isUserCalendarRequired && (!calendarMeta.userCalendarYear.year || calendarMeta.userCalendarYear.year != d.year)){
                                      this.getuserLeaveCalendar(session, d.year, calendarMeta);
                                    }
                                  }
                                  Object.keys(d.holidays).forEach(h=>{
                                    orgData.push({...d.holidays[h]});
                                  });

                                })
                                // this.extractHolidays(orgData,'org');
                                this.extractHolidays(orgData,
                                                'org',
                                                'holidays',
                                                calendarMeta,
                                              );
                                if(!matched && calendarMeta.isUserCalendarRequired){
                                  calendarMeta.userCalendarYear = {leaveTypes: [], expenseTypes: []};
                                  calendarMeta.userleaveTypes = [];
                                  calendarMeta.userexpenseTypes = [];
                                  this.alertMessage.showAlert("error","No leave calendar found for the calendar year. Please ask admin to associate your account to <b>"+session.user.regionServe+"</b> of country code: <b>"+session.user.countryServe+"</b> for " +  year,"No Leave Calendar");
                                  // session.user.loader = false;
                                }

                              } else {
                                if(calendarMeta.isUserCalendarRequired){
                                  this.alertMessage.showAlert("error","No leave calendar found for the calendar year. Please ask admin to associate your account to <b>"+session.user.regionServe+"</b> of country code: <b>"+session.user.countryServe+"</b> for " +  year,"No Leave Calendar",);
                                  calendarMeta.userCalendarYear = {leaveTypes: [], expenseTypes: []};
                                  calendarMeta.userleaveTypes = [];
                                  calendarMeta.userexpenseTypes = [];
                                }
                                // session.user.loader = false;
                              }
                            }
                          );
        } else {
          let data = calendarMeta.calendaryears.data;
          let matched = false;
          data.forEach(d=>{
            // console.log("calendaryears ", d);
            let calStart = d.year+d.calendarStartMonth.toString().padStart(2, '0');
            let calEnd = (d.calendarEndMonth > 1 ? (parseInt(d.year)+1).toString() : d.year)+d.calendarEndMonth.toString().padStart(2, '0');

            if(calStart <= (year+month) && calEnd >= (year+month)){
              matched = true;

              calendarMeta.orgCalendarYear = d;
              calendarMeta.calendarOptions.disableWeeks = d.weeklyOffDays;
              if(calendarMeta.isUserCalendarRequired && (!calendarMeta.userCalendarYear.year || calendarMeta.userCalendarYear.year != d.year)){
                this.getuserLeaveCalendar(session, d.year, calendarMeta);
              }
            }
          })

          if(!matched && calendarMeta.isUserCalendarRequired){
            this.alertMessage.showAlert("error","No leave calendar found for the calendar year. Please ask admin to associate your account to <b>"+session.user.regionServe+"</b> of country code: <b>"+session.user.countryServe+"</b> for " +  year,"No Leave Calendar",);
            calendarMeta.userCalendarYear = {leaveTypes: [], expenseTypes: []};
            calendarMeta.userleaveTypes = [];
            calendarMeta.userexpenseTypes = [];
            // session.user.loader = false;
          }
        }

      }
    }

    // this is to get the calendar year information of the user
    // we need the calendar year to fetch the user leave calendar
    getuserLeaveCalendar(session, calendarYear,calendarMeta){

      if(calendarYear){
        return this.allCol.afs.collection(this.allCol._USER_LEAVE_CALENDAR,
                            ref=> ref.where("subscriberId","==",session.user.subscriberId)
                            .where("uid","==",session.user.uid)
                            .where("country","==",session.user.countryServe)
                            .where("region","==",session.user.regionServe)
                            .where("year","==",calendarYear)
                          )
                          .snapshotChanges()
                          .pipe(map((actions: any[]) => actions.map((a: any) => {
                            const data = a.payload.doc.data();
                            const id = a.payload.doc.id;
                            return { id, ...data };
                          }))).subscribe((data: any)=>{
                            if(data.length > 0){
                              calendarMeta.userCalendarYear = data[0];
                              calendarMeta.userleaveTypes = Object.keys(data[0].leaveTypes).sort();
                              calendarMeta.userexpenseTypes = Object.keys(data[0].expenseTypes).sort();
                            } else {
                              calendarMeta.userCalendarYear = {leaveTypes: [], expenseTypes: []};
                              calendarMeta.userleaveTypes = [];
                              calendarMeta.userexpenseTypes = [];
                              this.alertMessage.showAlert("error","No leave calendar found for the calendar year. Please ask admin to associate your account to <b>"+session.user.regionServe+"</b> of country code: <b>"+session.user.countryServe+"</b> for " +  calendarYear,"No Leave Calendar",);
                            }
                            // session.user.loader = false;
                          });
      } else {
        this.alertMessage.showAlert("error","No leave calendar provided, please check and provide a valid leave calendar year","Invalid Leave Calendar Year");
        calendarMeta.userCalendarYear = {leaveTypes: [], expenseTypes: []};
        calendarMeta.userleaveTypes = [];
        calendarMeta.userexpenseTypes = [];
      }
    }


    // extract the all applied leaves and organisation holidays
    extractHolidays(data,
                    source = 'user',
                    dataType = 'leave',
                    calendarMeta,
                    yearMonth = null,
                    ){
      // newObj = source=='user' ? [...orgHolidays] : [...userLeaves];
      let userData = [];
      if(source=='user'){
        // newObj = [...orgHolidays];
        if(dataType=='leave'){
          calendarMeta.userLeaves = [];
        } else {
          calendarMeta.userAttendance = [];
        }

      } else {
        // newObj = [...userLeaves];
        calendarMeta.orgHolidays = [];
      }
      for(var i = 0; i < data.length; i++){
        let endDate = null;
        let startDate = null;
        let endOfMonth = yearMonth ? moment(yearMonth,'YYYYMM').startOf('month').format("YYYY-MM-DD") : null;
        let startOfMonth = yearMonth ? moment(yearMonth,'YYYYMM').endOf('month').format("YYYY-MM-DD") : null;
        // If the date is from firestore database we have .seconds attribute, then use it
        // else assume that this is a moment date type
        if(data[i].startDate.seconds){
          endDate = moment(data[i].endDate.seconds * 1000).format("YYYY-MM-DD");
          startDate = moment(data[i].startDate.seconds * 1000).format("YYYY-MM-DD");
          // startOfMonth = moment(data[i].startDate.seconds * 1000).startOf('month').format("YYYY-MM-DD");
          // endOfMonth = moment(data[i].startDate.seconds * 1000).endOf('month').format("YYYY-MM-DD");
        } else {
          endDate = moment(data[i].endDate).format("YYYY-MM-DD");
          startDate = moment(data[i].startDate).format("YYYY-MM-DD");
          // startOfMonth = moment(data[i].startDate.seconds).startOf('month').format("YYYY-MM-DD");
          // endOfMonth = moment(data[i].startDate.seconds).endOf('month').format("YYYY-MM-DD");
        }
        let status = source!='user' ? 'holiday' : data[i].status.toLowerCase(); // == 'PENDING') ? 'pending' : (data[i].status == 'APPROVED') ? 'approved' : 'rejected';
        if(startDate == endDate){
          // newObj.push({date: new Date(moment(data[i].startDate.seconds * 1000).format("YYYY-MM-DD")), cssClass: status});
          if(!calendarMeta.excludeStatus.includes(status)) {
            if(source=='user'){
              if(dataType=='leave' && calendarMeta.calendarOptions.disableWeeks.includes(parseInt(moment(startDate).format('e')))){
                // do nothing
              } else {
                userData.push({date: new Date(startDate), cssClass: status+'Date'});
              }

            } else {
              calendarMeta.orgHolidays.push({date: new Date(startDate), cssClass: status+'Date', desc: data[i].desc});
            }
          }
        }else{
          while(startDate <= endDate){
            if(!calendarMeta.excludeStatus.includes(status)) {
              if(source=='user'){
                if(dataType=='leave' && calendarMeta.calendarOptions.disableWeeks.includes(parseInt(moment(startDate).format('e')))){
                  // do nothing
                } else {
                  if(!yearMonth ||
                    (yearMonth && startDate >= startOfMonth && startDate <= endOfMonth)
                  ){
                    userData.push({date: new Date(startDate), cssClass: status+'Date'});
                  }
                }
              } else {
                calendarMeta.orgHolidays.push({date: new Date(startDate), cssClass: status+'Date', desc: data[i].desc});
              }
            }
            // newObj.push({date: new Date(startDate), cssClass: status});
            startDate = moment(startDate).add(1, 'days').format("YYYY-MM-DD");
          }
        }
      }
      if(source=='user'){
        // newObj = [...orgHolidays];
        if(dataType=='leave'){
          calendarMeta.userLeaves = userData;
        } else {
          calendarMeta.userAttendance = userData;
        }
      }
      // Combine all leaves and holidays
      calendarMeta.newObj = [...calendarMeta.orgHolidays, ...calendarMeta.userLeaves, ...calendarMeta.userAttendance];
      // console.log("calendarOptions", newObj, calendarOptions);
      this.renderDataSet(calendarMeta);
      // console.log("calendarOptions 2", newObj, calendarOptions);
      // this.monthChanges({newMonth: {months: parseInt(moment().format("MM")), years: parseInt(moment().format("YYYY"))}});
    }
}
