import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AppComponent } from "./app.component";
import { CalendarModule } from "./calenders/calendar.module";
//import { CalendarModule } from "ion2-calendar";
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, ReactiveFormsModule, CalendarModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
