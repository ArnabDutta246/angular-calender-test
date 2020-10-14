import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { AllCollectionsService } from "./all-collections.service";
import { SweetAlertService } from "./sweet-alert.service";
import { NgxSpinnerService } from "ngx-spinner";
import { sKey } from "../extra/sKey";
import * as firebase from "firebase/app";
import { AllErrorMsgService } from "./all-error-msg.service";
import * as CryptoJS from "crypto-js";
import { map } from 'rxjs/operators';
@Injectable({
  providedIn: "root",
})
export class AllMembersDataService {
  subscriptiondata: any;
  allMember: any;
  filterMember: any;
  newUser: any;
  newUserDataArr: any;
  phone: any;
  countryServe:any;
  isRoleStatusExtarnal: string = "EXTERNAL";
  status = [
    "ACTIVE",
    "REGISTERED",
    "LEAVER",
    "SUSPENDED",
    "REJECTED",
    "EXTERNAL",
    "ALL",
  ];
  getUserData: any = null;
  firebase: any;
  systemGeneratedPassword: any;
  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private allCol: AllCollectionsService,
    private sl: SweetAlertService,
    private spinner: NgxSpinnerService,
    private allErrorMsg: AllErrorMsgService
  ) {
    //decrytion of session data
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // const obj: any = simpleCrypto.decryptObject(data);
    const data = sessionStorage.getItem("user");
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    this.getUserData = decryptedData;
    // this.getUserData = obj;
    this.getSubscriptionData(this.getUserData.subscriberId);
  }
  public fetchAllMember(id) {
    let allMemberArr = [];
    let users = this.allCol.afs
      .collection(this.allCol.users, (ref) =>
        ref
          .where("subscriberId", "==", this.getUserData.subscriberId)
          .where("status", "in", ["ACTIVE", "EXTERNAL"])
      )
      .snapshotChanges();
   return users
      .pipe(
        map((actions: any[]) =>
          actions.map((a: any) => {
            let user = {
              ...a.payload.doc.data(),
              id: a.payload.id,
            };
            return { ...user };
          })
        )
      )
  }
  public getCurrLogUserData() {
    const data = sessionStorage.getItem("user");
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  }

  //----------------------- org sub data -----------------
  public getSubscriptionData(id: string) {
    return this.allCol
      .getSubscriberCollection()
      .doc(id)
      .get()
      .then(
        function (val) {
          if (val.exists) {
            const id = val.id;
            const data = val.data();
            this.subscriptiondata = { id, ...data };
          }
          // console.log(this.subscriptiondata);
          return this.subscriptiondata;
        }.bind(this)
      )
      .catch((err) => {
        //  console.log(err);
      });
  }

  //-------------- check no of free license ---------------------
  public noOfFreeLicenseHas() {
    return new Promise((res, rej) => {
      return this.getSubscriptionData(this.getUserData.subscriberId).then(
        () => {
          if (this.subscriptiondata.noOfFreeLicense > 0) {
            return res(true);
          } else {
            this.allErrorMsg.errorMsg(this.allErrorMsg.errorArray[5]);
            return rej(false);
          }
        }
      );
    });
  }

  //------check user email already used in subscriber collection-----
  public checkUserEmailAlreadyInUsed(email: string) {
    return new Promise((res, rej) => {
      if (email === this.subscriptiondata.email) {
        this.allErrorMsg.errorMsg(this.allErrorMsg.errorArray[6]);
        return res(false);
      } else {
        return res(true);
      }
    });
  }
  //-------------------- Active any user -------------------------
  public activeUser(uid: string, subId: any, freeLicense: number) {
    // console.log(
    //   "uid :" + uid + " subId: " + subId + " freelicense: " + freeLicense
    // );
    let resolve;
    return new Promise((res, rej) => {
      return this.noOfFreeLicenseHas()
        .then((response) => {
          if (response) {
            var batch = this.afs.firestore.batch();

            //user collection
            const user = this.allCol
              .getUserCollectionColOnly()
              .doc(`${uid}_${subId}`).ref;
            batch.update(user, {
              status: this.status[0],
              isExternal: false,
              lastProfileUpdateAt: new Date(),
            });

            //subscriber collection
            const subscriber = this.allCol
              .getSubscriberCollectionColOnly()
              .doc(subId).ref;
            batch.update(subscriber, {
              noOfFreeLicense: firebase.firestore.FieldValue.increment(-1),
            });
            batch.commit().then((result) => {
              this.getSubscriptionData(this.subscriptiondata.id);
              this.sl.showAlert(
                "success",
                "User request activated successfull"
              );
              return res(true);
            });
          }
        })
        .catch((err) => {
          //console.log(err);
          this.sl.showAlert(
            "error",
            "Someting went wrong during this action",
            "Please try again"
          );
          return rej(false);
        });
    });
  }
  //----------------suspand leaver and external user---------------
  public deactiveSuspandLeaveUser(
    uid: string,
    subId: string,
    freeLicense: number,
    currStatus: string,
    statusWill: string,
    email: string
  ) {
    let resolve;
    return new Promise((res, rej) => {
      this.checkUserEmailAlreadyInUsed(email).then((result) => {
        if (result) {
          var batch = this.afs.firestore.batch();

          //user collection
          const user = this.allCol
            .getUserCollectionColOnly()
            .doc(`${uid}_${subId}`).ref;
          batch.update(user, {
            role: "USER",
            status: statusWill,
            isExternal: statusWill === this.isRoleStatusExtarnal ? true : false,
            lastProfileUpdateAt: new Date(),
          });

          if (currStatus === this.status[0]) {
            //subscriber collection
            const subscriber = this.allCol
              .getSubscriberCollectionColOnly()
              .doc(subId).ref;

            batch.update(subscriber, {
              noOfFreeLicense: firebase.firestore.FieldValue.increment(1),
            });
          }
          batch
            .commit()
            .then((result) => {
              this.allErrorMsg.successMsg(
                this.allErrorMsg.successArray[5],
                statusWill
              );
              res(true);
            })
            .catch((err) => {
              //       console.log(err);
              rej(err);
            });
        }
      });
    });
  }
  //----------------reject registered user request---------------
  public rejectUser(uid: string, subId: string, statusWill: string) {
    return this.allCol
      .getUserCollection()
      .doc(uid + "_" + subId)
      .update({
        status: statusWill,
        lastProfileUpdateAt: new Date(),
      })
      .then((res) => {
        this.allErrorMsg.successMsg(this.allErrorMsg.successArray[6]);
        return true;
      })
      .catch((err) => {
        //   console.log(err);
        return false;
      });
  }

  //-------------------new user on board------------------
  public addNewMember(frm, dial) {
    this.newUser = frm;
    this.phone = dial + this.newUser.subscriberPhone;
    this.countryServe = dial;

    if (this.newUser.subscriberRole === "USER") {
      return this.noOfFreeLicenseHas().then((res) => {
        if (res) {
          return this.createUserInAuth();
        }
      });
    } else if (this.newUser.subscriberRole === "ADMIN") {
      return this.noOfFreeLicenseHas()
        .then((res) => {
          if (res) {
            return this.allErrorMsg.retureTypeInfo(
              this.allErrorMsg.returnTypeArray[0]
            );
          }
        })
        .then((res) => {
          if (res) {
            // console.log("ljdahgljhalkjdhglasdjg ", res);
            return this.createUserInAuth();
          }
        });
    } else {
      return this.createUserInAuth();
    }
  }

  //------------------------create user account----------------
  /**
   * create user with email and default password
   * insert data in user collection and update subscibers collection
   */
  //-----------------------------------------------------------
  createUserInAuth() {
    let userCredan;
    let password = "";
    const possibleCaps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const possibleLowers = "abcdefghijklmnopqrstuvwxyz";
    const possibleNumbers = "0123456789";
    const possibleSpecial = "@#$%^&!";
    const possible =
      possibleCaps + possibleLowers + possibleNumbers + possibleSpecial;

    for (let i = 0; i < 10; i++)
      password += possible.charAt(Math.floor(Math.random() * possible.length));

    password +=
      password.match(/[A-Z]/g) == null
        ? possibleCaps.charAt(Math.floor(Math.random() * possibleCaps.length))
        : "";
    password +=
      password.match(/[a-z]/g) == null
        ? possibleLowers.charAt(
            Math.floor(Math.random() * possibleLowers.length)
          )
        : "";
    password +=
      password.match(/[0-9]/g) == null
        ? possibleNumbers.charAt(
            Math.floor(Math.random() * possibleNumbers.length)
          )
        : "";
    password +=
      password.match(/(@|#|\$|%|\^|&|!)/g) == null
        ? possibleSpecial.charAt(
            Math.floor(Math.random() * possibleSpecial.length)
          )
        : "";

    //   console.log("Password:", password);
    this.systemGeneratedPassword = password;

    this.spinner.show();
    return this.afAuth.auth
      .createUserWithEmailAndPassword(
        this.newUser.subscriberEmail,
        this.systemGeneratedPassword
      )
      .then((userCredantial) => {
        if (userCredantial) {
          userCredan = userCredantial;
          userCredantial.user.updateProfile({
            displayName: this.newUser.subscriberName,
          });
          return this.batchUserOnBoard(userCredantial.user.uid);
        }
      })
      .catch((err) => {
        this.spinner.hide();
        //   console.log(err);
        if (err.code === "auth/email-already-in-use") {
          this.checkEmailInUserCollection().then((res) => {
            this.spinner.hide();
            console.log(res);
            return res;
          });
        }
      });
  }
  //-------------------check that email in user collection-----------
  checkEmailInUserCollection() {
    let arr = [];
    return this.allCol
      .getUserCollection()
      .where("subscriberId", "==", this.newUser.subscriptionID)
      .where("email", "==", this.newUser.subscriberEmail)
      .get()
      .then(
        function (query) {
          query.forEach(function (q) {
            console.log(q.data());
            arr.push(q.data());
          });
          this.newUserDataArr = arr;
          if (this.newUserDataArr.length > 0) {
            return this.checkIsAlreadyInOrg();
          } else {
            // this.spinner.hide();
            // this.allErrorMsg.errorMsg(this.allErrorMsg.errorArray[7]);
            // return false;
            return this.checkInOtherOrg();
          }
        }.bind(this)
      )
      .catch((err) => {
        this.spinner.hide();
        //  console.log(err);
      });
  }
  //----------------user already in org check-----------------------
  checkIsAlreadyInOrg() {
    //alert("calling in checkIsAlreadyInOrg");
    return new Promise((res, rej) => {
      //  console.log(this.newUserDataArr);
      const a = this.newUserDataArr.filter(
        function (n) {
          return n.subscriberId === this.newUser.subscriptionID;
        }.bind(this)
      );
      //  console.log(a);
      if (a.length > 0) {
        this.allErrorMsg.errorMsg(this.allErrorMsg.errorArray[8]);
        return res(false);
      }
    });
  }
  //----------------user already in other org--------------------------
  checkInOtherOrg() {
    //alert("calling in checkInOtherOrg");
    let foundUserData: any = false;
    return this.afs
      .collection("useruids", (ref) =>
        ref.where("email", "==", this.newUser.subscriberEmail)
      )
      .get()
      .toPromise()
      .then(
        function (querySnapshot) {
          let userDetails = { user: { uid: null } };

          querySnapshot.forEach(function (doc) {
            foundUserData = doc.exists;
            Object.assign(userDetails, {
              id: doc.id,
              data: doc.data(),
              user: doc.data(),
            });
          });
          if (foundUserData) {
            // alert(userDetails.user.uid + "----" + foundUserData);
            this.batchUserOnBoard(userDetails.user.uid, foundUserData);
            return true;
          } else {
            this.sl.showAlert(
              "error",
              "The user can not be added. Please try again. If the problem persists please request the user to Sign up using his/her credentials.",
              "Please try again"
            );
            return false;
          }
        }.bind(this)
      );
  }
  //------------insert user data and subscibers collection--------------
  batchUserOnBoard(uid, foundUserData?: boolean) {
    //alert("batch calling  " + this.getUserData.subscriberId);
    return new Promise((result, rej) => {
      var batch = this.afs.firestore.batch();
      //user collection
      const user = this.allCol
        .getUserCollectionColOnly()
        .doc(`${uid}_${this.subscriptiondata.id}`).ref;
      batch.set(user, {
        uid: uid,
        name: this.newUser.subscriberName,
        email: this.newUser.subscriberEmail,
        jobTitle: this.newUser.subscriberJobTitle,
        phone: this.phone,
        // countryServe:this.countryServe,
        // leaveAdmin:{},
        // expanseAdmin:{},
        role:
          this.newUser.subscriberRole === this.isRoleStatusExtarnal
            ? "USER"
            : this.newUser.subscriberRole,
        picUrl: "",
        status:
          this.newUser.subscriberRole === this.isRoleStatusExtarnal
            ? this.newUser.subscriberRole
            : "ACTIVE",
        subscriberId: this.subscriptiondata.id,
        userCreationTimeStamp: new Date(),
        isExternal:
          this.newUser.subscriberRole === this.isRoleStatusExtarnal
            ? true
            : false,
        lastProfileUpdateAt: new Date(),
      });

      if (this.newUser.subscriberRole !== this.isRoleStatusExtarnal) {
        //subscriber collection
        const subscriber = this.allCol
          .getSubscriberCollectionColOnly()
          .doc(this.subscriptiondata.id).ref;
        batch.update(subscriber, {
          noOfFreeLicense: firebase.firestore.FieldValue.increment(-1),
        });
      }

      // add to userids collection for lookup
      const useruids = this.afs.collection("useruids").doc(uid).ref;
      batch.set(useruids, {
        uid: uid,
        email: this.newUser.subscriberEmail,
      });

      // add to users notification
      const userNotification = this.afs
        .collection(this.allCol.noti)
        .doc(uid + "_" + this.subscriptiondata.id).ref;
      batch.set(userNotification, {
        uid: uid,
        name: this.newUser.subscriberName,
        totalAlerts: 0,
        totalAlertsUnread: 0,
      });

      batch
        .commit()
        .then(() => {
          this.allCol.sendCustomEmail(this.allCol.adminUserRes, {
            toEmail: this.newUser.subscriberEmail,
            toName: this.newUser.subscriberName,
            orgName: this.subscriptiondata.companyName,
            sId: this.getUserData.subscriberId,
            uName: this.newUser.subscriberEmail,
            pwd:
              foundUserData === true
                ? "Use you current password for the email mentioned above"
                : this.systemGeneratedPassword,
          });
        })
        .then((resultt) => {
          this.spinner.hide();
          this.newUser.subscriberRole === this.isRoleStatusExtarnal
            ? this.allErrorMsg.successMsg(this.allErrorMsg.successArray[6])
            : this.allErrorMsg.successMsg(this.allErrorMsg.successArray[4]);
          return result(true);
        })
        .catch((err) => {
          this.spinner.hide();
          console.log(err);
          return rej(err);
        });
    });
  }

  //--------------------
  //----> add admin
  public addAdminOrUser(uid: string, sid: String, role: String) {
    this.allCol
      .getUserCollection()
      .doc(`${uid}_${sid}`)
      .update({
        role: role === "ADMIN" ? "ADMIN" : "USER",
        lastProfileUpdateAt: new Date(),
      });
  }
}
