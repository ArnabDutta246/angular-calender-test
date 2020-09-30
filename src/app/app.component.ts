import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  title = "my-sassy-app";
  options: any = {
    pickMode: 'range'
  };

  onChange($event) {
    console.log($event);
  }
  onSelect($event){
    console.log("onSelect",$event);
  }
  onSelectStart($event){
    console.log("onSelectStart",$event);
  }
  onSelectEnd($event){
    console.log("onSelectEnd",$event);
  }
  onMonthChange($event){
    console.log("onMonthChange",$event);
  }

}
