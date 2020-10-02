import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
//import SimpleCrypto from "simple-crypto-js";
import * as CryptoJS from "crypto-js";
import { sKey } from "src/app/extra/sKey";
import { NgxImageCompressService } from "ngx-image-compress";
import { AngularFireStorage } from "@angular/fire/storage";
import { finalize, count, take, map } from "rxjs/operators";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import * as firebase from "firebase/app";
import { UserLoginService } from "src/app/shared/user-login.service";
import { CountryCode } from "../../../extra/country-code";
import { NgxSpinnerService } from "ngx-spinner";
import { interval } from "rxjs";
import { CustomValidator } from "src/app/extra/customValidation";
import { AngularFireAuth } from "@angular/fire/auth";

@Component({
  selector: "app-user-profile",
  templateUrl: "./user-profile.component.html",
  styleUrls: ["./user-profile.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class UserProfileComponent implements OnInit {
  currentUser: any = null;
  getUserData: any;
  registerForm: FormGroup;
  dialCode: any;
  Cd: any = CountryCode;

  imgResultBeforeCompress: string;
  imgResultAfterCompress: string;
  sizeB: any;
  sizeA: any;
  downloadURL: any;

  isProcessing: any;

  //password
  changePass: boolean = false;
  checkPassword: string;
  alert: boolean;
  passshow: boolean = false;
  passshowT: boolean = false;
  passwordStrength: number;
  constructor(
    private afs: AngularFirestore,
    private allCol: AllCollectionsService,
    private sl: SweetAlertService,
    private imageCompress: NgxImageCompressService,
    private storage: AngularFireStorage,
    public loginService: UserLoginService,
    private formBuilder: FormBuilder,
    private afAuth: AngularFireAuth,
    private spinner: NgxSpinnerService
  ) {
    //decrytion of session data
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // console.log(simpleCrypto.decryptObject(data));
    // const obj: any = simpleCrypto.decryptObject(data);
    // const obj: any = this.loginService.returnSessionData();
    // this.getUserData = obj;
    const data = sessionStorage.getItem("user");
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    let getUserData = decryptedData;
    this.getUserData = getUserData;
  }

  ngOnInit() {
    //get user current data
    let currentUser = this.getUserData;
    //-----------get curr user data--------------
    let docUid = currentUser.uid + "_" + currentUser.subscriberId;
    let currD$ = this.afs
      .collection(this.allCol.users)
      .doc(docUid)
      .snapshotChanges();
    currD$
      .pipe(
        map((a) => {
          const dataa = a.payload.data();
          return dataa;
        })
      )
      .subscribe((res) => {
        this.currentUser = res;
      });
    //--------------------
    //form builder & validation
    let namePattern = /^([a-zA-Z]+[,.]?[ ]?|[a-zA-Z]+['-]?)+$/;
    let phoneNoPattern = /^[0-9]*$/;
    let passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
    this.registerForm = this.formBuilder.group(
      {
        subscriberName: [
          "",
          [Validators.required, Validators.pattern(namePattern)],
        ],
        subscriberJobTitle: ["", Validators.required],
        subscriberCtc: [null, Validators.required],
        subscriberPhone: [
          "",
          [Validators.required, Validators.pattern(phoneNoPattern)],
        ],
        oldPassword: ["", [Validators.required]],
        password: [
          "",
          [Validators.minLength(8), Validators.pattern(passwordPattern)],
        ],
        confirmPassword: [""],
      },
      {
        validator: [
          CustomValidator.validatePass("password", "confirmPassword"),
        ],
      }
    );
    this.setValue();
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
  get f() {
    return this.registerForm.controls;
  }
  setValue() {
    var phone_array = this.getUserData.phone.split(" ");
    var country_code = phone_array[0].split("@");
    //return country_code[1] + " " + phone_array[1];
    this.dialCode = phone_array[0];
    console.log("the dialcode", this.dialCode);
    this.registerForm.patchValue({
      subscriberName: this.getUserData.name,
      subscriberCtc: country_code[0],
      subscriberJobTitle: this.getUserData.jobTitle,
      subscriberPhone: this.getUserData.phone
        .replace(`${this.dialCode} `, "")
        .trim(),
      oldPassword: "",
      password: "",
      confirmPassword: "",
    });

    //console.log(this.registerForm.value);
  }
  onSubmit() {
    //------------timer check internet--------------------
    this.isProcessing = true;
    this.startCounting();
    //------------timer check internet--------------------
    this.spinner.show();
    if (this.registerForm.invalid) {
      console.log("Error occured");
      console.log(this.registerForm.value);
      this.spinner.hide();
    } else {
      let frm = this.registerForm.value;
      var user = this.afAuth.auth.currentUser;
      var oldPass = frm.oldPassword;
      var newPass = frm.password;
      // alert("old pass " + oldPass);
      var credential = firebase.auth.EmailAuthProvider.credential(
        this.currentUser.email,
        oldPass
      );
      user
        .reauthenticateWithCredential(credential)
        .then(() => {
          this.afs
            .collection(this.allCol.users)
            .doc(this.getUserData.uid + "_" + this.getUserData.subscriberId)
            .update({
              name: frm.subscriberName,
              phone: this.dialCode + " " + frm.subscriberPhone,
              jobTitle: frm.subscriberJobTitle,
              lastProfileUpdateAt: new Date(),
            })
            .then(() => {
              if (
                this.changePass &&
                newPass !== "" &&
                newPass === frm.confirmPassword
              ) {
                user.updatePassword(newPass).catch((error) => {
                  // An error happened.
                  console.log("Error while updating password", error);

                  this.sl.showAlert(
                    "error",
                    "Password change failed. Please try again.",
                    "Alert"
                  );
                });
              }
              if (this.changePass === true) this.changePassToggle();
              this.sl.showAlert(
                "success",
                "Data updated successfully",
                "Updated"
              );
              this.storeInLocalStorage(true);
              //this.registerForm.reset();
              this.setValue();
              this.spinner.hide();
              this.isProcessing = false; // stop for internet checking counter
            })
            .catch((err) => {
              // console.log(err);
              this.spinner.hide();
              this.isProcessing = false;
              this.sl.showAlert("error", err);
            });
        })
        .catch((error) => {
          // An error happened.
          console.log(error);
          this.spinner.hide();
          this.isProcessing = false;
          this.sl.showAlert(
            "error",
            "Unable to authenticate to update details. Please check the password entered and try again.",
            "Authentication Failure"
          );
        });
    }
  }
  //-----------------------caching pro image ----------------------
  profileImgErrorHandler(user: any) {
    user.picUrl = "../../../../../assets/image/imgs/profile.png";
  }

  //----------------------image compress-----------------------------

  compressFile() {
    this.imageCompress.uploadFile().then(({ image, orientation }) => {
      this.imgResultBeforeCompress = image;
      //console.warn("Size in bytes was:", this.imageCompress.byteCount(image));
      this.sizeB = this.imageCompress.byteCount(image);
      console.log("image size before compress :", this.sizeB < 150.0);
      this.imageCompress
        .compressFile(image, orientation, 35, 35)
        .then((result) => {
          this.spinner.show();
          //------------------time to check network------------
          this.isProcessing = true;
          this.startCounting();
          //------------------time to check network------------
          this.imgResultAfterCompress = result;
          this.sizeA = this.imageCompress.byteCount(result);
          console.log("image size after compress :", this.sizeA);
          let file =
            this.sizeB > 256000
              ? this.imgResultAfterCompress
              : this.imgResultBeforeCompress;
          this.uploadFileStorage(file);
        });
    });
  }
  uploadFileStorage(file) {
    const filename = this.getUserData.uid + "_" + this.getUserData.subscriberId;
    let storageRef = firebase.storage().ref();
    const imageRef = storageRef.child(`profile_images/${filename}.jpg`);

    imageRef
      .putString(file, firebase.storage.StringFormat.DATA_URL)
      .then((snapshot) =>
        snapshot.ref.getDownloadURL().then((downloadURL) => {
          this.downloadURL = downloadURL;
          this.afs
            .collection(this.allCol.users)
            .doc(this.getUserData.uid + "_" + this.getUserData.subscriberId)
            .update({
              picUrl: this.downloadURL,
              lastProfileUpdateAt: new Date(),
            });
          sessionStorage.clear();
          this.storeInLocalStorage(false);
          this.spinner.hide();
          this.isProcessing = false; // closing time function
        })
      );
  }
  //------------------ store data in localstorage --------------------
  storeInLocalStorage(toggle: boolean = false) {
    if (toggle === false) {
      this.getUserData.picUrl = this.downloadURL;
    } else {
      this.getUserData.name = this.registerForm.value.subscriberName;
      this.getUserData.jobTitle = this.registerForm.value.subscriberJobTitle;
      this.getUserData.phone =
        this.dialCode + " " + this.registerForm.value.subscriberPhone;
      this.registerForm.reset();
    }
    var ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(this.getUserData),
      sKey
    ).toString();
    sessionStorage.setItem("user", ciphertext);
    // var simpleCrypto = new SimpleCrypto(sKey);
    // const encrypt = simpleCrypto.encryptObject(this.getUserData);
    // sessionStorage.setItem("user", encrypt);
  }

  /**
   * timer
   * observables pipe for chack
   * hide already active loader
   */
  startCounting() {
    const numbers = interval(1000);
    const takeFourNumbers = numbers.pipe(take(10));
    takeFourNumbers.subscribe((x) => {
      console.log("Next: ", x);
      if (this.isProcessing === true && x >= 9) {
        this.spinner.hide();
        this.sl.showAlert(
          "error",
          "Your network is poor.Please check your internet connection.",
          "Network Problem"
        );
        this.isProcessing = false;
      }
    });
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
  //-------------------
  changePassToggle() {
    this.changePass = this.changePass ? false : true;
    if (this.changePass === false) {
      this.registerForm.patchValue({
        password: "",
        confirmPassword: "",
      });
      this.passwordStrength = 0;
    }
  }
}
