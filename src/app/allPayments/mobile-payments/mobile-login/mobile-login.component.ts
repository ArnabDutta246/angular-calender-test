import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { AngularFirestore } from "@angular/fire/firestore";
import { UserLoginService } from "src/app/shared/user-login.service";
@Component({
  selector: "app-mobile-login",
  templateUrl: "./mobile-login.component.html",
  styleUrls: ["./mobile-login.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class MobileLoginComponent implements OnInit {
  loginForm: FormGroup;
  submitted: boolean = false;
  alert: string = "choose";
  passshow: boolean = false;
  constructor(
    private formBuilder: FormBuilder,
    private loginService: UserLoginService,
    private afs: AngularFirestore
  ) {}

  ngOnInit() {
    //--------------------
    //form builder & validation
    let emailRegex =
      "^[a-z0-9]+(.[_a-z0-9]+)*@[a-z0-9-]+(.[a-z0-9-]+)*(.[a-z]{2,15})$";
    let name = "[a-zA-z]*ws*";
    this.loginForm = this.formBuilder.group({
      subscriptionID: [
        "",
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(10),
          Validators.pattern(/^[A-Z]{2,3}[A-Z0-9]*[0-9]$/),
        ],
      ],
      subscriberEmail: [
        "",
        [Validators.required, Validators.email, Validators.pattern(emailRegex)],
      ],
      password: ["", [Validators.required]],
    });
  }

  //------------
  // get form data
  get f() {
    return this.loginForm.controls;
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
      this.loginService.signInMobile(this.loginForm.value);
      console.log(this.loginForm.value);
    }
  }
  passShow() {
    this.passshow = this.passshow === true ? false : true;
  }
}
