import { Component, OnInit, HostListener, OnDestroy } from "@angular/core";
import { SweetAlertService } from "./shared/sweet-alert.service";
import { ConnectionService } from "ng-connection-service";
import { interval } from "rxjs";
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  @HostListener("window:onbeforeunload", ["$event"])
  title = "HRMS";
  status: any = "ONLINE"; //initializing as online by default
  isConnected: any = true;

  options: any = {
    pickMode: "range",
    weekStart: 1,
    from: new Date("2019-01-01"),
    disableWeeks: [0, 6],
    daysConfig: [
      { date: new Date("2020-09-01"), cssClass: "attendance" },
      { date: new Date("2020-09-02"), cssClass: "attendance" },
      { date: new Date("2020-09-03"), cssClass: "attendance" },
      { date: new Date("2020-09-04"), cssClass: "attendance" },
      { date: new Date("2020-09-16"), cssClass: "approvedDate" },
      { date: new Date("2020-09-17"), cssClass: "approvedDate" },
      { date: new Date("2020-09-24"), cssClass: "pendingDate" },
      { date: new Date("2020-09-25"), cssClass: "holiday" },
    ],
  };
  singleDaysEvents: boolean = false;
  onChange($event) {
    console.log($event);
  }
  onSelect($event) {
    console.log("onSelect", $event);
    this.singleDaysEvents = true;
  }
  onSelectStart($event) {
    console.log("onSelectStart", $event);
  }
  onSelectEnd($event) {
    console.log("onSelectEnd", $event);
  }
  onMonthChange($event) {
    console.log("onMonthChange", $event);
  }

  constructor(
    private sl: SweetAlertService,
    private connectionService: ConnectionService
  ) {}
  ngOnInit() {
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.status = "ONLINE";
      } else {
        this.status = "OFFLINE";
        this.sl.showAlert(
          "error",
          "Your network is too poor or currently you are in offline. Please check your internet connection",
          "Poor Network"
        );
      }
    });

    this.checkStillInOffLine();
  }

  /**
   * timer
   * observables pipe for chack
   * hide already active loader
   */
  checkStillInOffLine() {
    const numbers = interval(30000);
    const takeFourNumbers = numbers.pipe();
    takeFourNumbers.subscribe((x) => {
      // console.log("Next: ", x);
      if (this.status === "OFFLINE") {
        this.sl.showAlert(
          "error",
          "Your network is too poor or currently you are in offline. Please check your internet connection.",
          "Poor Network"
        );
      }
    });
  }
}
