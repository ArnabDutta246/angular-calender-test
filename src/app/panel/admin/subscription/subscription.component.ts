import {
  Component,
  OnInit,
  AfterViewInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
} from "@angular/core";
import { AllMembersDataService } from "src/app/shared/all-members-data.service";
import { Router } from "@angular/router";
import { UserLoginService } from "src/app/shared/user-login.service";
import { CountryCode } from "../../../extra/country-code";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
//import SimpleCrypto from "simple-crypto-js";
import { environment } from "src/environments/environment";
import { sKey } from "src/app/extra/sKey";
import { ConnectionService } from "ng-connection-service";
import * as CryptoJS from "crypto-js";
@Component({
  selector: "app-subscription",
  templateUrl: "./subscription.component.html",
  styleUrls: ["./subscription.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class SubscriptionComponent implements OnInit, AfterViewInit {
  orgForm: FormGroup;
  subscriptionData: any;
  Cd: any = CountryCode;
  dialCode = CountryCode[0].Dial;

  submitted = false;
  getUserData: any;
  //-----------check online/offline
  status = "ONLINE"; //initializing as online by default
  isConnected = true;
  constructor(
    private allMemberData: AllMembersDataService,
    private router: Router,
    private loginService: UserLoginService,
    private formBuilder: FormBuilder,
    private sl: SweetAlertService,
    private allCol: AllCollectionsService,
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
    this.fetchOrgData();
    //----------------
    //-->initialize form group
    let emailRegex = /^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$/;
    this.orgForm = this.formBuilder.group(
      {
        subscriberOrgName: ["", [Validators.required, Validators.minLength(3)]],
        subscriberEmail: [
          "",
          [
            Validators.required,
            Validators.email,
            Validators.pattern(emailRegex),
          ],
        ],
        subscriberCtc: ["", Validators.required],
        subscriberPhone: [
          "",
          [Validators.required, Validators.pattern(/^[0-9]*$/)],
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
  }
  ngAfterViewInit() {
    this.hideTabButton();
  }
  //-------------------show network issue-------------
  showNetworkIssue() {
    this.sl.showAlert(
      "error",
      "Your network is too poor or you are in offline.Please check your internet connection",
      "Poor Network"
    );
    return false;
  }
  hideTabButton() {
    let cancelHide = document.getElementById("home-tab");
    cancelHide.style.display = "none";
  }
  fetchOrgData(reCall?: boolean) {
    this.allMemberData
      .getSubscriptionData(this.getUserData.subscriberId)
      .then((val) => {
        this.subscriptionData = val;
        console.log(this.subscriptionData);
        if (reCall === true) this.setValue();
      });
  }
  get f() {
    return this.orgForm.controls;
  }
  changePlan() {
    this.status === "ONLINE"
      ? this.router.navigate(["/update-plan"])
      : this.showNetworkIssue();
  }
  //------------------- set phone number----------------
  format_phone_no(data) {
    var phone_array = data.split(" ");
    var country_code = phone_array[0].split("@");
    return country_code[1] + " " + phone_array[1];
  }
  //----------------
  // change country and dial code
  changeCountry(e) {
    console.log(e.target.value);
    this.Cd.find((item) => {
      if (item.Iso2 == e.target.value) {
        this.dialCode = `${item.Iso2}@+${item.Dial} `;
      }
    });
  }
  //-----------
  lockCancelButton() {
    let cancelHide = document.getElementById("home-tab");
    let editHide = document.getElementById("nav-profile-tab");
    cancelHide.style.display = "block";
    editHide.style.display = "none";
    this.setValue();
  }
  lockEditButton() {
    let cancelHide = document.getElementById("home-tab");
    let editHide = document.getElementById("nav-profile-tab");
    cancelHide.style.display = "none";
    editHide.style.display = "block";
  }
  setValue() {
    this.Cd.find((n) => {
      if (n.Iso2 == this.subscriptionData.country) {
        var phone_array = this.subscriptionData.phoneNo.split(" ");
        var country_code = phone_array[0].split("@");
        //return country_code[1] + " " + phone_array[1];
        this.dialCode = phone_array[0];
      }
    });
    this.orgForm.patchValue({
      subscriberOrgName: this.subscriptionData.companyName,
      subscriberEmail: this.subscriptionData.email,
      subscriberCtc: this.subscriptionData.country,
      subscriberPhone: this.subscriptionData.phoneNo
        .replace(`${this.dialCode} `, "")
        .trim(),
    });

    console.log(this.orgForm.value);
  }
  onSubmit() {
    this.submitted = true;
    if (this.orgForm.invalid) {
      console.log("Error occured");
    } else {
      this.status === "ONLINE"
        ? this.sl
            .showAlertReturnType(
              "Organization name:" +
                this.orgForm.get("subscriberOrgName").value +
                "\n" +
                "Email: " +
                this.orgForm.get("subscriberEmail").value +
                "\n" +
                "Country: " +
                this.orgForm.get("subscriberCtc").value +
                "\n" +
                "Phone:" +
                this.orgForm.get("subscriberPhone").value,
              "Do you want to change this data?"
            )
            .then((res) => {
              if (res) {
                this.updateOrgData(this.orgForm.value);
              }
            })
        : this.showNetworkIssue();
    }
  }
  updateOrgData(frm) {
    this.allCol
      .getSubscriberCollection()
      .doc(`${this.getUserData.subscriberId}`)
      .update({
        companyName: frm.subscriberOrgName,
        email: frm.subscriberEmail,
        country: frm.subscriberCtc,
        phoneNo: `${this.dialCode} ${frm.subscriberPhone}`,
      })
      .then((res) => {
        this.submitted = false;
        this.sl.showAlert("success", "Data successfully updated");
        this.fetchOrgData(true);
        // this.orgForm.patchValue({

        // });
      })
      .catch((err) => console.log(err));
  }
}
