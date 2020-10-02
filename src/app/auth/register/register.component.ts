import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { CustomValidator } from "../../extra/customValidation";
import { UserRegisterService } from "src/app/shared/user-register.service";
import { AngularFirestore } from "@angular/fire/firestore";
import { ToastrService } from "ngx-toastr";
import { CountryCode } from "../../extra/country-code";
import { Router } from "@angular/router";
@Component({
  selector: "app-register",
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class RegisterComponent implements OnInit {
  //--------------------  open model ----------------
  @ViewChild("content", { static: true }) content: ElementRef;

  //-------------------------all variable -----
  registerForm: FormGroup;
  submitted = false;
  authError: any;
  repassword = "";
  Cd: any = CountryCode;
  dialCode = CountryCode[0].Dial;
  checkPassword: string;
  alert: boolean;
  passshow: boolean = false;
  passshowT: boolean = false;
  passwordStrength: number;

  //user/org navigation
  navigateArray = ["user sign up", "organisation sign up"];
  navigatePage = this.navigateArray[0];
  constructor(
    private formBuilder: FormBuilder,
    private userResService: UserRegisterService,
    private afs: AngularFirestore,
    private toastr: ToastrService,
    private route: Router
  ) {}

  ngOnInit() {
    //----------------- authenticated email------------------
    this.userResService.eventAuthError$.subscribe((data) => {
      this.authError = data;
    });
    //-------------------- form builder & validation--------------
    let sid = /^(?=.*[A-Z])([a-zA-Z0-9]{5,13})$/;
    let emailRegex =
      "^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$";
    let namePattern = /^([a-zA-Z]+[,.]?[ ]?|[a-zA-Z]+['-]?)+$/;
    this.registerForm = this.formBuilder.group(
      {
        subscriptionID: ["", [Validators.required, Validators.pattern(sid)]],
        subscriberName: [
          "",
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(20),
            Validators.pattern(namePattern),
          ],
        ],
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
      },
      {
        validator: [
          CustomValidator.validatePass("password", "confirmPassword"),
        ],
      }
    );
    //------------- popup model if email exist in db auth table ------------
    if (this.userResService.popup == true) {
      this.content.nativeElement.click();
    }
  }

  //------------
  // get form data
  get f() {
    return this.registerForm.controls;
  }
  //------------------- change SID to uppercase ----------------
  checkSID(e) {
    let cap = e.target.value;
    e.target.value = cap.toUpperCase().replace(" ", "");
  }
  //------------------- check password/confirm password ----------------
  checkPass(pass, cpass) {
    let password = this.registerForm.get("password").value;
    let cPass = this.registerForm.get("confirmPassword").value;
    console.log(password);

    console.log(cPass);
    if (password !== "") {
      if (password === cPass) {
        this.alert = true;
        this.checkPassword = "Matched";
        console.log("matched");
      } else {
        this.alert = false;
        this.checkPassword = "Not Matched";
        console.log("Not Matched");
      }
    } else {
      this.alert = false;
      this.checkPassword = "Password field is empty";
    }
  }
  //------------------- submit the registration data ----------------
  onSubmit() {
    this.submitted = true;
    if (this.registerForm.invalid) {
      console.log("Error occured");
    } else {
      console.log("Success");
      console.log(this.registerForm.value);
      this.userResService
        .createUser(this.registerForm.value, this.dialCode)
        .then((res) => {
          console.log(res);
          if (res == false) {
            this.content.nativeElement.click();
          }
        });
    }
  }
  //------------------- change country and dial code ----------------

  changeCountry(e) {
    console.log(e.target.value);
    this.Cd.find((item) => {
      if (item.Iso2 == e.target.value) {
        this.dialCode = `${item.Iso2}@+${item.Dial} `;
      }
    });
  }
  //------------------submit data for sign in-------------------------
  onSignIn() {
    if (this.repassword !== "") {
      this.userResService
        .signIn(this.registerForm.value, this.repassword, this.dialCode)
        .then((res) => {
          this.repassword = "";
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
  //------------------reset password-------------------------
  resetPassword() {
    if (!this.registerForm.get("subscriberEmail").value) {
      this.toastr.error("Type in your email first", "error");
    }
    this.userResService
      .resetPasswordInit()
      .then(() =>
        this.toastr.info(
          "A password reset link has been sent to your emailaddress",
          "Info"
        )
      )
      .catch((e) =>
        this.toastr.error(
          "An error occurred while attempting to resetyour password",
          "Error"
        )
      );
  }
  //------------------Show And Hide password-------------------------
  passShow() {
    this.passshow = this.passshow === true ? false : true;
  }
  passShowT() {
    this.passshowT = this.passshowT === true ? false : true;
  }
  //------------------password strength decide-------------------------
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
    this.route.navigate(["/subscribe"]);
  }
}
