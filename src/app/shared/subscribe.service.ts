import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { NgxSpinnerService } from "ngx-spinner";
import { AllCollectionsService } from "./all-collections.service";
import { SweetAlertService } from "./sweet-alert.service";
import { UserLoginService } from "./user-login.service";
//import SimpleCrypto from "simple-crypto-js";
import { sKey } from "../extra/sKey";
import { AllErrorMsgService } from "./all-error-msg.service";
import * as moment from "moment";
import * as CryptoJS from "crypto-js";
@Injectable({
  providedIn: "root",
})
export class SubscribeService {
  newUser: any;
  phone: any;
  termCondtion: number;
  termLink: string;
  //--------
  //error handling
  private eventAuthError = new BehaviorSubject<string>("");
  eventAuthError$ = this.eventAuthError.asObservable();
  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private router: Router,
    private spinner: NgxSpinnerService,

    private allCol: AllCollectionsService,
    private sl: SweetAlertService,
    private loginService: UserLoginService,
    private allErrorMsg: AllErrorMsgService
  ) {
    this.getLatestTermsCondition();
  }
  ngOnInit() {}
  //------------------get terms & condition version--------
  getLatestTermsCondition() {
    return this.allCol
      .getSubscriberCollection()
      .doc("APPSOLZONE001")
      .get()
      .then((res) => {
        this.termLink = res.data().tnc;
        this.termCondtion = res.data().tncVersion;
        let data = { tncLink: this.termLink, version: this.termCondtion };
        return data;
      });
  }
  //------------- send verification email -------------
  SendVerificationMail() {
    this.afAuth.auth.currentUser
      .sendEmailVerification()
      .then(() => {
        //---->store sessionstorage
        let user = {
          email: this.afAuth.auth.currentUser.email,
          isExternal: false,
          jobTitle: "New User",
          name: this.newUser.subscriberName,
          phone: this.phone,
          picUrl: "",
          role: "ADMIN",
          status: "ACTIVE",
          subscriberId: this.newUser.subscriptionID,
          uid: this.afAuth.auth.currentUser.uid,
          subscriptionExpire: true,
        };
        // var simpleCrypto = new SimpleCrypto(sKey);
        // const encrypt = simpleCrypto.encryptObject(user);
        var ciphertext = CryptoJS.AES.encrypt(
          JSON.stringify(user),
          sKey
        ).toString();
        sessionStorage.setItem("user", ciphertext);
        // sessionStorage.setItem("user", encrypt);
        //---------------allow user to dashboard-------------------
        this.loginService.activeSubscriberToAccess();
        this.allCol.sendCustomEmail(this.allCol.userRes, {
          toEmail: this.afAuth.auth.currentUser.email,
          toName: this.newUser.subscriberName,
        });
      })
      .then(() => {
        this.router.navigate(["/plans/purchase"]);
      });
  }
  //--------------------- checkAll-------------------
  checkAll() {
    return new Promise((result, rej) => {
      return this.checkSubIDExist(this.newUser.subscriptionID)
        .then((res) => {
          //   console.log(res);
          if (res == true) {
            return result(true);
          } else {
            this.spinner.hide();
          }
        })
        .catch((err) => {
          this.spinner.hide();
          //  console.log(err);
          return rej(false);
        });
    });
  }
  //--------------- check this subscriptionId exist or not------
  checkSubIDExist(subID) {
    return this.allCol
      .getSubscriberCollection()
      .doc(subID)
      .get()
      .then(
        function (querysnap) {
          if (!querysnap.exists) {
            return true;
          } else {
            this.allErrorMsg.errorMsg(this.allErrorMsg.errorArray[3]);
            return false;
          }
        }.bind(this)
      )
      .catch((err) => {
        // console.log(err);
        this.eventAuthError.next(err);
        return err;
      });
  }

  //----------- check this email in subscriber collection------------
  //--->this email used by other org
  //--->use another email
  //-----------------------------------------------------------------
  checkEmailInSubscribersCollection(email) {
    let resolve;
    return this.allCol
      .getSubscriberCollection()
      .where("email", "==", email)
      .get()
      .then(
        function (querysnap) {
          querysnap.forEach(function (q) {
            if (q.exists) {
              resolve = true;
            }
          });
          if (resolve == true) {
            this.allErrorMsg.errorMsg(this.allErrorMsg.errorArray[4]);
            return false;
          } else {
            return true;
          }
        }.bind(this)
      )
      .catch((err) => {
        //console.log(err);
        return err;
      });
  }
  //------------- createUser using this email password----------
  /*
  1. create user with email and pass
  2. insert user ans subscription data
  */
  //------------------------------------------------------------
  createUser(frm, dial) {
    this.spinner.show();
    this.newUser = frm;
    this.phone = dial + this.newUser.subscriberPhone;
    return this.checkAll()
      .then((res) => {
        if (res) {
          return this.afAuth.auth
            .createUserWithEmailAndPassword(frm.subscriberEmail, frm.password)
            .then((userCredantial) => {
              this.newUser = frm;
              // console.log(userCredantial);
              userCredantial.user
                .updateProfile({
                  displayName: frm.subscriberName,
                })
                .then(() => {
                  this.spinner.hide();
                  return this.batchInsertAll(userCredantial);
                });
            })
            .catch((error) => {
              this.spinner.hide();
              if (error.code === "auth/email-already-in-use") {
                return this.checkEmailInSubscribersCollection(
                  this.newUser.subscriberEmail
                ).then((res) => {
                  // console.log(res);
                  if (res === true) {
                    return false;
                  } else {
                    return true;
                  }
                });
              }
            });
        } else {
          this.spinner.hide();
        }
      })
      .catch((error) => {
        this.spinner.hide();
        // console.log(error);
        return error;
      });
  }

  //---------------------- after re-enter password -----------------
  /*
  1. if user in auth table re-enter password
  2. check all 
  3. insert user and subscription data
  */
  //----------------------------------------------------------------
  signIn(frm, repass) {
    this.spinner.show();
    this.newUser = frm;
    let userCredantial;
    console.log(this.newUser);
    return this.afAuth.auth
      .signInWithEmailAndPassword(this.newUser.subscriberEmail, repass)
      .then((res) => {
        userCredantial = res;
        // console.log(userCredantial);
        return this.checkAll();
      })
      .then((res) => {
        // console.log(res);
        if (res == true) {
          this.spinner.hide();
          return this.batchInsertAll(userCredantial);
        } else {
          this.spinner.hide();
        }
      })
      .catch((err) => {
        //console.log(err);
        this.allErrorMsg.signInRegisterError(err);
        this.spinner.hide();
        if (err.code == "auth/wrong-password") {
          return false;
        } else if (err.code == "auth/too-many-requests") {
          return err;
        }
      });
  }
  //------------------- batch insert all-----------------
  batchInsertAll(userCredantial) {
    let resolve;
    return new Promise((res, rej) => {
      var batch = this.afs.firestore.batch();

      //user collection
      const user = this.allCol
        .getUserCollectionColOnly()
        .doc(`${userCredantial.user.uid}_${this.newUser.subscriptionID}`).ref;
      batch.set(user, {
        uid: userCredantial.user.uid,
        name: this.newUser.subscriberName,
        email: this.newUser.subscriberEmail,
        jobTitle: "New user",
        phone: this.phone,
        // leaveAdmin:{},
        // expanseAdmin:{},
        // countryServe:
        role: "ADMIN",
        picUrl: "",
        status: "ACTIVE",
        subscriberId: this.newUser.subscriptionID,
        userCreationTimeStamp: new Date(),
        isExternal: false,
        lastProfileUpdateAt: new Date(),
      });

      //subscriber collection
      const subscriber = this.allCol
        .getSubscriberCollectionColOnly()
        .doc(`${this.newUser.subscriptionID}`).ref;

      batch.set(subscriber, {
        subscriptionID: this.newUser.subscriptionID,
        companyName: this.newUser.subscriberOrgName.trim(),
        email: this.newUser.subscriberEmail,
        country: this.newUser.subscriberCtc,
        phoneNo: this.phone,
        subscriptionType: "FREE",
        noOfUserAllowed: 3,
        noOfFreeLicense: 2,
        enrolementDate: new Date(),
        subscriptionStart: new Date(),
        subscriptionEnd: this.addDays(new Date(), 0),
        overDuedate: new Date(),
        tncVersion: this.termCondtion,
      });
      // //kpi collection

      // const kpi = this.allCol
      //   .getKpiCollectionColOnly()
      //   .doc(`${this.newUser.subscriptionID}`).ref;

      // batch.set(kpi, {
      //   totalMeeting: 0,
      //   openMeeting: 0,
      //   completedMeeting: 0,
      //   totalTask: 0,
      //   openTask: 0,
      //   inprogressTask: 0,
      //   resolvedTask: 0,
      //   averageResolutionTask: 0,
      //   totalRisk: 0,
      //   openRisk: 0,
      //   inprogressRisk: 0,
      //   resolvedRisk: 0,
      //   averageResolutionRisk: 0,
      //   //---------------new add---------------
      //   riskLowLow: 0,
      //   riskLowMedium: 0,
      //   riskLowHigh: 0,
      //   riskMediumLow: 0,
      //   riskMediumMedium: 0,
      //   riskMediumHigh: 0,
      //   riskHighLow: 0,
      //   riskHighMedium: 0,
      //   riskHighHigh: 0,
      //   //--------------new add for risk------------
      //   totalIssue: 0,
      //   openIssue: 0,
      //   inprogressIssue: 0,
      //   resolvedIssue: 0,
      //   averageResolutionIssue: 0,
      // });

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
          this.allErrorMsg.successMsg(this.allErrorMsg.successArray[2]);
          this.SendVerificationMail();
          this.allErrorMsg.successMsg(this.allErrorMsg.successArray[3]);
          res(true);
        })
        .catch((err) => {
          //console.log(err);
          rej(err);
        });
    });
  }
  //--------------------- add days 15 days ----------------
  addDays(date, days) {
    return new Date(
      moment(date.getTime() + days * 24 * 60 * 60 * 1000).format("YYYY-MM-DD")
    );
  }

  // -----------get plans all plans page---------------------
  getPlans() {
    let array = [];
    return new Promise((res, rej) => {
      return this.allCol
        .getSubscriptionplans()
        .orderBy("price", "asc")
        .get()
        .then(function (querysnap) {
          querysnap.forEach(function (q) {
            const id = q.id;
            const data = { id, ...q.data() };
            array.push(data);
          });
          return res(array);
        })
        .catch((err) => {
          // console.log(err);
          return rej(err);
        });
    });
  }
}
