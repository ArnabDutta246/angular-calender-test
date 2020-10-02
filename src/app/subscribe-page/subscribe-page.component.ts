import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CountryCode } from "../extra/country-code";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { CustomValidator } from "../extra/customValidation";
import { AngularFirestore } from "@angular/fire/firestore";
import { SubscribeService } from "../shared/subscribe.service";
import { ToastrService } from "ngx-toastr";
import { AllCollectionsService } from "../shared/all-collections.service";
@Component({
  selector: "app-subscribe-page",
  templateUrl: "./subscribe-page.component.html",
  styleUrls: ["./subscribe-page.component.scss"],
})
export class SubscribePageComponent implements OnInit {
  //--------------------- open model -------------------------
  @ViewChild("content", { static: true }) content: ElementRef;
  //--------------------- all variable ----------------------
  plan: any;
  count: 0;
  Cd: any = CountryCode;
  dialCode = CountryCode[0].Dial;
  submitted = false;
  subscriptionForm: FormGroup;
  alert: string = "choose";
  authError: any;
  open = false;
  repassword = "";
  passshow: boolean = false;
  passshowT: boolean = false;
  passwordStrength: number;
  //user/org navigation
  navigateArray = ["user sign up", "organisation sign up"];
  navigatePage = this.navigateArray[1];
  termLink: string;
  //---------------------constructor --------------------------
  constructor(
    private allCol: AllCollectionsService,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private afs: AngularFirestore,
    private subscribeService: SubscribeService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.subscribeService.getLatestTermsCondition().then(
      function (res) {
        this.termLink = res.tncLink;
      }.bind(this)
    );
    //--------------------
    //form builder & validation
    let sid = /^(?=.*[A-Z])([a-zA-Z0-9]{5,10})$/;
    let emailRegex =
      "^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$";
    let namePattern = /^([a-zA-Z]+[,.]?[ ]?|[a-zA-Z]+['-]?)+$/;
    this.subscriptionForm = this.formBuilder.group(
      {
        subscriptionID: [
          "",
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(10),
            Validators.pattern(sid),
          ],
        ],
        subscriberName: [
          "",
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(20),
            Validators.pattern(namePattern),
          ],
        ],
        subscriberOrgName: ["", [Validators.required, Validators.minLength(3)]],
        subscriberEmail: [
          "",
          [
            Validators.required,
            Validators.email,
            Validators.pattern(emailRegex),
          ],
        ],
        subscriberCtc: [null, Validators.required],
        subscriberPhone: [
          "",
          [Validators.required, Validators.pattern("^[0-9]*$")],
        ],
        // subscriptionType: [this.plan.planName, Validators.required],
        // noOfUserAllowed: [this.minLicense, Validators.required],
        password: [
          "",
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/
            ),
          ],
        ],
        confirmPassword: ["", Validators.required],
        termAndCondition: [false, Validators.requiredTrue],
      },
      {
        validator: [
          CustomValidator.validatePass("password", "confirmPassword"),
        ],
      }
    );

    //-------------------- authenticated email --------------------
    this.subscribeService.eventAuthError$.subscribe((data) => {
      this.authError = data;
    });
  }
  //--------------------- subscriptionID check (key up )--------------
  checkSID(e) {
    this.alert = "";
    let cap = e.target.value;
    e.target.value = cap.toUpperCase().replace(" ", "");
    const rgx = /^[A-Z]*[A-Z]{2,3}[A-Z0-9]*[0-9]$/g;
    if (rgx.test(e.target.value)) {
      this.afs
        .doc(this.allCol.subscribers + "/" + e.target.value)
        .get()
        .toPromise()
        .then((val) => {
          this.alert = val.exists
            ? "exist"
            : this.f.subscriptionID.valid
            ? "notexist"
            : "";
        });
      //console.log(e.target.value);
    } else {
      this.alert = "choose";
      //console.log(e.target.value);
    }
  }
  //---------------- change country and dial code --------------
  changeCountry(e) {
    console.log(e.target.value);
    this.Cd.find((item) => {
      if (item.Iso2 == e.target.value) {
        this.dialCode = `${item.Iso2}@+${item.Dial} `;
      }
    });
  }

  //---------------- get form data ------------------------
  get f() {
    return this.subscriptionForm.controls;
  }

  //----------- form submit full ssubscibers data -------------
  /*
  1. all submitted data valid
  2. if in email auth table re-enter modal open
  */
  //------------------------------------------------------------
  onSubmit() {
    this.submitted = true;
    if (this.subscriptionForm.invalid) {
      console.log("error");
      console.log(this.subscriptionForm.value);
    } else {
      let frm = this.subscriptionForm.value;
      this.subscribeService
        .createUser(frm, this.dialCode)
        .then((res) => {
          console.log(res);
          if (res === false) {
            console.log("User Already In Auth Table");
            this.content.nativeElement.click();
          }
        })
        .catch((err) => console.log(err));
    }
  }
  //------------------------- sign in process-----------------
  onSignIn() {
    let frm = this.subscriptionForm.value;
    this.subscribeService
      .signIn(frm, this.repassword)
      .then((res) => {
        this.repassword = "";
        console.log(res);
      })
      .catch((err) => {
        this.repassword = "";
        console.log(err);
      });
  }

  //------------------------- password hide/show -----------------
  passShow() {
    this.passshow = this.passshow === true ? false : true;
  }
  passShowT() {
    this.passshowT = this.passshowT === true ? false : true;
  }
  //-------------------------password strength decide----------
  paswStrength(e) {
    this.passwordStrength = 0;
    let strings = e.target.value;
    // uppercase check
    let upperCaseMatch = /[A-Z]/g;
    if (strings.match(upperCaseMatch)) {
      this.passwordStrength += 20;
    }
    // lowercase check
    let lowerCaseMatch = /[a-z]/g;
    if (strings.match(lowerCaseMatch)) {
      this.passwordStrength += 20;
    }
    // length check
    if (strings.length >= 8) {
      this.passwordStrength += 20;
    }
    // number check
    let numberCheck = /[0-9]/g;
    if (strings.match(numberCheck)) {
      this.passwordStrength += 20;
    }
    // special chrecter check
    let specilCharCheck = /[!@#$%^&*(),.?":{}|<>]/g;
    if (strings.match(specilCharCheck)) {
      this.passwordStrength += 20;
    }
  }
  //----------------------change navigate------------
  changeNavigate() {
    this.router.navigate(["/register"]);
  }
}
