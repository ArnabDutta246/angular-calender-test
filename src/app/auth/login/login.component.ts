import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { UserLoginService } from "src/app/shared/user-login.service";
import { AngularFirestore } from "@angular/fire/firestore";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  submitted: boolean = false;
  resetsubmitted: boolean = false;
  recoverPwd: boolean = false;
  alert: string = "choose";
  resetPassForm: FormGroup;
  passshow: boolean = false;
  constructor(
    private formBuilder: FormBuilder,
    private loginService: UserLoginService,
    private afs: AngularFirestore,
    private sl: SweetAlertService
  ) {}

  ngOnInit() {
    //--------------------
    //form builder & validation
    //^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$
    let emailRegex =
      "^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$";
    this.loginForm = this.formBuilder.group({
      subscriptionID: ["", [Validators.required]],
      subscriberEmail: [
        "",
        [Validators.required, Validators.email, Validators.pattern(emailRegex)],
      ],
      password: ["", [Validators.required]],
    });

    this.resetPassForm = this.formBuilder.group({
      emailAdd: [
        "",
        [Validators.required, Validators.email, Validators.pattern(emailRegex)],
      ],
    });
  }

  //------------
  // get form data
  get f() {
    return this.loginForm.controls;
  }
  get ff() {
    return this.resetPassForm.controls;
  }
  checkSID(e) {
    let sid = e.target.value;
    e.target.value = sid.toUpperCase().replace(" ", "");
  }
  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      console.log("Error occured");
      console.log(this.loginForm.value);
    } else {
      this.loginService.signIn(this.loginForm.value);
      console.log(this.loginForm.value);
    }
  }
  resetPassword() {
    this.resetsubmitted = true;
    // if (!this.resetPassForm.get("emailAdd").value) {
    //   this.sl.showAlert("error", "Type in your email first", "Error");
    // }
    if(this.resetPassForm.invalid){
      // Nothing to be checked
    } else {
      this.loginService
        .resetPasswordInit(this.resetPassForm.get("emailAdd").value)
        .then(() =>{
            this.sl.showAlert(
              "info",
              "A password reset link has been sent to your email address"
            );
            this.resetPassForm.patchValue({
                    emailAdd: '',
                  });
            this.recoverPwd = false;
            this.resetsubmitted = false;
            this.submitted = false;
          }
        )
        .catch((e) =>
          this.sl.showAlert(
            "error",
            "An error occurred while attempting to reset your password",
            "Error"
          )
        );
    }
  }
  passShow() {
    console.log(this.passshow);
    if (this.passshow) {
      this.passshow = false;
    } else {
      this.passshow = true;
    }
  }
}
