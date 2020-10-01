import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  title = "my-sassy-app";
  options: any = {
    pickMode: "single",
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
}
