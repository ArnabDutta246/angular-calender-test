import { Component, OnInit } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
//import SimpleCrypto from "simple-crypto-js";
import { SweetAlertService } from "../shared/sweet-alert.service";
import { Router } from "@angular/router";
import { database } from "firebase";
@Component({
  selector: "app-get-start-page",
  templateUrl: "./get-start-page.component.html",
  styleUrls: ["./get-start-page.component.scss"],
})
export class GetStartPageComponent implements OnInit {
  decrypted: object;
  constructor(
    private afs: AngularFirestore,
    private sl: SweetAlertService,
    private router: Router
  ) {
    //-------------------------------
    //test collection / doc
    // let a = this.afs.collection(`subscribers`).ref;
    // a.where("email", "==", "arnab2461997@gmail.com")
    //   .get()
    //   .then(function(a) {
    //     a.forEach(function(a) {
    //       console.log(a.data());
    //     });
    //   });
    //--------------------------------
    //test sweet alert
    //case : success
    // this.sl.showAlert("success", "welcome to meeting min");
    //case:error with navigate
    // this.sl.showAlert(
    //   "confirmNavigate",
    //   "Do You really use this?",
    //   "/login",
    //   "Login"
    // );
    //case:Error
    //this.sl.showAlert("error", "Something goes wrong");
    //case:Alert return type
    // this.sl
    //   .showAlertReturnType("You want to delete this.....")
    //   .then(val => console.log(val));
    //----------------------------
    //cripto test
    // this.nvi();
  }
  // mobile-payment/:uid/:plan/:sub
  ngOnInit() {}

  //----------------------------------------
  //crypto test
  nvi() {
    var _secretKey = "someuniquekey";
    // var simpleCrypto = new SimpleCrypto(_secretKey);

    // let uid = "nUkDsrzBFEYDgcdXKk5U34Suiwk2";
    // let sub = simpleCrypto.encrypt("AMIT123");
    // let plan = "Gold";
    let uid = "nUkDsrzBFEYDgcdXKk5U34Suiwk2";
    //let sub = simpleCrypto.encrypt("AMIT123");
    let plan = "Gold";
    if (plan === "Silver") {
      // this.router.navigate([`/mobile-payment/${uid}/Silver/${sub}`]);
    } else if (plan === "Gold") {
      // this.router.navigate([`/mobile-payment/${uid}/Gold/${sub}`]);
    }
  }
}
