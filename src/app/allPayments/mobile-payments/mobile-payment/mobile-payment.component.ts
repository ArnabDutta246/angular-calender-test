import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
} from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import {
  HttpClient,
  HttpHeaders,
  HttpClientModule,
} from "@angular/common/http";
import { Router, ActivatedRoute } from "@angular/router";
import { ToastrService } from "ngx-toastr";
//import SimpleCrypto from "simple-crypto-js";
import * as CryptoJS from "crypto-js";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { NgxSpinnerService } from "ngx-spinner";
import { environment } from "src/environments/environment.prod";
import * as moment from "moment";
import { UserLoginService } from "src/app/shared/user-login.service";
declare let paypal;
@Component({
  selector: "app-mobile-payment",
  templateUrl: "./mobile-payment.component.html",
  styleUrls: ["./mobile-payment.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class MobilePaymentComponent implements OnInit {
  @ViewChild("paypal", { static: true }) paypalElement: ElementRef;
  //letiables-------
  sPlan: any;
  planName: string;
  planPrice: number;
  planMin: number;
  fixed: number;
  newUserData: any;
  uid: any;
  planId: any;
  sub: any;
  subcripId: any;
  user: any;
  a: any;
  noOfFreeLicenseHas: number;
  noOfUserAllowedHas: number;
  oldPlanType: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserUid: string;
  agreement: any;
  planTags: any = [];
  orgNameHere: string;
  //collection name-----
  plancollectionName: string = "subscriptionOptions";
  basicAuth = environment.paypalBasicUrl; //Pass your ClientId + scret key
  initiatedPaypalId: any = "";
  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private router: Router,
    private activateRoute: ActivatedRoute,
    private http: HttpClientModule,
    private toastr: ToastrService,
    private allCol: AllCollectionsService,
    private sl: SweetAlertService,
    private spinner: NgxSpinnerService,
    private loginService: UserLoginService
  ) {}

  ngOnInit() {
    const self = this;
    //------------------
    // let data = this.activateRoute.snapshot.params["data"];
    let uuid = this.activateRoute.snapshot.params["uid"];
    let sPlan = this.activateRoute.snapshot.params["plan"];
    let sub = this.activateRoute.snapshot.params["sub"];
    //----------------------
    // crepto
    let arr = [];
    let secretKey = "someuniquekey";
    //let simpleCrypto = new SimpleCrypto(secretKey);

    var bytes = CryptoJS.AES.decrypt(sub, secretKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    this.sub = decryptedData;
    this.uid = uuid;
    this.sPlan = sPlan;
    //this.sub = simpleCrypto.decrypt(sub);

    console.log("... and then decryption...");
    console.log(
      "Decipher Text : " + this.uid + " " + this.sPlan + " " + this.sub
    );
    //------------------------
    if (this.uid !== "") {
      this.fetchUserData();
      this.getSubscriber();
    }
    console.log(this.uid + "  " + this.sPlan + "  " + this.sub);
    //------------
    //set plan id
    // this.planId = environment.proPlan;
    // if (this.sPlan === "Silver") {
    //   this.planId = environment.silverPlan;
    // } else if (this.sPlan === "Gold") {
    //   this.planId = environment.goldPlan;
    // }

    //functions-------

    this.selectedPlans(this.sPlan);

    //--------------------------------
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
          // this.sl.showAlert(
          //   "success",
          //   "You have successfully created subscription "
          // );
          self.getSubcriptionDetails(data.subscriptionID);
        },
        onCancel: function (data) {
          // Show a cancel page, or return to cart
          this.sl.showAlert(
            "error",
            "Sorry!! Paypal payment cancelled,Please try again",
            "Payment Cancelled"
          );
          //console.log(data);
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
      this.fetchUserData()
        .then((res) => {
          if (res == true) {
            return this.initateStatus(val);
          }
        })
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
    //console.log("after cancel paypal", this.initiatedPaypalId);
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
  //----------------------
  //fetch user data
  fetchUserData() {
    return new Promise((res, rej) => {
      return this.allCol
        .getUserCollection()
        .doc(`${this.uid}_${this.sub}`)
        .get()
        .then(
          function (query) {
            if (query.exists) {
              this.currentUserUid = query.data().uid;
              this.currentUserEmail = query.data().email;
              this.currentUserName = query.data().name;
              return res(true);
            } else {
              this.sl.showAlert(
                "error",
                "User not register in this organization",
                "Not registered"
              );
              this.router.navigate(["/login"]);
              return res(false);
            }
          }.bind(this)
        )
        .catch((err) => {
          console.log(err);
          return rej(false);
        });
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
    this.planName == "Free" ? (this.planMin = 2) : (this.planMin = 3);
    this.planTags = result.data().tags;
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
        // console.log(this.responseText);
        // alert(JSON.stringify(this.responseText));
        self.a = JSON.parse(this.responseText);

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
      .doc(`${this.sub}`)
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
            let batch = this.afs.firestore.batch();
            // cart collection
            const cart = this.allCol
              .getCartCollectionColOnly()
              .doc(`${this.sub}`).ref;

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
              subscriberId: this.sub,
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
              .doc(`${this.sub}`).ref;

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
                this.sl.showAlert(
                  "success",
                  "Subscription successfull",
                  "Thank you for your subscription. Please check the update in mobile app or login here to continue"
                );
                this.loginService.logout();
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
  //-------------------------
  navLogin() {
    this.router.navigate(["/login"]);
  }
}
