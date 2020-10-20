import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  OnChanges,
  Output,
  EventEmitter,
} from "@angular/core";
import { AllMembersDataService } from "src/app/shared/all-members-data.service";
import { ProfileImageService } from "src/app/shared/profile-image.service";
import { CountryCode } from "src/app/extra/country-code";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { map } from "rxjs/operators";
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { ConnectionService } from 'ng-connection-service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-select-members',
  templateUrl: './select-members.component.html',
  styleUrls: ['./select-members.component.scss']
})
export class SelectMembersComponent implements OnInit,OnChanges {
  @ViewChild("contentSendMail", { static: true }) contentSendMail: ElementRef;
  @ViewChild("contentTwoSendMail", { static: true })
  contentTwoSendMail: ElementRef;
  @ViewChild("closeModalButton", { static: true }) closeModalButton: ElementRef;
  @Input() allMemberSelectObject:any;
  @Output() defineExpenseAdmin = new EventEmitter<any>();
  @Output() defineLeaveAdmin = new EventEmitter<any>();
  @Output() propagateLeaveforUser = new EventEmitter<any>();


  modalDismis: ElementRef;
  getUserData: any;
  isConnected: any;
  statuss: any;
  allMemberArray: any;
  filterMemberArray: any;
  toggleSearch: Boolean = false;
   linkData: any = null;
  allrecipientArr: any[] = [];
  addPanel: boolean = false;
 showSearchInput:boolean = false;
 searchByName:string= '';
  //-------form group
  registerForm: FormGroup;
  Cd: any = CountryCode;
  dialCode = CountryCode[0].Dial;
  submitted: any;
  headerText = ["Select recipients", "Add new member"];
  // navigation data
  nav: any;
  copyMeetingDetails: any;
  meetingMembers: any;
  copyMeetingMembers: any;
  backfromAttendees: any;
  sendMail: any;
  attendeeList: any=[];
  // which country or region is in progress
  countryData: any;
  // data form database
  users$: any;
  activeMembers: any=[];
  externalMembers: any=[];
  allMembers: any;
  eventType: string = null;
  // other variables
  loader: boolean;
  showMessageInputBox: boolean = false;
  getNavData:any = null;
  shareIcon: any;

  private checkboxValue:any;
  private broadcastMsg:any;
  //===============================
  constructor(
    private connectionService: ConnectionService,
    private allCol: AllCollectionsService,
    public allMemberdata: AllMembersDataService,
    private proImg: ProfileImageService,
    private formBuilder: FormBuilder,
    private sl: SweetAlertService,
    private spinner:NgxSpinnerService
  ) {
    this.getUserData = this.allMemberdata.getCurrLogUserData();
  }

  ngOnInit() {
    this.allMemberSelectObject = null;
    //----------------------network check function------------------
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.statuss = "ONLINE";
      } else {
        this.statuss = "OFFLINE";
      }
    });

    //----------------------------------------------------
    //form builder & validation
    let emailRegex = /^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$/;
    let sidPatten = /^(?=.*[A-Z])([a-zA-Z0-9]{5,10})$/;
    let namePattern = /^([a-zA-Z]+[,.]?[ ]?|[a-zA-Z]+['-]?)+$/;
    let phoneNoPattern = /^[0-9]*$/;
    this.registerForm = this.formBuilder.group(
      {
        subscriptionID: [
          "",
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(10),
            Validators.pattern(sidPatten),
          ],
        ],
        subscriberRole: [""],
        subscriberName: [
          "",
          [Validators.required, Validators.pattern(namePattern)],
        ],
        subscriberEmail: [
          "",
          [Validators.required, Validators.pattern(emailRegex)],
        ],
        subscriberJobTitle: ["", Validators.required],
        subscriberCtc: [null, Validators.required],
        subscriberPhone: [
          "",
          [Validators.required, Validators.pattern(phoneNoPattern)],
        ],
      },
      {
        validator: [],
      }
    );
    //this.fetchAllMember(this.getUserData.subscriberId);
    this.setValue();
  }
  ngOnChanges() {
    this.getNavData = null;
    if(this.allMemberSelectObject){
    this.getNavData = this.allMemberSelectObject;
    //console.log(this.getNavData);
    this.fetchAllM();
   }
  }
  setValue() {
    this.registerForm.patchValue({
      subscriptionID: this.getUserData.subscriberId,
      subscriberRole: this.getUserData.role === "ADMIN" ? "USER" : "EXTERNAL",
    });

  }
  get f() {
    return this.registerForm.controls;
  }
  fetchAllM(){
    this.spinner.show();
    this.users$ = this.allCol.afs.collection(this.allCol.users, ref=>ref
      .where('subscriberId','==',this.getUserData.subscriberId)
      .where('status','in',['ACTIVE','EXTERNAL'])).snapshotChanges().pipe(
        map((actions: any[]) => actions.map((a:any)=>{
          const data = a.payload.doc.data();
          // bring me into user
          let checked = false;
          let presentStatus = null;
          let disabled = (data.uid == this.getUserData.uid ) && this.getUserData.role != 'ADMIN';
          switch(this.getNavData.eventType){
            case 'propagateCalendar':
              if(data.countryServe == this.getNavData.countryData.countryData.countryCode && data.regionServe == this.getNavData.countryData.countryData.region){
                checked = true;
                presentStatus = 'EXISTING';
              } else if(data.countryServe || data.regionServe){
                //disabled = true;
              }
              break;
            case 'propagateLeaveAdmin':
              data.leaveAdmin &&
              Object.keys(data.leaveAdmin).forEach(l=>{
                if(data.leaveAdmin[l].country == this.getNavData.countryData.countryData.countryCode && data.leaveAdmin[l].region == this.getNavData.countryData.countryData.region){
                  checked = true;
                  presentStatus = 'EXISTING';
                }
              });
              break;
            case "propagateExpenseAdmin":
              data.expenseAdmin &&
              Object.keys(data.expenseAdmin).forEach(e=>{
                if(data.expenseAdmin[e].country == this.getNavData.countryData.countryData.countryCode && data.expenseAdmin[e].region == this.getNavData.countryData.countryData.region){
                  checked = true;
                  presentStatus = 'EXISTING';
                }
              });
              break;
          }
          let user = {...data, checked, presentStatus, disabled };
          if(checked){
            this.attendeeList.push({...user});
          }
          return { ...user };
        }))
      ).subscribe((data)=>{
        this.spinner.hide();
        this.allMembers = data;
        this.filterMemberArray = data;
       // console.log(this.allMembers)
      });
  }


 checkboxOnChange()
  {
    if(this.checkboxValue)
    {
      this.attendeeList =[];
      this.allMembers.forEach((data,i)=>{
        // which is not disabled
        if(!data.disabled){
          data.checked = true;
          this.attendeeList.push({...data});
        }
      });
    }
    else
    {
      this.attendeeList =[];
      this.allMembers.forEach((data,i)=>{
        data.checked = false;
      });
    }
  }
 // making list of selected users
  makeaList(e, data)
  {
    if(e.target.checked){
      data.checked = true;
      let dataIdToAdd = this.attendeeList.findIndex((u,i)=>{ return u.email == data.email}, data);
      if(this.eventType && dataIdToAdd !=-1){
        this.attendeeList[dataIdToAdd].checked = true;
      } else {
        this.attendeeList.push({...data});
      }
    } else {
      let dataIdTodelete = this.attendeeList.findIndex((u,i)=>{ return u.email == data.email}, data);
      if(this.eventType && this.attendeeList[dataIdTodelete].presentStatus=='EXISTING'){
        this.attendeeList[dataIdTodelete].checked = false;
      }
      else {
        this.attendeeList.splice(dataIdTodelete, 1);
      }
      data.checked = false;
    }
  } 

sendMemberListToParents(){
  switch (this.allMemberSelectObject.eventType) {
    case 'propagateExpenseAdmin':
      this.defineExpenseAdmin.emit(this.attendeeList);
      break;
    case 'propagateLeaveAdmin':
      this.defineLeaveAdmin.emit(this.attendeeList);
      break;
    case 'propagateCalendar':
      this.propagateLeaveforUser.emit(this.attendeeList);
      break;
    default:
      break;
  }
  this.attendeeList = [];
}

  //------------------- set phone number----------------
  format_phone_no(data) {
    var phone_array = data.split(" ");
    var country_code = phone_array[0].split("@");
    return country_code[1] + " " + phone_array[1];
  }
    //----------------------------filter members--------------------
  filterMember(e) {
    if (this.searchByName === '') {
      this.allMembers = this.filterMemberArray;
    } else if (this.searchByName !== "") {
      this.allMembers = this.filterMemberArray.filter((member) => {
      let name = member.name.toLowerCase();
      return !name.indexOf(this.searchByName .toLowerCase());
      });
    } 
  }

  //-----------------------caching image----------------------
  profileImgErrorHandler(user: any) {
    console.log("profile image", user);
    user.picUrl = "../../../../assets/image/imgs/profile.png";
  }

  profileImageLazyLoading() {
    this.allMemberArray.forEach((m, i) => {
      this.proImg.profileImgErrorHandler(
        m.attendeeList,
        this.getUserData,
        m.attendeeUidList
      );
    });
  }
  //----------------------------show and hide action--------------------
  panelHandler(id_1: string, id_2: string) {
    let home = document.getElementById(id_1);
    let linkage = document.getElementById(id_2);
    if (this.addPanel) {
      let b: HTMLElement = this.contentSendMail.nativeElement as HTMLElement;
      b.click();
      this.addPanel = false;
    } else {
      let b: HTMLElement = this.contentTwoSendMail.nativeElement as HTMLElement;
      b.click();
      this.addPanel = true;
    }
    if (!home.classList.contains("active")) {
      home.classList.add("active");
      home.classList.add("show");
      linkage.classList.remove("active");
      linkage.classList.remove("show");
    }
  }
  //----------------change country and dial code------------------
  changeCountry(e) {
    console.log(e.target.value);
    this.Cd.find((item) => {
      if (item.Iso2 == e.target.value) {
        this.dialCode = `${item.Iso2}@+${item.Dial} `;
      }
    });
  }
  //---------------- new member add for org------------------

  onSubmit() {
    this.submitted = true;
    if (this.registerForm.invalid) {
      console.log("Error occured");
      console.log(this.registerForm.value);
    } else {
      // console.log("Success");
      // console.log(this.registerForm.value);

      this.allMemberdata
        .addNewMember(this.registerForm.value, this.dialCode)
        .then(
          function (res) {
            if (res) {
              //this.fetchMember("call");
              this.submitted = false;
              this.registerForm.reset({});
              this.setValue();
            }
          }.bind(this)
        );
    }
  }

  //-------------------show network issue-------------
  showNetworkIssue() {
    this.sl.poorNetwork();
  }

  changeState() {
    if (this.addPanel) {
      this.panelHandler("home-send-mail", "nav-profile-send-mail");
    }
  }
}