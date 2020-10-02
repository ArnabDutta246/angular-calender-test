import { Injectable, OnInit } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { ToastrService } from "ngx-toastr";
import { NgxSpinnerService } from "ngx-spinner";
import { Router } from "@angular/router";
import { SweetAlertService } from "./sweet-alert.service";
import { AllCollectionsService } from "./all-collections.service";
import { BehaviorSubject } from "rxjs";
import { environment } from "../../environments/environment.prod";
//import SimpleCrypto from "simple-crypto-js";
import { sKey } from "../extra/sKey";
import { AllErrorMsgService } from "./all-error-msg.service";
import { SubscribeService } from "./subscribe.service";
import * as CryptoJS from "crypto-js";
class MobileLoginModel {
  subscriptionID: string;
  subscriberEmail: string;
  password: any;
}
@Injectable({
  providedIn: "root",
})
export class UserLoginService {
  public newUser: any;
  public currentuser: any;
  //-----------will delivered to all page-----------
  public subsData: any;
  public subsDataId: any;
  //----------------------
  public user: any;
  public userData: any;
  //......
  //declar user is logged in now
  public isLogged = new BehaviorSubject<boolean>(false);
  public isLogged$ = this.isLogged.asObservable();
  public isAdminLogged = new BehaviorSubject<boolean>(false);
  public isAdminLogged$ = this.isAdminLogged.asObservable();
  public isPayUpgrade = new BehaviorSubject<boolean>(false);
  public isPayUpgrade$ = this.isPayUpgrade.asObservable();
  public checkPayActive: any;
  private basicAuth = environment.paypalBasicUrl; //Pass your ClientId + scret key
  tncData: any;
  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private sl: SweetAlertService,
    private allCol: AllCollectionsService,
    private allErrMsg: AllErrorMsgService
  ) {
    this.getLatestTermsCondition();
  }
  //------------------ return stored data ----------------------
  async returnSessionDataCommon() {
    // return new Promise((res, rej) => {
    if (sessionStorage.getItem("user") !== null) {
      //-->decrytion of session data
      // const data = sessionStorage.getItem("user");
      // const simpleCrypto = new SimpleCrypto(sKey);
      // const obj: any = simpleCrypto.decrypt(data);
      // let getUserData = obj;
      const data = sessionStorage.getItem("user");
      var bytes = CryptoJS.AES.decrypt(data, sKey);
      var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      let getUserData = decryptedData;
      return getUserData;
    }
    // });
  }
  returnSessionData() {
    // return new Promise((res, rej) => {
    if (sessionStorage.getItem("user") !== null) {
      //-->decrytion of session data
      // const data = sessionStorage.getItem("user");
      // const simpleCrypto = new SimpleCrypto(sKey);
      // const obj: any = simpleCrypto.decrypt(data);
      // let getUserData = obj;
      const data = sessionStorage.getItem("user");
      var bytes = CryptoJS.AES.decrypt(data, sKey);
      var decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      let getUserData = decryptedData;
      return getUserData;
    }
    // });
  }
  //-------------------auth guard for all org admin-------------
  isAd() {
    let resolve;
    return new Promise((result, rej) => {
      if (sessionStorage.getItem("user") !== null) {
        let getUserData = JSON.parse(this.returnSessionData());
        if (
          getUserData.uid !== null &&
          getUserData.subscriptionExpire === true
        ) {
          let check = getUserData.role === "ADMIN" ? true : false;
          this.isAdminLogged.next(check);
          this.subsDataId = getUserData.subscriberId;
          result(check);
        } else {
          result(false);
        }
      } else {
        this.isAdminLogged.next(false);
        sessionStorage.clear();
        result(false);
      }
      // });
    });
  }
  //------------------ auth guard for super admin --------------
  isSuperAd() {
    let resolve;
    return new Promise((result, rej) => {
      if (sessionStorage.getItem("user") !== null) {
        let getUserData = JSON.parse(this.returnSessionData());
        if (
          getUserData.uid !== null &&
          getUserData.subscriptionExpire === true
        ) {
          let check =
            getUserData.role === "ADMIN" &&
            getUserData.subscriberId === "APPSOLZONE001"
              ? true
              : false;
          this.isAdminLogged.next(check);
          this.subsDataId = getUserData.subscriberId;
          result(check);
        } else {
          result(false);
        }
      } else {
        this.isAdminLogged.next(false);
        sessionStorage.clear();
        result(false);
      }
    });
  }
  //-------------------auth guard for user------------------------
  isUs() {
    let resolve;
    return new Promise((result, rej) => {
      if (sessionStorage.getItem("user") !== null) {
        let getUserData = JSON.parse(this.returnSessionData());

        if (
          getUserData.uid !== null &&
          getUserData.subscriptionExpire === true
        ) {
          this.isLogged.next(true);
          this.subsDataId = getUserData.subscriberId;
          result(true);
        } else {
          result(false);
        }
      } else {
        this.isLogged.next(false);
        sessionStorage.clear();
        result(false);
      }
      // });
    });
  }
  //------------------- auth guard for payment page --------------
  isPay() {
    let resolve;
    return new Promise((result, rej) => {
      this.afAuth.authState.subscribe((res) => {
        if (sessionStorage.getItem("user") !== null) {
          let getUserData = JSON.parse(this.returnSessionData());
          if (res.uid === getUserData.uid || getUserData.uid !== null) {
            this.isPayUpgrade.next(true);
            this.subsDataId = getUserData.subscriberId;
            result(true);
          } else {
            result(false);
          }
        } else {
          this.isPayUpgrade.next(false);
          sessionStorage.clear();
          result(false);
        }
      });
    });
  }
  //------
  //reset password
  public resetPasswordInit(email) {
    return this.afAuth.auth.sendPasswordResetEmail(email).then((res) => {
      ///console.log(res);
    });
  }
  // Send email verfificaiton when new user sign up
  private SendVerificationMail() {
    this.afAuth.auth.currentUser.sendEmailVerification();
  }

  //------------------- check all ----------------------
  /**
   * 1. check subscription id
   * 2. check user in collection with this sid
   */
  //----------------------------------------------------
  checkAll(userCredetial) {
    return this.checkSID()
      .then((res) => {
        if (res === true) {
          return this.checkUserInUsersCollection(userCredetial);
        } else {
          return false;
        }
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  }

  //---------------------- check sid ------------------------------
  private checkSID() {
    return this.allCol
      .getSubscriberCollection()
      .doc(this.newUser.subscriptionID)
      .get()
      .then(
        function (querysnap) {
          if (querysnap.exists) {
            //-----------will delivered to all page-----------
            this.subsDataId = querysnap.id;
            this.subsData = querysnap.data();
            // console.log(this.subsData);
            return true;
          } else {
            this.allErrMsg.errorMsg(this.allErrMsg.errorArray[0]);
            return false;
          }
        }.bind(this)
      )
      .catch((err) => {
        console.log(err);
        return err;
      });
  }
  //--------------- check expaire date -----------------
  private checkSubscriberExDate() {
    return new Promise((res, rej) => {
      if (this.subsData) {
        const endDate = this.subsData.subscriptionEnd;
        if (this.checkDate(endDate)) {
          //console.log(this.checkDate(endDate));
          return res(true);
        } else {
          return res(this.goToUpdateAdmin());
          // return rej(false);
        }
      }
    });
  }

  //----------------- check date ------------------------
  /**
   * 1. Free plan grace period
   * 2. Paid plan grace period
   * 3. subscription plan Active? (paypal id)
   * 4. If Paypal ID Active update date
   */
  //------------------------------------------------------
  async checkDate(exDate) {
    const exDat = exDate.toDate();
    const graDat = exDate.toMillis() + 15 * 24 * 60 * 60 * 1000;
    const grD = new Date(graDat);

    const currentDate = new Date();
    const remainDays = Math.floor(
      (grD.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)
    );
    // console.log(currentDate);
    // return new Promise((resolve, reject) => {
    if (this.subsData.subscriptionType === "FREE") {
      if (grD > currentDate) {
        // console.log("Free plan in grace ");
        this.currentuser.role === "ADMIN"
          ? this.allErrMsg.errorMsg(this.allErrMsg.errorArray[10], remainDays)
          : this.allErrMsg.errorMsg(this.allErrMsg.errorArray[15], remainDays);
        this.checkAdmin();
        return true;
      } else {
        return false;
      }
    } else {
      if (
        (this.subsData.paypalId !== null || this.subsData.paypalId !== "") &&
        exDat > currentDate
      ) {
        this.checkAdmin();
        return true;
      } else if (
        this.subsData.paypalId !== null &&
        exDat <= currentDate &&
        grD > currentDate
      ) {
        console.log(".......IN grace period.......");
        let checkPayPalAwait = await this.checkAndUpdateData(
          this.subsData.paypalId
        );
        if (checkPayPalAwait) {
          this.checkAdmin();
          return checkPayPalAwait;
        } else {
          this.currentuser.role === "ADMIN"
            ? this.allErrMsg.errorMsg(this.allErrMsg.errorArray[16], remainDays)
            : this.allErrMsg.errorMsg(
                this.allErrMsg.errorArray[11],
                remainDays
              );
          this.checkAdmin();
          return true;
        }
      } else if (
        (this.subsData.paypalId !== null || this.subsData.paypalId !== "") &&
        exDat <= currentDate &&
        grD < currentDate
      ) {
        console.log("......Over grace period..........");
        let checkPayPalAwait = await this.checkAndUpdateData(
          this.subsData.paypalId
        );
        if (checkPayPalAwait) {
          // alert("dfjhajshdfkjhsjdhfjkhauiefsjdf  " + checkPayPalAwait);
          this.checkAdmin();
          return checkPayPalAwait;
        } else {
          return this.goToUpdateAdmin();
        }
      }
    }
  }
  //------------- checkAdmin And navigate to payment page--------
  private goToUpdateAdmin() {
    new Promise((res, rej) => {
      this.storeInLocalStorage(false);
      const admin = this.currentuser.role;

      if (admin === "ADMIN") {
        this.isAdminLogged.next(false);
        this.isLogged.next(false);
        this.isPayUpgrade.next(true);
        this.router.navigate(["/plans/update"]);
        this.spinner.hide();
        this.allErrMsg.errorMsg(this.allErrMsg.errorArray[9]);

        return res(false);
      } else {
        this.spinner.hide();
        this.router.navigate(["/login"]);
        this.allErrMsg.errorMsg(this.allErrMsg.errorArray[1]);
        this.isAdminLogged.next(false);
        this.isPayUpgrade.next(false);
        this.isLogged.next(false);
      }
      return res(false);
    });
  }
  checkAndUpdateData(paypalId) {
    return this.getSubcriptionDetails(paypalId).then(
      async function (res: any) {
        if (
          res.status === "ACTIVE" &&
          new Date(res.billing_info.last_payment.time) >
            new Date(this.subsData.subscriptionEnd.seconds * 1000)
        ) {
          let isUpdated = await this.updateExpDate(res);
          return isUpdated;
        }
      }.bind(this)
    );
  }
  //---->xhttp call to paypal
  //---->check this subscriberId's payemt "ACTIVE"?
  getSubcriptionDetails(subcriptionId) {
    console.log(subcriptionId);
    const self = this;
    const xhttp = new XMLHttpRequest();
    return new Promise((res, rej) => {
      xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
          let a = JSON.parse(this.responseText);
          //console.log(this.responseText);
          //self.updateExpDate(a);
          self.checkPayActive = true;
          return res(a);
        }
      };
      xhttp.open("GET", environment.paypalBillingUrl + subcriptionId, true);
      xhttp.setRequestHeader("Authorization", this.basicAuth);

      xhttp.send();
    });
  }
  //----->if payement status "ACTIVE"
  //----->Update subscriber collection
  updateExpDate(data) {
    return new Promise((result, rej) => {
      if (data.status === "ACTIVE") {
        this.checkPayActive = true;
        return this.allCol
          .getSubscriberCollection()
          .doc(this.newUser.subscriptionID)
          .update({
            subscriptionEnd: this.addDays(
              new Date(this.subsData.subscriptionEnd.seconds * 1000),
              31
            ),
          })
          .then(() => {
            this.checkPayActive = true;
            return result(true);
          })
          .catch((err) => {
            this.checkPayActive = false;
            return result(false);
          });
      } else {
        return rej(false);
      }
    });
  }
  //--------------- add days 15 days --------------------
  addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
  //----------- check is he in this organization -----------
  public checkUserIsInOrg() {
    const subId = this.newUser.subscriptionID;
    const userSub = this.currentuser.subscriberId;
    return new Promise((res, rej) => {
      if (subId === userSub) {
        return res(true);
      } else {
        this.allErrMsg.errorMsg(this.allErrMsg.errorArray[11]);
        return rej(false);
      }
    });
  }
  //---------
  //check user active or not
  private checkUserIsActiveInOrg() {
    const userStatus = this.currentuser.status;
    return new Promise((res, rej) => {
      if (userStatus === "ACTIVE") {
        return res(true);
      } else if (userStatus === "LEAVER") {
        this.allErrMsg.errorMsg(this.allErrMsg.errorArray[13]);
        return rej(false);
      } else {
        this.allErrMsg.errorMsg(this.allErrMsg.errorArray[14]);
        return rej(false);
      }
    });
  }
  //------------------- check user exist or not ------------------
  private checkUserInUsersCollection(userCredetial) {
    let currentuser;
    let resolve;
    return this.allCol
      .getUserCollection()
      .doc(`${userCredetial.user.uid}_${this.newUser.subscriptionID}`)
      .get()
      .then(
        function (q) {
          if (q.exists) {
            currentuser = q.data();
            //-----------will delivered to all page-----------
            this.currentuser = currentuser;
            return true;
          } else {
            this.allErrMsg.errorMsg(this.allErrMsg.errorArray[12]);
            return false;
          }
        }.bind(this)
      )
      .catch((err) => {
        console.log(err);
        //this.toastr.error(err, "Error");
        return false;
      });
  }
  //-------------------- sign in function ----------------------
  public signIn(frm) {
    this.spinner.show();
    let userCredetial;
    this.newUser = frm;
    return this.afAuth.auth
      .signInWithEmailAndPassword(
        this.newUser.subscriberEmail,
        this.newUser.password
      )
      .then((userCredetial) => {
        if (userCredetial) {
          userCredetial = userCredetial;
          return this.checkAll(userCredetial).then((res) => {
            if (res == true) {
              if (userCredetial.user.emailVerified == false) {
                this.spinner.hide();
                this.SendVerificationMail();
                this.allErrMsg.successMsg(this.allErrMsg.successArray[3]);
              } else {
                this.spinner.hide();
                return true;
              }
            } else {
              this.spinner.hide();
              return false;
            }
          });
        }
      })
      .then((res) => {
        if (res === true) {
          return this.checkUserIsActiveInOrg();
        } else {
          this.spinner.hide();
          return false;
        }
      })
      .then((res) => {
        if (res === true) {
          return this.checkSubscriberExDate();
        } else {
          return false;
        }
      })
      .catch((err) => {
        console.log(err);
        this.spinner.hide();
        if (err !== false) {
          this.allErrMsg.signInRegisterError(err);
        }

        return false;
      });
  }

  //------------- checkAdmin ---------------------------------
  private checkAdmin() {
    this.spinner.hide();
    this.storeInLocalStorage(true);
    const admin = this.currentuser.role;
    if (admin === "ADMIN") {
      this.checkTermAndCondition();
      this.isAdminLogged.next(true);
      this.isLogged.next(true);
      this.isPayUpgrade.next(true);
      this.currentuser.subscriberId === "APPSOLZONE001"
        ? this.router.navigate(["panel/maintenance"])
        : this.router.navigate(["panel/dashboard"]);
    } else {
      this.isAdminLogged.next(false);
      this.isPayUpgrade.next(false);
      this.isLogged.next(true);
      this.router.navigate(["panel/dashboard"]);
    }
  }
  //--------------- terms and condition check ----------------
  getLatestTermsCondition() {
    this.allCol
      .getSubscriberCollection()
      .doc("APPSOLZONE001")
      .get()
      .then(
        function (res) {
          let termLink = res.data().tnc;
          let termCondtion = res.data().tncVersion;
          this.tncData = { tncLink: termLink, version: termCondtion };
        }.bind(this)
      );
  }
  checkTermAndCondition() {
    if (this.subsData.tncVersion !== this.tncData.version) {
      this.sl.alertTermsAndService(
        this.subsDataId,
        this.tncData.version,
        this.tncData.tncLink
      );
    }
  }
  //------------------ store data in localstorage --------------------
  storeInLocalStorage(subStatus: boolean) {
    let data = { ...this.currentuser, subscriptionExpire: subStatus };
    Object.assign(data, { accessedProfilesData: [], uidList: [] });
    //console.log("full user data in storage", data);
    var ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      sKey
    ).toString();
    sessionStorage.setItem("user", ciphertext);
    // var simpleCrypto = new SimpleCrypto(sKey);
    // const encrypt = simpleCrypto.encryptObject(data);
    // sessionStorage.setItem("user", encrypt);
  }
  //------------------ logout function --------------------
  public logout() {
    sessionStorage.clear();
    this.isLogged.next(false);
    this.isAdminLogged.next(false);
    this.isPayUpgrade.next(false);

    return this.afAuth.auth.signOut().then(() => {
      this.router.navigate(["/login"]);
    });
  }
  //###################################################################
  //-------------------------mobile--------------------------------
  /**
   * 1. check this sid exist
   * 2. sign in with email and pass
   * 3. check admin/user
   */
  //--------------------------------------------------------------
  public signInMobile(frm) {
    this.spinner.show();
    this.user = frm as MobileLoginModel;
    return this.checkSubIdMobile(this.user.subscriptionID)
      .then((res) => {
        if (res == true) {
          return this.signInProcessMobile();
        }
      })
      .then((res) => {
        if (res == true) {
          this.checkAdminMobile();
        }
        this.spinner.hide();
      })
      .catch((err) => {
        this.spinner.hide();
        console.log(err);
      });
  }

  //--------------- full sign in method ------------------------
  /**
   * 1. Sign in with email and password
   * 2. user is in this oragnisation
   */
  //------------------------------------------------------------
  private signInProcessMobile() {
    return this.afAuth.auth
      .signInWithEmailAndPassword(this.user.subscriberEmail, this.user.password)
      .then((userCredential) => {
        if (userCredential) {
          // console.log(userCredential);
          if (userCredential.user.emailVerified == false) {
            this.spinner.hide();
            this.SendVerificationMail();
            this.allErrMsg.successMsg(this.allErrMsg.successArray[3]);
            return false;
          } else {
            return this.checkUserInOrgMobile(userCredential);
          }
        }
      })
      .then((res) => {
        if (res == true) {
          return true;
        }
      })
      .catch((err) => {
        console.log(err);
        this.allErrMsg.signInRegisterError(err);
        return false;
      });
  }
  //------------ check user in this organization -----------------
  private checkUserInOrgMobile(userCredential) {
    return this.allCol
      .getUserCollection()
      .doc(`${userCredential.user.uid}_${this.user.subscriptionID}`)
      .get()
      .then(
        function (query) {
          if (query.exists) {
            //-----------will delivered to all page-----------
            this.currentuser = query.data();
            this.userData = query.data();
            return true;
          } else {
            this.allErrMsg.errorMsg(this.allErrMsg.errorArray[12]);
            return false;
          }
        }.bind(this)
      )
      .catch((err) => {
        console.log(err);
        return false;
      });
  }
  //---------------- check subid exist ----------------
  private checkSubIdMobile(id: string) {
    return this.allCol
      .getSubscriberCollection()
      .doc(`${id}`)
      .get()
      .then(
        function (query) {
          if (query.exists) {
            //-----------will delivered to all page-----------
            this.subsDataId = query.id;
            this.subsData = query.data();
            return true;
          } else {
            this.allErrMsg.errorMsg(this.allErrMsg.errorArray[0]);
            return false;
          }
        }.bind(this)
      )
      .catch((err) => {
        console.log(err);
        return false;
      });
  }

  //----------------- checkAdmin ---------------------------
  private checkAdminMobile() {
    this.storeInLocalStorage(false);
    const admin = this.userData.role;
    console.log("user role: ", admin);
    if (admin === "ADMIN") {
      this.isAdminLogged.next(false);
      this.isPayUpgrade.next(true);
      this.isLogged.next(false);
      this.router.navigate(["/plans/changes"]);
    } else {
      //this.isAdminLogged.next(false);
      this.isPayUpgrade.next(false);
      //this.isLogged.next(true);
      this.router.navigate(["/login"]);
    }
  }
  activeSubscriberToAccess() {
    this.isAdminLogged.next(true);
    this.isLogged.next(true);
    this.isPayUpgrade.next(true);
  }
}
//-------------------------mobile  end--------------------------------
