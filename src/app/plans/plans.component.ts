import {
  Component,
  OnInit,
  ViewEncapsulation,
  OnChanges,
  OnDestroy,
} from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { Router, ActivatedRoute } from "@angular/router";
import { AngularFireAuth } from "@angular/fire/auth";
import { SubscribeService } from "../shared/subscribe.service";
import { UserLoginService } from "../shared/user-login.service";
//import SimpleCrypto from "simple-crypto-js";
import { sKey } from "../extra/sKey";
import { AllCollectionsService } from "../shared/all-collections.service";
import { NgxSpinnerService } from "ngx-spinner";
import * as CryptoJS from "crypto-js";
@Component({
  selector: "app-plans",
  templateUrl: "./plans.component.html",
  styleUrls: ["./plans.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class PlansComponent implements OnInit {
  plans: any = [];
  color = ["white"];
  bg = ["#8bc34a", "#2196f3", "#ffc0cb"];
  plansNameArray: string[] = ["Free", "Pro", "Silver"];
  getUserData: any;
  //---------------------------------
  condition: any;
  token: any;
  conditionArr: string[] = ["purchase", "changes", "update"];
  constructor(
    private afs: AngularFirestore,
    private ps: SubscribeService,
    private router: Router,
    private afAuth: AngularFireAuth,
    private loginService: UserLoginService,
    private activatedRoute: ActivatedRoute,
    private allCol: AllCollectionsService,
    private spinner: NgxSpinnerService
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
    // console.log("get User data from plan Page", this.getUserData);
    //------
    // check uid
    this.afAuth.authState.subscribe((res) => {
      if (res.uid === null) {
        console.log(res);
        this.router.navigate(["/login"]);
      }
    });
  }

  ngOnInit() {
    this.plans = [];
    this.fetchAllPlans();

    //---------------------------------
    //check user come from mobile or not
    this.token = this.activatedRoute.snapshot.params["token"];
  }
  fetchAllPlans() {
    this.spinner.show();
    this.allCol
      .getSubscriptionplans()
      .orderBy("price", "asc")
      .onSnapshot(
        (res) => {
          let a = [];
          res.forEach((q) => {
            const data = q.data();
            const id = q.id;
            a.push({ id, ...data });
          });
          this.plans = a;
          //this.plans.sort((a, b) => a.price < b.price);
          //console.log("after sorting ", this.plans);
          this.spinner.hide();
        },
        (err) => {
          this.spinner.hide();
        }
      );
  }
  checkPlanCondition(plan) {
    return this.token !== "purchase" && plan.id === "Free" ? true : false;
  }
  onNavigate(planName, plan) {
    if (planName !== "Free" && this.token === this.conditionArr[0]) {
      this.router.navigate([`/payment/${planName}/${this.token}`], {
        state: plan,
      });
    } else if (planName === "Free" && this.token === this.conditionArr[0]) {
      this.router.navigate(["panel/dashboard"]);
    } else if (
      planName !== "Free" &&
      (this.token === this.conditionArr[1] ||
        this.token === this.conditionArr[2])
    ) {
      this.router.navigate([`/update-plan/${planName}/${this.token}`]);
    }
  }

  navigateTo() {
    this.router.navigate(["/panel/member-management"]);
  }
}
