import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
} from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import {
  HttpClient,
  HttpHeaders,
  HttpClientModule,
} from "@angular/common/http";
import { Observable } from "rxjs";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { NgxSpinnerService } from "ngx-spinner";
import { UserLoginService } from "src/app/shared/user-login.service";
import { environment } from "src/environments/environment.prod";
//import SimpleCrypto from "simple-crypto-js";
import * as CryptoJS from "crypto-js";
import { sKey } from "src/app/extra/sKey";
import { AllErrorMsgService } from "src/app/shared/all-error-msg.service";
import { ConnectionService } from "ng-connection-service";
import * as moment from "moment";
declare var paypal;

@Component({
  selector: "app-update-plans",
  templateUrl: "./update-plans.component.html",
  styleUrls: ["./update-plans.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class UpdatePlansComponent implements OnInit {
  @ViewChild("paypal", { static: true }) paypalElement: ElementRef;
  planId: string = "";
  subcripId: any;
  user: any;
  a: any;
  noOfFreeLicenseHas: number;
  noOfUserAllowedHas: number;
  oldPlanType: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserUid: string;
  paypalIDHas: any;
  //variables-------
  sPlan: any = "";
  planName: string = "";
  planPrice: number = 0;
  planMin: number = 0;
  fixed: number = 0;
  newUserData: any;
  agreement: any;
  sub: any;
  basicAuth: any; //Pass your ClientId + scret key
  proPlan: string;
  getUserData: any;
  orgNameHere: string;
  currOrgPlan: string;
  token: any;
  subbb: any;
  isConnected: any;
  status: any;
  currPlanActiveOrNot: boolean;
  isPrevPlanFreeOrNot: boolean = true;
  planTags: any = [];
  plansAll: any = [];
  initiatedPaypalId: any = "";
  constructor(
    private router: Router,
    private http: HttpClientModule,
    private activatedRoute: ActivatedRoute,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private allCol: AllCollectionsService,
    private sl: SweetAlertService,
    private spinner: NgxSpinnerService,
    private loginService: UserLoginService,
    private allErrorMsg: AllErrorMsgService,
    private connectionService: ConnectionService
  ) {
    //decrytion of session data
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // const obj: any = simpleCrypto.decryptObject(data);
    // const obj: any = this.loginService.returnSessionData();
    // this.getUserData = obj;
    const data = sessionStorage.getItem("user");
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    let getUserData = decryptedData;
    this.getUserData = getUserData;
    this.basicAuth = environment.paypalBasicUrl; //Pass your ClientId + scret key
  }

  ngOnInit() {
    //----------------------
    this.token = this.activatedRoute.snapshot.params["token"];
    this.sPlan = this.activatedRoute.snapshot.params["plan"];
    this.fetchAllPlan();
    //----------------------network check function------------------
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.status = "ONLINE";
      } else {
        this.status = "OFFLINE";
      }
    });

    //----------------------------------
    //current user data
    this.currentUserUid = this.getUserData.uid;
    this.currentUserName = this.getUserData.name;
    this.currentUserEmail = this.getUserData.email;

    //------------------------------------
    const self = this;

    //------------------------------------
    //paypal button
    paypal
      .Buttons({
        createSubscription: function (data, actions) {
          return actions.subscription
            .create({
              plan_id: self.planId,
              quantity: self.planMin,
            })
            .then((val) => {
              console.log(JSON.stringify(val));
              return self.pendingStatus(val).then((res) => {
                if (res == true) {
                  return val;
                }
              });
            });
        },
        onApprove: function (data, actions) {
          console.log("on Approve :", data);
          self.getSubcriptionDetails(data.subscriptionID, true);
        },
        onCancel: function (data) {
          // Show a cancel page, or return to cart
          self.sl.showAlert(
            "error",
            "Sorry!! Paypal payment cancelled,Please try again",
            "Payment Cancelled"
          );
          self.storeCancelRecord(data);
        },
        onError: function (err) {
          // Show an error page here, when an error occurs
          self.sl.showAlert(
            "error",
            "Sorry!! Something went wrong,Please try again",
            "Error Occured"
          );
          console.log(err);
        },
      })
      .render(this.paypalElement.nativeElement);
  }
  //---------------
  ngOnDestroy() {
    // this.subbb.unsubscribe();
  }
  //---------------
  // pending status code
  pendingStatus(val) {
    return new Promise((result, rej) => {
      this.initateStatus(val)
        .then((res) => {
          if (res == true) {
            return result(true);
          } else {
            return result(false);
          }
        })
        .catch((err) => {
          console.log(err);
          return rej(false);
        });
    });
  }

  //---------------------
  // initiateStatus
  initateStatus(val) {
    this.initiatedPaypalId = val;
    return this.allCol
      .getCartCollction()
      .doc(`${this.sub}`)
      .set({
        initiated: val,
      })
      .then((result) => {
        return true;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  }

  //-------------------- store cancel recored in transaction--------
  storeCancelRecord(data) {
    //  console.log("after cancel paypal", this.initiatedPaypalId);
    const transactionsId = this.afs.createId();
    const transactions = this.allCol
      .getTransactionCollectionColOnly()
      .doc(`${transactionsId}`).ref;
    transactions.set({
      paymentStatus: "canceled",
      timeStamp: new Date(),
      subscriberId: this.sub,
      paypalId: this.initiatedPaypalId,
      oldValues: {
        noOfUserAllowed: this.noOfUserAllowedHas,
        subscriptionType: this.oldPlanType,
      },
      newValues: {
        noOfUserAllowed: this.planMin,
        subscriptionType: this.planName,
      },
      initiator: {
        uid: this.currentUserUid,
        name: this.currentUserName,
        email: this.currentUserEmail,
      },
    });
  }
  //--------------------fetch all plans from collection-----
  fetchAllPlan() {
    this.plansAll = [];
    return this.allCol
      .getSubscriptionplans()
      .doc(this.sPlan)
      .onSnapshot((res) => {
        const data = res.data();
        const id = res.id;
        this.plansAll = [{ id, ...data }];
        this.setAll(id);
        this.fetchUserData();
        // console.log("after getting all Plans", this.plansAll);
      });
  }
  //---------------------------------------------------------------s
  //---->get selected plans
  //---->from collection

  setAll(planid: string) {
    let index = this.plansAll.findIndex((n) => n.id === planid);
    // console.log("this plan data we get", this.plansAll[index]);
    this.planId = this.plansAll[index].paypalPlanId;
    this.planName = this.plansAll[index].id;
    this.planPrice = this.plansAll[index].price;
    this.planMin = this.noOfUserAllowedHas - this.noOfFreeLicenseHas;
  }

  //plan minlicense increment------
  inc() {
    this.planMin += 1;
  }
  //plan minlicense decrement------
  des() {
    if (this.fixed < this.planMin) {
      this.planMin = this.planMin - 1;
    } else {
      this.showAlert(1);
    }
  }
  //-------------------------------------------------
  // fetch user data
  // after that check subscribers collection
  // set current active license/plan/paypalId etc
  fetchUserData() {
    return this.allCol
      .getUserCollection()
      .doc(this.currentUserUid + "_" + this.loginService.subsDataId)
      .get()
      .then(
        function (query) {
          // console.log(query.data());
          if (query.exists) {
            // console.log(query.data());
            return this.checkIsAdmin(query.data());
          } else {
            //  console.log("user data not exist");
            this.showAlert(2);
            this.router.navigate(["/login"]);
          }
        }.bind(this)
      )
      .then((result) => {
        if (result) {
          this.getSubscriber();
          return true;
        } else {
          this.router.navigate(["/login"]);
        }
      })
      .catch((err) => {
        console.log(err);
        console.log(err.code);
        console.log(err.message);
        if (err.code === "unavailable") this.allErrorMsg.errorMsg(err.code);
        return false;
      });
  }

  //---------------------User is admin/Status active-----------------
  checkIsAdmin(data: any) {
    // console.log(data);
    if (data.role === "ADMIN" && data.status === "ACTIVE") {
      this.sub = data.subscriberId;
      // console.log(this.sub);
      return true;
    } else {
      this.sl.showAlert(
        "error",
        "Mismatch of user status and activation",
        "Mismatch User Role"
      );
      return false;
    }
  }
  // =========Start Get Subcription Details Method=======================
  getSubcriptionDetails(subcriptionId, method: boolean = false) {
    const self = this;
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        self.a = JSON.parse(this.responseText);
        console.log(this.responseText);
        self.currPlanActiveOrNot =
          !method && self.a.status === "ACTIVE" ? true : false;
        if (method) self.batchInsertAll(self.a);
      }
    };

    xhttp.open("GET", environment.paypalBillingUrl + subcriptionId, true);
    xhttp.setRequestHeader("Authorization", this.basicAuth);

    xhttp.send();
  }
  getSubcriptionDetailsCancel(subcriptionId, reTest?: boolean) {
    console.log("subcriptionId old", subcriptionId);
    const self = this;
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 204) {
        //self.a = JSON.parse(this.responseText);
        // console.log(this.responseText);
        // self.batchInsertAll(self.a);
        if (reTest) self.getSubcriptionDetails(self.paypalIDHas, false);
        return true;
      }
    };

    xhttp.open(
      "POST",
      environment.paypalBillingUrl + subcriptionId + "/cancel",
      true
    );
    xhttp.setRequestHeader("Authorization", this.basicAuth);
    xhttp.setRequestHeader("Content-Type", "Application/json");

    xhttp.send();
  }
  // ============END Get Subcription Details Method========================

  //-------------------------------
  //--->get subscriber data
  //------>subscriber collection
  //------>store curr active license
  //------>store plan name
  getSubscriber() {
    this.spinner.show();
    return this.allCol
      .getSubscriberCollection()
      .doc(`${this.sub}`)
      .onSnapshot(
        function (query) {
          if (query.exists) {
            this.orgNameHere = query.data().companyName;
            this.noOfUserAllowedHas = query.data().noOfUserAllowed;
            this.noOfFreeLicenseHas = query.data().noOfFreeLicense;
            this.oldPlanType = query.data().subscriptionType;
            this.planMin = this.noOfUserAllowedHas - this.noOfFreeLicenseHas;
            this.fixed = this.noOfUserAllowedHas - this.noOfFreeLicenseHas;
            if (query.data().paypalId) {
              this.paypalIDHas = query.data().paypalId;
              this.isPrevPlanFreeOrNot = !this.isPrevPlanFreeOrNot;
              this.getSubcriptionDetails(this.paypalIDHas, false);
              this.spinner.hide();
            } else {
              this.paypalIDHas = null;
              this.isPrevPlanFreeOrNot = this.isPrevPlanFreeOrNot;
            }
            this.spinner.hide();
            return true;
          } else {
            this.spinner.hide();
            return false;
          }
        }.bind(this)
      );
  }
  //----------------------------------
  //-------->checkthis
  //-------->the active member > current desire license
  //batch all
  batchInsertAll(a) {
    this.spinner.show();
    return new Promise((res, rej) => {
      const currentActiveMember =
        this.noOfUserAllowedHas - this.noOfFreeLicenseHas;
      if (currentActiveMember <= this.planMin) {
        var batch = this.afs.firestore.batch();
        // cart collection
        const cart = this.allCol.getCartCollectionColOnly().doc(`${this.sub}`)
          .ref;

        if (this.paypalIDHas !== null) {
          batch.set(cart, {
            initiated: null,
            cancelled: this.paypalIDHas,
          });
        } else {
          batch.set(cart, {
            initiated: null,
          });
        }

        //transactions collection
        const transactionsId = this.afs.createId();
        const transactions = this.allCol
          .getTransactionCollectionColOnly()
          .doc(`${transactionsId}`).ref;
        batch.set(transactions, {
          paymentStatus: "success",
          timeStamp: new Date(a.status_update_time),
          subscriberId: this.sub,
          paypalId: a.id,
          oldValues: {
            noOfUserAllowed: this.noOfUserAllowedHas,
            subscriptionType: this.oldPlanType,
          },
          newValues: {
            noOfUserAllowed: parseInt(a.quantity),
            subscriptionType: this.planName,
          },
          initiator: {
            uid: this.currentUserUid,
            name: this.currentUserName,
            email: this.currentUserEmail,
          },
        });

        //subscriber collection
        const subscriber = this.allCol
          .getSubscriberCollectionColOnly()
          .doc(`${this.sub}`).ref;

        batch.update(subscriber, {
          subscriptionType: this.planName,
          noOfUserAllowed: parseInt(a.quantity),
          noOfFreeLicense:
            parseInt(a.quantity) -
            this.noOfUserAllowedHas +
            this.noOfFreeLicenseHas,
          subscriptionEnd: this.addDays(new Date(), 30),
          paypalId: a.id,
        });

        batch
          .commit()
          .then((result) => {
            if (this.paypalIDHas !== null) {
              this.getSubcriptionDetails(this.paypalIDHas);
            }
            this.spinner.hide();
            this.loginService.activeSubscriberToAccess();
            if (this.getUserData.subscriptionExpire === false)
              this.storeInLocalStorage(true);
            if (this.token !== "changes") {
              this.getSubscriber();
              this.showAlert(5);
            } else {
              this.showAlert(4);
              this.loginService.logout();
              // this.router.navigate(["/login"]);
            }

            return res(true);
          })
          .catch((err) => {
            this.spinner.hide();
            console.log("batch fail:", err);
            return rej(false);
          });
      } else {
        this.loginService.isAdminLogged.subscribe((res) => {
          this.showAlert(1);
        });
        this.spinner.hide();
        return rej(false);
      }
    });
  }
  showAlert(no: number) {
    if (no === 1) {
      this.sl.showAlert(
        "error",
        `Organization already has ${this.planMin} active users. If you want to reduce no of licenses,please disable some active user and proceed`,
        `Active License more then ${this.planMin}`
      );
    } else if (no === 2) {
      this.sl.showAlert(
        "error",
        "Sorry! you are not a register member in this organisation,or this is some issue.Try again later",
        "Error Alert"
      );
    } else if (no == 3) {
      this.sl.showAlert(
        "error",
        "Sorry! something went wrong please. Try again",
        "Error Alert"
      );
    } else if (no === 4) {
      this.sl.showAlert(
        "success",
        "Subscription payment updated successfully",
        "Thank you for your subscription. Please check the update in mobile app or login here to continue"
      );
    } else if (no === 5) {
      this.sl.showAlertWithNavigate(
        "Payment updated",
        "Subscription payment updated successfully",
        "/panel/member-management",
        "Dasboard",
        "success"
      );
    }
  }
  //----------
  // add days 30 days
  addDays(date, days) {
    return new Date(
      moment(date.getTime() + days * 24 * 60 * 60 * 1000).format("YYYY-MM-DD")
    );
  }
  //------------------
  //----->store data in localstorage
  storeInLocalStorage(subStatus: boolean) {
    this.getUserData.subscriptionExpire = subStatus;
    let data = this.getUserData;
    // var simpleCrypto = new SimpleCrypto(sKey);
    // const encrypt = simpleCrypto.encryptObject(data);
    // sessionStorage.setItem("user", encrypt);
    var ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      sKey
    ).toString();
    sessionStorage.setItem("user", ciphertext);
  }
  //-------------------------------
  navpage(num: number) {
    num === 1
      ? this.router.navigate(["/panel/member-management"])
      : this.router.navigate([`/plans/${this.token}`]);
  }
  //------------------check plan number
  checkLicense(event) {
    let e = event.target.value;
    if (e < this.fixed) {
      this.planMin = this.noOfUserAllowedHas - this.noOfFreeLicenseHas;
      this.showAlert(1);
    }
  }
}
