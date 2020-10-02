import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
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
import { SubscribeService } from "../../shared/subscribe.service";
import { ToastrService } from "ngx-toastr";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { NgxSpinnerService } from "ngx-spinner";
//import SimpleCrypto from "simple-crypto-js";
import { environment } from "src/environments/environment.prod";
import { sKey } from "src/app/extra/sKey";
import * as moment from "moment";
import { UserLoginService } from "src/app/shared/user-login.service";
declare var paypal;
import * as CryptoJS from "crypto-js";
@Component({
  selector: "app-payment",
  templateUrl: "./payment.component.html",
  styleUrls: ["./payment.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class PaymentComponent implements OnInit {
  @ViewChild("paypal", { static: true }) paypalElement: ElementRef;
  planId: any;
  subcripId: any;
  user: any;
  a: any;
  noOfFreeLicenseHas: number;
  noOfUserAllowedHas: number;
  oldPlanType: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserUid: string;
  //variables-------
  sPlan: any;
  planName: string;
  planPrice: number;
  planMin: number;
  fixed: number;
  newUserData: any;
  agreement: any;
  planTag: any = [];
  //collection name-----
  getUserData: any;
  basicAuth = environment.paypalBasicUrl; //Pass your ClientId + scret key
  proPlan = "";
  // silverPlan = environment.silverPlan;
  // goldPlan = environment.goldPlan;
  orgNameHere: string;
  initiatedPaypalId: any = "";
  constructor(
    private router: Router,
    private http: HttpClientModule,
    private activatedRoute: ActivatedRoute,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private subscribeService: SubscribeService,
    private toastr: ToastrService,
    private allCol: AllCollectionsService,
    private sl: SweetAlertService,
    private spinner: NgxSpinnerService,
    private loginService: UserLoginService
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
  }

  ngOnInit() {
    //----------------------------------
    //current user data
    const user = this.afAuth.auth.currentUser;
    if (user) {
      this.currentUserUid = user.uid;
      this.currentUserName = user.displayName;
      this.currentUserEmail = user.email;
    } else {
      this.router.navigate(["/login"]);
    }
    console.log("user data", user.displayName);

    //------------------------------------
    const self = this;
    //-------------------------------------
    //---->select plan from params
    this.sPlan = this.activatedRoute.snapshot.params["plan"];
    //-------------------------------------
    //---->get new user data
    //s console.log("current user :", this.subscribeService.newUser);
    this.newUserData = this.subscribeService.newUser;

    //---->functions-------
    this.selectedPlans(this.sPlan);
    this.getSubscriber();

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
          self.getSubcriptionDetails(data.subscriptionID);
        },
        onCancel: function (data) {
          // Show a cancel page, or return to cart
          this.sl.showAlert(
            "error",
            "Sorry!! Paypal payment cancelled,Please try again",
            "Payment Cancelled"
          );
          console.log(data);
          self.storeCancelRecord(data);
        },
        onError: function (err) {
          // Show an error page here, when an error occurs
          this.sl.showAlert(
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
      .doc(`${this.getUserData.subscriberId}`)
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
      subscriberId: this.getUserData.subscriberId,
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

  //-----
  //get selected plans
  selectedPlans(planName: string) {
    this.spinner.show();
    return new Promise((res, rej) => {
      return this.allCol
        .getSubscriptionplans()
        .doc(`${planName}`)
        .get()
        .then((result) => {
          if (result.exists) {
            this.setAll(result);
            this.spinner.hide();
            return res(true);
          }
        })
        .catch((err) => {
          this.spinner.hide();
          console.log(err);
          return rej(false);
        });
    });
  }

  setAll(result) {
    this.planId = result.data().paypalPlanId;
    this.planName = result.id;
    this.planPrice = result.data().price;
    this.planTag = result.data().tags;
    this.planName == "Free" ? (this.planMin = 2) : (this.planMin = 3);
    this.fixed = this.planMin;
  }

  //plan minlicense increment------
  inc() {
    this.planMin += 1;
  }
  //plan minlicense decrement------
  des() {
    if (this.fixed < this.planMin) {
      this.planMin = this.planMin - 1;
    }
  }

  // =========Start Get Subcription Details Method=======================
  getSubcriptionDetails(subcriptionId) {
    const self = this;
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        self.a = JSON.parse(this.responseText);
        console.log(this.responseText);
        self.batchInsertAll(self.a);
      }
    };
    xhttp.open("GET", environment.paypalBillingUrl + subcriptionId, true);
    xhttp.setRequestHeader("Authorization", this.basicAuth);

    xhttp.send();
  }

  // ============END Get Subcription Details Method========================
  //-------------------------------
  //get subscriber data
  getSubscriber() {
    return this.allCol
      .getSubscriberCollection()
      .doc(`${this.getUserData.subscriberId}`)
      .get()
      .then(
        function (query) {
          if (query.exists) {
            this.orgNameHere = query.data().companyName;
            this.noOfUserAllowedHas = query.data().noOfUserAllowed;
            this.noOfFreeLicenseHas = query.data().noOfFreeLicense;
            this.oldPlanType = query.data().subscriptionType;
            return true;
          } else {
            return false;
          }
        }.bind(this)
      );
  }

  //----------------------------------
  //batch all
  batchInsertAll(a) {
    this.spinner.show();
    return new Promise((res, rej) => {
      this.getSubscriber()
        .then((result) => {
          if (result) {
            var batch = this.afs.firestore.batch();
            // cart collection
            const cart = this.allCol
              .getCartCollectionColOnly()
              .doc(`${this.getUserData.subscriberId}`).ref;

            batch.set(cart, {
              initiated: null,
            });
            //transactions collection
            const transactionsId = this.afs.createId();
            const transactions = this.allCol
              .getTransactionCollectionColOnly()
              .doc(`${transactionsId}`).ref;
            batch.set(transactions, {
              paymentStatus: "success",
              timeStamp: new Date(a.status_update_time),
              subscriberId: this.getUserData.subscriberId,
              paypalId: a.id,
              oldValues: {
                noOfUserAllowed: this.noOfUserAllowedHas,
                subscriptionType: this.oldPlanType,
              },
              newValues: {
                noOfUserAllowed: parseInt(a.quantity),
                subscriptionType: this.sPlan,
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
              .doc(`${this.getUserData.subscriberId}`).ref;

            batch.update(subscriber, {
              subscriptionType: this.sPlan,
              noOfUserAllowed: parseInt(a.quantity),
              noOfFreeLicense:
                parseInt(a.quantity) -
                this.noOfUserAllowedHas +
                this.noOfFreeLicenseHas,
              subscriptionStart: new Date(a.status_update_time),
              subscriptionEnd: this.addDays(new Date(), 30),
              paypalId: a.id,
            });

            batch
              .commit()
              .then((result) => {
                this.spinner.hide();
                this.sl.showAlertWithNavigate(
                  "Subscription successfull",
                  "Your subscription plan payment done successfully",
                  "/panel/member-management",
                  "Dashboard",
                  "success"
                );
                //this.router.navigate(["/login"]);
                res(true);
              })
              .catch((err) => {
                this.spinner.hide();
                console.log("batch fail:", err);
                res(false);
              });
          }
        })
        .catch((err) => {
          this.spinner.hide();
          console.log(err);
          rej(err);
        });
    });
  }
  //----------
  // add days 15 days
  addDays(date, days) {
    return new Date(
      moment(date.getTime() + days * 24 * 60 * 60 * 1000).format("YYYY-MM-DD")
    );
  }
  //-------------------------------
  navpage(num: number) {
    num === 1
      ? this.router.navigate(["/plans"])
      : this.router.navigate(["/login"]);
  }
}
