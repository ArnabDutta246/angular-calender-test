import { Component, OnInit, ViewEncapsulation } from "@angular/core";

import { NgxSpinnerService } from "ngx-spinner";
//import SimpleCrypto from "simple-crypto-js";
import { sKey } from "src/app/extra/sKey";
import { UserLoginService } from "src/app/shared/user-login.service";
@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class DashboardComponent implements OnInit {
  getUserData: any = null;
  data: any[] = [];
  getData: any;
  constructor(
    private spinner: NgxSpinnerService,
    private loginService: UserLoginService
  ) {
    //decrytion of session data
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // console.log(simpleCrypto.decryptObject(data));
    // const obj: any = simpleCrypto.decryptObject(data);
    // const obj: any = this.loginService.returnSessionData();
    // this.getUserData = obj;
  }

  ngOnInit() {
    // this.spinner.show();
    this.loginService.returnSessionDataCommon().then(
      function (res) {
        this.getUserData = res;
        console.log(this.getUserData);
        this.fetchKpiData(this.getUserData);
      }.bind(this)
    );
  }
}
