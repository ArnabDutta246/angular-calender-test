import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  title = "my-sassy-app";
  options: any = {
    pickMode: 'range',
    weekStart: 1,
    from: new Date('2019-01-01'),
    disableWeeks: [0,6],
    daysConfig: [
      {date: new Date('2020-09-01'), cssClass: 'attendance'},
      {date: new Date('2020-09-02'), cssClass: 'attendance'},
      {date: new Date('2020-09-03'), cssClass: 'attendance'},
      {date: new Date('2020-09-04'), cssClass: 'attendance'},
      {date: new Date('2020-09-16'), cssClass: 'approvedDate'},
      {date: new Date('2020-09-17'), cssClass: 'approvedDate'},
      {date: new Date('2020-09-24'), cssClass: 'pendingDate'},
      {date: new Date('2020-09-25'), cssClass: 'holiday'},
    ],

  };

  onChange($event) {
    console.log($event);
  }
  onSelect($event) {
    console.log("onSelect", $event);
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
}
