import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { BehaviorSubject } from "rxjs";
import { AngularFireAuth } from "@angular/fire/auth";
import { ToastrService } from "ngx-toastr";
import { Router } from "@angular/router";
import { NgxSpinnerService } from "ngx-spinner";
import { SweetAlertService } from "./sweet-alert.service";
import { AllCollectionsService } from "./all-collections.service";
import { AllErrorMsgService } from "./all-error-msg.service";
@Injectable({
  providedIn: "root",
})
export class UserRegisterService {
  newUser: any;
  subscritionIDData: any;
  popup: boolean;
  nolicense: number;
  phone: any;
  //------------------- error handling ----------------

  private eventAuthError = new BehaviorSubject<string>("");
  eventAuthError$ = this.eventAuthError.asObservable();
  constructor(
    private afAuth: AngularFireAuth,
    private spinner: NgxSpinnerService,
    private sl: SweetAlertService,
    private allCol: AllCollectionsService,
    private allErrMsg: AllErrorMsgService,
    private afs: AngularFirestore
  ) {
    this.checkSubIDExist.bind(this);
  }
  //------------------ reset password -------------------
  resetPasswordInit() {
    return this.afAuth.auth
      .sendPasswordResetEmail(this.newUser.subscriberEmail)
      .then((res) => {
        console.log(res);
      });
  }
  //------------------ send verifiction email ---------------
  SendVerificationMail() {
    this.afAuth.auth.currentUser.sendEmailVerification().then(() => {
      this.sl.showAlertWithNavigate(
        "Please Verify Your Email",
        "Thank you for registering with us. A verification email has been sent to your email id.Please verify your identity to continue further",
        "/login",
        "Login"
      );
    });
  }
  //-------------------- checkAll function -----------------------
  checkAll() {
    return this.checkSubIDExist(this.newUser.subscriptionID)
      .then((res) => {
        //console.log(res);
        if (res === true) {
          return this.checkExapireDate();
        }
      })
      .then((res) => {
        //console.log(res);
        if (res === true) {
          return true;
        } else {
          return false;
        }
      })
      .catch((err) => {
        //console.log(err);
        return false;
      });
  }

  //-------------- check this subscriptionId exist or not -----
  checkSubIDExist(subID) {
    return this.allCol
      .getSubscriberCollection()
      .doc(subID)
      .get()
      .then(
        function (querysnap) {
          if (querysnap.exists) {
            this.subscritionIDData = querysnap.data();
            return true;
          } else {
            return false;
          }
        }.bind(this)
      )
      .catch((err) => {
        //console.log(err);
        this.eventAuthError.next(err);
        return err;
      });
  }

  //-------------------- check expaire date ------------------
  checkExapireDate() {
    const currentDate = new Date();
    const exdate = this.subscritionIDData.subscriptionEnd.toDate();
    const grDate =
      this.subscritionIDData.subscriptionEnd.toMillis() +
      15 * 24 * 60 * 60 * 1000;
    const grD = new Date(grDate);
    // console.log(new Date(grDate));
    return new Promise((res, rej) => {
      if (this.subscritionIDData !== null) {
        if (exdate > currentDate || grD > currentDate) {
          return res(true);
        } else {
          this.allErrMsg.errorMsg(this.allErrMsg.errorArray[1]);
          return res(false);
        }
      } else {
        //console.log("empty data retrive");
        return rej(false);
      }
    });
  }
  //---------------- create new user through register -------------
  /*
  1. create user with email & password
  2. check user in collection
  3. insert user data in collection  
  */
  //---------------------------------------------------------------
  createUser(frm, dial) {
    this.newUser = frm;
    this.phone = dial + this.newUser.subscriberPhone;
    this.spinner.show();
    let userCredan;
    return this.checkAll()
      .then((res) => {
        if (res === true) {
          return this.afAuth.auth
            .createUserWithEmailAndPassword(frm.subscriberEmail, frm.password)
            .then((userCredantial) => {
              if (userCredantial) {
                userCredan = userCredantial;
                //console.log(userCredantial);
                userCredantial.user.updateProfile({
                  displayName: frm.subscriberName,
                });
                return true;
              } else {
                return false;
              }
            });
        }
      })
      .then((res) => {
        // console.log(res);
        if (res === true) {
          return this.checkUserCollection(
            userCredan,
            this.newUser.subscriberEmail,
            this.newUser.subscriptionID
          );
        }
      })
      .then((res) => {
        if (res === true) {
          if (userCredan) {
            return this.insertInUserCollection(userCredan);
          }
        }
      })
      .then((res) => {
        this.spinner.hide();
        if (res == true) {
          this.allErrMsg.successMsg(this.allErrMsg.successArray[0]);
          this.SendVerificationMail();
        }
      })
      .catch((error) => {
        //console.log(error);
        if (error.code === "auth/email-already-in-use") {
          this.spinner.hide();
          return false;
        } else {
          this.spinner.hide();
          this.signInRegisterError(error);
          return error;
        }
      });
  }

  //-------------------  after re-enter password (signIn)-----------------
  /*
  1. sign in with email and password
  2. check in user collection
  3. insert user data in collection
  */
  //----------------------------------------------------------------------
  signIn(frm, repass, dial) {
    this.spinner.show();
    this.newUser = frm;
    this.phone = dial + this.newUser.subscriberPhone;
    let userCredantial;
    return this.afAuth.auth
      .signInWithEmailAndPassword(this.newUser.subscriberEmail, repass)
      .then((res) => {
        userCredantial = res;
        return this.checkAll();
      })
      .then((res) => {
        if (res === true) {
          return this.checkUserCollection(
            userCredantial,
            this.newUser.subscriberEmail,
            this.newUser.subscriptionID
          );
        }
      })
      .then((res) => {
        //console.log(res);
        if (res == true) {
          return this.insertInUserCollection(userCredantial);
        }
      })
      .then((res) => {
        if (res == true) {
          this.spinner.hide();
          this.allErrMsg.successMsg(this.allErrMsg.successArray[0]);
          this.SendVerificationMail();
          return true;
        } else {
          this.spinner.hide();
        }
      })
      .catch((err) => {
        //console.log(err);
        this.signInRegisterError(err);
        this.spinner.hide();
        if (err.code == "auth/wrong-password") {
          return false;
        } else if (err.code == "auth/too-many-requests") {
          return err;
        }
      });
  }

  //---- ----------------- check in userCollection ----------------
  //-->if this subID exist
  //-->if other subID exist
  //-->if no subID exist
  //----------------------------------------------------------------
  checkUserCollection(userCredantial, email, sid) {
    let resolve;
    return this.allCol
      .getUserCollection()
      .doc(`${userCredantial.user.uid}_${sid}`)
      .get()
      .then(
        function (querysnap) {
          if (querysnap.exists) {
            const subid = querysnap.data().subscriberId;
            this.allErrMsg.successMsg(this.allErrMsg.successArray[1]);
            return false;
          } else {
            return true;
          }
        }.bind(this)
      )
      .catch((err) => {
        //console.log(err);
        return false;
      });
  }

  //------------------- batch insert all ---------------------------
  insertInUserCollection(userCredantial) {
    return new Promise((res, rej) => {
      var batch = this.afs.firestore.batch();
      const user = this.allCol
        .getUserCollectionColOnly()
        .doc(`${userCredantial.user.uid}_${this.newUser.subscriptionID}`).ref;

      batch.set(user, {
        uid: userCredantial.user.uid,
        name: this.newUser.subscriberName,
        email: this.newUser.subscriberEmail,
        jobTitle: "New user",
        phone: this.phone,
        role: "USER",
        picUrl: "",
        status: "REGISTERED",
        subscriberId: this.newUser.subscriptionID,
        userCreationTimeStamp: new Date(),
        isExternal: false,
        lastProfileUpdateAt: new Date(),
      });

      // add to userids collection for lookup
      const useruids = this.afs
        .collection("useruids")
        .doc(userCredantial.user.uid).ref;
      batch.set(useruids, {
        uid: userCredantial.user.uid,
        email: this.newUser.subscriberEmail,
      });

      // add to users notification
      const userNotification = this.afs
        .collection(this.allCol.noti)
        .doc(userCredantial.user.uid + "_" + this.newUser.subscriptionID).ref;
      batch.set(userNotification, {
        uid: userCredantial.user.uid,
        name: this.newUser.subscriberName,
        totalAlerts: 0,
        totalAlertsUnread: 0,
      });
      batch
        .commit()
        .then((result) => {
          // console.log(result);
          return res(true);
        })
        .catch((err) => {
          // console.log(err);
          return rej(err);
        });
    });
  }

  //------------------ function signIn error -------------
  signInRegisterError(err) {
    if (err.code !== "auth/wrong-password") {
      this.allErrMsg.signInRegisterError(err);
    } else if (err.code == "auth/wrong-password") {
      this.popup = true;
      this.allErrMsg.errorMsg(this.allErrMsg.errorArray[2]);
    }
  }
}
