import { Component, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import { AllMembersDataService } from "src/app/shared/all-members-data.service";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { UserLoginService } from "src/app/shared/user-login.service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { CountryCode } from "../../../extra/country-code";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { AngularFireAuth } from "@angular/fire/auth";
//import SimpleCrypto from "simple-crypto-js";
import { environment } from "src/environments/environment.prod";
import { sKey } from "src/app/extra/sKey";
import { Router } from "@angular/router";
import { SubscriptionComponent } from "../subscription/subscription.component";
import { AngularFirestore } from "@angular/fire/firestore";
import { map } from "rxjs/operators";
import { ConnectionService } from "ng-connection-service";
import * as CryptoJS from "crypto-js";
@Component({
  selector: "app-register-member",
  templateUrl: "./register-member.component.html",
  styleUrls: ["./register-member.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class RegisterMemberComponent implements OnInit {
  @ViewChild(SubscriptionComponent, { static: true })
  private subscriptionContent: SubscriptionComponent;
  subscriptiondata: any;
  subPlanData: any = null;
  allMemberArray: any;
  filterMemberArray: any;
  allMemberArrayAD: any;
  selectedFilter: string = "ALL";
  typesearch = "";
  toggleSearch: boolean = false;
  //all variable -----
  registerForm: FormGroup;
  submitted = false;
  authError: any;
  repassword = "";
  Cd: any = CountryCode;
  dialCode = CountryCode[0].Dial;
  getUserData: any;
  currentUserUid: string;
  //-----------check online/offline
  status = "ONLINE"; //initializing as online by default
  isConnected = true;
  currPlanActiveOrNot: boolean;
  basicAuth: any;
  constructor(
    public allMemberdata: AllMembersDataService,
    private allCol: AllCollectionsService,
    private loginService: UserLoginService,
    private sl: SweetAlertService,
    private formBuilder: FormBuilder,
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore,
    private connectionService: ConnectionService
  ) {
    //decrytion of session data
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // const obj: any = simpleCrypto.decryptObject(data);
    const data = sessionStorage.getItem("user");
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    let getUserData = decryptedData;
    this.getUserData = getUserData;
    this.basicAuth = environment.paypalBasicUrl;
    this.fetchData();

    //--------------------
    //form builder & validation
    let emailRegex = /^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$/;

    let sid = /^(?=.*[A-Z])([a-zA-Z0-9]{5,14})$/;
    // let sidPatten = /^[A-Z]{2,3}[A-Z0-9]*[0-9]$/;
    let namePattern = /^([a-zA-Z]+[,.]?[ ]?|[a-zA-Z]+['-]?)+$/;
    let phoneNoPattern = /^[0-9]*$/;
    this.registerForm = this.formBuilder.group(
      {
        subscriptionID: ["", [Validators.required, Validators.pattern(sid)]],
        subscriberRole: [""],
        subscriberName: [
          "",
          [Validators.required, Validators.pattern(namePattern)],
        ],
        subscriberEmail: [
          "",
          [
            Validators.required,
            Validators.email,
            Validators.pattern(emailRegex),
          ],
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
    //-----------------------member fetch function------------------
    this.allCol
      .getUserCollection()
      .where("subscriberId", "==", this.getUserData.subscriberId)
      .onSnapshot(
        function (query) {
          let arr = [];
          query.forEach((q)=>{
            // lets add the actions for the user
            let data = q.data();
            data.actions = this.getActions(data);
            arr.push(data);
          });
          // console.log(arr);
          this.allMemberArray = arr;
          this.filterMemberArray = arr;
          this.allMemberArrayAD = arr;
          this.filterMember(this.selectedFilter);
          //return res(arr);
        }.bind(this)
      );
    this.setValue();
  }
  //------------------- set phone number----------------
  format_phone_no(data) {
    var phone_array = data.split(" ");
    var country_code = phone_array[0].split("@");
    return country_code[1] + " " + phone_array[1];
  }
  //------------
  // get form data
  setValue() {
    this.registerForm.patchValue({
      subscriptionID: this.getUserData.subscriberId,
      subscriberRole: "USER",
    });
  }
  get f() {
    return this.registerForm.controls;
  }
  checkSID(e) {
    let sid = e.target.value;
    e.target.value = sid.toUpperCase().replace(" ", "");
  }
  onSubmit() {
    this.submitted = true;
    if (this.registerForm.invalid) {
      // console.log("Error occured");
      // console.log(this.registerForm.value);
    } else {
      if (this.status === "ONLINE") {
        this.allMemberdata
          .addNewMember(this.registerForm.value, this.dialCode)
          .then((res) => {
            if (res) {
              this.fetchData();
              this.submitted = false;
              this.registerForm.reset();
              this.registerForm.patchValue({
                subscriptionID: this.getUserData.subscriberId,
                subscriberRole: "USER",
              });
            }
          });
      } else {
        this.showNetworkIssue();
      }
    }
  }

  //----------------
  // change country and dial code
  changeCountry(e) {
    //console.log(e.target.value);
    this.Cd.find((item) => {
      if (item.Iso2 == e.target.value) {
        this.dialCode = `${item.Iso2}@+${item.Dial} `;
      }
    });
  }

  //-------------------------fetch all subscribers data---------------------
  fetchData() {
    this.allCol
      .getSubscriberCollection()
      .doc(this.getUserData.subscriberId)
      .onSnapshot(
        async function (query) {
          //console.log("hagsdhfjglsadfgaskfd", query.data());
          this.subscriptiondata = query.data();
          this.subPlanData = await this.fetchPlanData(
            this.subscriptiondata.subscriptionType
          );
          if (this.subscriptiondata.subscriptionType !== "FREE")
            await this.getSubcriptionDetails(this.subscriptiondata.paypalId);
          //return res(arr);
        }.bind(this)
      );
  }
  fetchPlanData(plan) {
    return this.allCol
      .getSubscriptionplans()
      .where("planName", "==", plan)
      .get()
      .then((res) => {
        let a: any;
        res.forEach((q) => {
          a = q.data();
        });
        return a;
      });
  }

  //----------------------------filter members--------------------
  filterMember(filsel: string) {
    const value = this.typesearch.toLowerCase();
    const filse = filsel;
    this.selectedFilter = filsel.slice(0,1).toUpperCase() + filsel.slice(1).toLowerCase();
    if (value === "" && filse === "ALL") {
      this.allMemberArray = this.filterMemberArray;
    } else if (value === "" && filse !== "ALL") {
      this.allMemberArray = this.filterMemberArray.filter((member) => {
        return member.status === filse;
      });
    } else if (value !== "" && filse === "ALL") {
      this.allMemberArray = this.filterMemberArray.filter((member) => {
        let name = member.name.toLowerCase();
        return !name.indexOf(value);
      });
    } else {
      this.allMemberArray = this.filterMemberArray.filter((member) => {
        let name = member.name.toLowerCase();
        return member.status === filse && !name.indexOf(value.toLowerCase());
      });
    }
  }

  //------------------------sendRequest for Active----------------
  sendRequestActive(
    subId: string,
    noOfFreeLicense: number,
    currStatus: string,
    uid: string,
    img: any,
    email: string,
  ) {
    let text = `want to activate this member`;
    this.allMemberdata
      .noOfFreeLicenseHas()
      .then((res) => {
        if (res) {
          return this.sl.showAlertReturnTypeWithImage(``, img, text);
        }
      })
      .then((res) => {
        if (res) {
          return this.status === "ONLINE"
            ? this.allMemberdata.activeUser(uid, subId, noOfFreeLicense)
            : this.showNetworkIssue();
        }
      })
      .then((res) => {
        if (res) {
          this.fetchData();
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
  //------------------------sendRequest for Leave / Suspand--------------

  sendLeaveOrSuspandRequest(
    status: string,
    subId: string,
    noOfFreeLicense: number,
    currStatus: string,
    uid: string,
    img: any,
    email: string
  ) {
    const textWill =
      status === "LEAVER"
        ? "to mark user as leaver"
        : status === "EXTERNAL"
        ? "to mark user as external"
        : "to suspend the user";
    this.sl
      .showAlertReturnTypeWithImage(``, img, `${textWill}`)
      .then((res) => {
        if (res) {
          return this.status === "ONLINE"
            ? this.allMemberdata.deactiveSuspandLeaveUser(
                uid,
                subId,
                noOfFreeLicense,
                currStatus,
                status,
                email
              )
            : this.showNetworkIssue();
        }
      })
      .then((res) => {
        if (res) {
          this.fetchData();
        }
      });
  }
  //--------------------------------sendRequest for reject-------------
  sendRejectRequest(
    status: string,
    subId: string,
    currStatus: string,
    uid: string,
    img: any,
    email: string
  ) {
    this.sl
      .showAlertReturnTypeWithImage(``, img, `to reject this member request`)
      .then((res) => {
        if (res) {
          return this.status === "ONLINE"
            ? this.allMemberdata.rejectUser(uid, subId, status)
            : this.showNetworkIssue();
        }
      })
      .then((res) => {
        if (res) {
          this.fetchData();
        }
      });
  }
  //--------------------------assign member as admin ------------
  assignAdminOrUser(
    sid: string,
    role: string,
    currStatus: string,
    uid: string,
    img: any,
    email: string
    ) {
    this.sl
      .showAlertReturnTypeWithImage(``, img, `to assign this person as ${role}`)
      .then((res) => {
        if (res) {
          return this.status === "ONLINE"
            ? this.allMemberdata.addAdminOrUser(uid, sid, role)
            : this.showNetworkIssue();
        }
      });
  }
  //--------------------------get user dropdown list action ------------
  getActions(data) {
    let actions = [
      {
        text: 'Assign user role',
        parameters: [
          this.allMemberdata.subscriptiondata.id,
          this.allMemberdata.subscriptiondata.noOfFreeLicense,
        ],
        function: this.sendRequestActive.bind(this),
        currStatus: ['EXTERNAL','REJECTED','SUSPENDED','LEAVED','REGISTERED']
        },
      {
        text: 'Assign user role',
        parameters: [
          this.allMemberdata.subscriptiondata.id,
          'USER',
        ],
        function: this.assignAdminOrUser.bind(this),
        currStatus: ['ACTIVE'],
        role: ['ADMIN']
        },
      {
        text: 'Assign admin role',
        parameters: [
          this.allMemberdata.subscriptiondata.id,
          'ADMIN',
        ],
        function: this.assignAdminOrUser.bind(this),
        currStatus: ['ACTIVE'],
        role: ['USER']
        },
      {
        text: 'Reject request',
        parameters: [
          this.allMemberdata.status[4],
          this.allMemberdata.subscriptiondata.id,
        ],
        function: this.sendRejectRequest.bind(this),
        currStatus: ['REGISTERED']
        },
      {
        text: 'Suspend access',
        parameters: [
          this.allMemberdata.status[3],
          this.allMemberdata.subscriptiondata.id,
          this.allMemberdata.subscriptiondata.noOfFreeLicense,
        ],
        function: this.sendLeaveOrSuspandRequest.bind(this),
        currStatus: ['EXTERNAL','ACTIVE']
        },
        {
          text: 'Approve external access',
          parameters: [
            this.allMemberdata.status[5],
            this.allMemberdata.subscriptiondata.id,
            this.allMemberdata.subscriptiondata.noOfFreeLicense,
          ],
          function: this.sendLeaveOrSuspandRequest.bind(this),
          currStatus: ['REJECTED','SUSPENDED','LEAVED','REGISTERED','ACTIVE']
          },
        {
          text: 'Mark as leaver',
          parameters: [
            this.allMemberdata.status[2],
            this.allMemberdata.subscriptiondata.id,
            this.allMemberdata.subscriptiondata.noOfFreeLicense,
          ],
          function: this.sendLeaveOrSuspandRequest.bind(this),
          currStatus: ['ACTIVE']
          },

    ];

    return actions.filter(a=>a.currStatus.includes(data.status) && (!a.role || a.role.includes(data.role)));
  }

  //--------------------------run user dropdown list action ------------
  onClickActionFunction(action, status,uid,picUrl,email){
    action.function(...action.parameters,status,uid,picUrl,email);
  }
  //-----------------------show or remove search input------------
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
  changePlan() {
    this.router.navigate(["/plans/update"]);
  }
  //----------------------profile image setting----------
  profileImgErrorHandler(user: any) {
    user.picUrl = "../../../../../assets/image/imgs/profile.png";
  }

  //-------------------show network issue-------------
  showNetworkIssue() {
    this.sl.showAlert(
      "error",
      "Your network is too poor or your in offline.Please check your internet connection",
      "Poor Network"
    );
    return false;
  }
  // =========Start Get Subcription Details Method=======================
  getSubcriptionDetails(subcriptionId) {
    const self = this;
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        let a = JSON.parse(this.responseText);
        console.log(this.responseText);
        self.currPlanActiveOrNot = a.status === "ACTIVE" ? true : false;
      }
    };

    xhttp.open("GET", environment.paypalBillingUrl + subcriptionId, true);
    xhttp.setRequestHeader("Authorization", this.basicAuth);

    xhttp.send();
  }
  getSubcriptionDetailsCancel(subcriptionId) {
    //console.log("subcriptionId old", subcriptionId);
    const self = this;
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 204) {
        self.getSubcriptionDetails(subcriptionId);
        return true;
      }
    };

    xhttp.open(
      "POST",
      environment.paypalBillingUrl + subcriptionId + "/cancel",
      true
    );
    xhttp.setRequestHeader("Authorization", this.basicAuth);
    xhttp.setRequestHeader("Content-Type", "Application/json");

    xhttp.send();
  }
  // ============END Get Subcription Details Method========================
}
