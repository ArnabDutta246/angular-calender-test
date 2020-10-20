import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { ConnectionService } from 'ng-connection-service';
import { NgxSpinnerService } from 'ngx-spinner';
import { map } from 'rxjs/operators';
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { AllMembersDataService } from 'src/app/shared/all-members-data.service';
import { CalenderFunctionsService } from 'src/app/shared/calender-functions.service';
import { SweetAlertService } from 'src/app/shared/sweet-alert.service';

@Component({
  selector: 'app-user-leave',
  templateUrl: './user-leave.component.html',
  styleUrls: ['./user-leave.component.scss']
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
  constructor(
    private db: AllCollectionsService,
    private cal: CalenderFunctionsService,
    private allMembers:AllMembersDataService,
    private alertMessage:SweetAlertService,
    private spinner:NgxSpinnerService,
    private connectionService: ConnectionService,
  ) {
      this.session = this.allMembers.getCurrLogUserData();
      //this.leaveAdminRegions = this.cal.isUserRegionLeaveAdmin(this.session, false);
   }

  ngOnInit() {
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
    this.cal.getCalendarYearData(month, year, this.session, this.calendarMeta);
    this.getListOfleaves();

  }
  getListOfleaves(){
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
    // await this.getCalendarYearData(month, year);
    await this.cal.getCalendarYearData(month, year, this.session, this.calendarMeta,);
    await this.getListOfleaves();

  }

  dateFormatting(date, type){
    return date ? moment(date).format(type) : moment(this.monthStartDate).format(type);
  } 
  details(data){
    let showData = {
      docId: data.id,
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
        id: data.id,
        ...data
      }
    };
    let actionType = 'back';
    if(['PENDING','APPROVED'].includes(data.status)){
        actionType = 'cancel';
    }
    // this.navCtrl.push(
    //   LeaveAppliedDetailsPage,
    //   {data:this.session,details:showData,
    //     actionType: actionType}
    //  );
  }   
}
