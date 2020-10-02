import { Component, OnInit, OnDestroy } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { CustomValidator } from "src/app/extra/customValidation";
import { ActivatedRoute, Router } from "@angular/router";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";
import { AngularFireAuth } from "@angular/fire/auth";
import { ToastrService } from "ngx-toastr";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
@Component({
  selector: "app-reset-password",
  templateUrl: "./reset-password.component.html",
  styleUrls: ["./reset-password.component.scss"],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm: FormGroup;
  submitted: boolean = false;
  actionCodeChecked: boolean;
  ngUnsubscribe: Subject<any> = new Subject<any>();
  //mood----
  mode: string;
  actionCode: string;

  constructor(
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private afAuth: AngularFireAuth,
    private toastr: ToastrService,
    private sl: SweetAlertService
  ) {}

  ngOnInit() {
    this.resetPasswordForm = this.formBuilder.group(
      {
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
        confirmPassword: [
          "",
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/
            ),
          ],
        ],
      },
      {
        validator: [
          CustomValidator.validatePass("password", "confirmPassword"),
        ],
      }
    );

    //-----
    //check query params
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((params) => {
        if (!params) {
          this.router.navigate(["/login"]);
        }

        this.mode = params["mode"];
        this.actionCode = params["oobCode"];

        if (this.mode === "resetPassword") {
          this.afAuth.auth
            .verifyPasswordResetCode(this.actionCode)
            .then((email) => {
              this.actionCodeChecked = true;
            })
            .catch((e) => {
              //this.toastr.error(e, "Error");
              this.sl.showAlert("error", e, "Error Occured");
              this.router.navigate(["/login"]);
            });
        }
      });
  }
  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
  //------------
  // get form data
  get f() {
    return this.resetPasswordForm.controls;
  }

  //------
  //onSubmit function
  onSubmit() {
    this.submitted = true;
    if (this.resetPasswordForm.invalid) {
      this.toastr.error("Some field is not field properly", "Error");
    } else {
      // Save the new password.
      this.afAuth.auth
        .confirmPasswordReset(
          this.actionCode,
          this.resetPasswordForm.get("password").value
        )
        .then((resp) => {
          this.toastr.success("New password has been saved", "Success");
          this.router.navigate(["/login"]);
        })
        .catch((e) => {
          //this.toastr.error(e, "Error");
          this.sl.showAlert("error", e, "Error Occured");
        });
    }
  }
}
