import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  OnChanges,
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
import * as moment from "moment";
import { UserLoginService } from "src/app/shared/user-login.service";
import * as CryptoJS from "crypto-js";
import { AllCollectionsService } from 'src/app/shared/all-collections.service';
import { ConnectionService } from 'ng-connection-service';
import { sKey } from 'src/app/extra/sKey';

@Component({
  selector: 'app-select-members',
  templateUrl: './select-members.component.html',
  styleUrls: ['./select-members.component.scss']
})
export class SelectMembersComponent implements OnInit {
 @ViewChild("contentSendMail", { static: true }) contentSendMail: ElementRef;
  @ViewChild("contentTwoSendMail", { static: true })
  contentTwoSendMail: ElementRef;
  @ViewChild("closeModalButton", { static: true }) closeModalButton: ElementRef;
  @Input()
  data: any;
  @Input() type: any;
  modalDismis: ElementRef;
  getUserData: any;
  isConnected: any;
  statuss: any;
  allMemberArray: any;
  filterMemberArray: any;
  toggleSearch: Boolean = false;
  allrecipientArr: any[] = [];
  addPanel: boolean = false;
  linkData: any = null;
  //-------form group
  registerForm: FormGroup;
  Cd: any = CountryCode;
  dialCode = CountryCode[0].Dial;
  submitted: any;
  headerText = ["Select recipients", "Add new member"];
  constructor(
    private connectionService: ConnectionService,
    private allCol: AllCollectionsService,
    public allMemberdata: AllMembersDataService,
    private proImg: ProfileImageService,
    private formBuilder: FormBuilder,
    private sl: SweetAlertService,
  ) {}

  ngOnInit() {
    this.getUserData = this.allMemberdata.getCurrLogUserData();
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
    this.fetchAllMember(this.getUserData.subscriberId);
    this.setValue();
  }
  ngOnChanges() {
    this.type = this.type;
    this.data = this.data;
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
  fetchAllMember(id) {
    let users = this.allCol.afs
      .collection(this.allCol.users, (ref) =>
        ref
          .where("subscriberId", "==", this.getUserData.subscriberId)
          .where("status", "in", ["ACTIVE", "EXTERNAL"])
      )
      .snapshotChanges();
    users
      .pipe(
        map((actions: any[]) =>
          actions.map((a: any) => {
            let user = {
              ...a.payload.doc.data(),
              checked: true,
            };
            let checked = this.allrecipientArr.findIndex((u, i) => {
              return u.email == user.email;
            }, user);
            if (checked == -1) {
              user.checked = false;
            }
            return { ...user };
          })
        )
      )
      .subscribe((arr) => {
        //  console.log(arr);
        this.allMemberArray = arr;
        this.filterMemberArray = arr;
      });
  }
  //--------------------filter member (search)------------------------
  filterUser(e) {
    let v = e.target.value;
    let value = v.toLowerCase();
    this.allMemberArray = this.filterMemberArray.filter((member) => {
      let name = member.name.toLowerCase();
      return !name.indexOf(value);
    });
  }
  showSearchInput(id: string) {
    const i = document.getElementById(`${id}`);
    if (this.toggleSearch === false) {
      i.classList.remove("d-none");
      this.toggleSearch = true;
    } else {
      i.classList.add("d-none");
      this.toggleSearch = false;
    }
  }
  //----------------------select or remove member-------------
  //-------------------add or remove attendee------------------------
  addOrRemoveRecipient(member) {
    let data = {
      uid: member.uid,
      email: member.email,
      name: member.name,
    };
    if (
      this.allrecipientArr.filter((n) => {
        return n.uid === member.uid;
      }).length > 0
    ) {
      this.allrecipientArr = this.allrecipientArr.filter((n) => {
        return n.uid !== member.uid;
      });
      member.checked = false;
    } else {
      this.allrecipientArr.push(data);
    }
    // console.log(this.allrecipientArr);
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