import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule } from "@angular/core";
import { environment } from "../environments/environment.prod";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { ApproutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { HttpClientModule } from "@angular/common/http";
import { AngularFireModule } from "@angular/fire";
import { AngularFirestoreModule } from "@angular/fire/firestore";
import { AngularFireStorageModule } from "@angular/fire/storage";
import { AngularFireAuthModule } from "@angular/fire/auth";
//------------------------------------------------------------------
import { CalendarModule } from "./calenders/calendar.module";
import { SweetAlertService } from "./shared/sweet-alert.service";
import { AllCollectionsService } from "./shared/all-collections.service";
import { TextSearchService } from "./shared/text-search.service";
import { AllErrorMsgService } from "./shared/all-error-msg.service";
import { NgxImageCompressService } from "ngx-image-compress";
import { NgxSpinnerModule } from "ngx-spinner";
import { ToastrModule } from "ngx-toastr";
import { GetStartPageComponent } from "./get-start-page/get-start-page.component";
import { PlansComponent } from "./plans/plans.component";
import { SubscribePageComponent } from "./subscribe-page/subscribe-page.component";
import { LoginComponent } from "./auth/login/login.component";
import { RegisterComponent } from "./auth/register/register.component";
import { ResetPasswordComponent } from "./auth/reset-password/reset-password.component";
import { PanelContainerComponent } from "./panel/panel-container/panel-container.component";
import { MobileLoginComponent } from "./allPayments/mobile-payments/mobile-login/mobile-login.component";
import { MobilePaymentComponent } from "./allPayments/mobile-payments/mobile-payment/mobile-payment.component";
import { DashboardComponent } from "./panel/dashboard/dashboard.component";
import { RegisterMemberComponent } from "./panel/admin/register-member/register-member.component";
import { SubscriptionComponent } from "./panel/admin/subscription/subscription.component";
import { UserProfileComponent } from "./panel/user/user-profile/user-profile.component";
import { BroadcastComponent } from "./panel/admin/broadcast/broadcast.component";

import { UpdatePlansComponent } from "./allPayments/update-plans/update-plans.component";
import { PaymentComponent } from "./allPayments/payment/payment.component";
import { ManageRegionsComponent } from './panel/admin/manage-regions/manage-regions.component';
import { ManageYearlyCalenderComponent } from './panel/admin/manage-yearly-calender/manage-yearly-calender.component';
import { SelectMembersComponent } from './panel/admin/select-members/select-members.component';

//.......................................................................

@NgModule({
  declarations: [
    AppComponent,
    GetStartPageComponent,
    PlansComponent,
    SubscribePageComponent,
    PlansComponent,
    LoginComponent,
    RegisterComponent,
    ResetPasswordComponent,
    PanelContainerComponent,
    MobileLoginComponent,
    MobilePaymentComponent,
    DashboardComponent,
    RegisterMemberComponent,
    SubscriptionComponent,
    UserProfileComponent,
    BroadcastComponent,
    SubscribePageComponent,
    UpdatePlansComponent,
    PaymentComponent,
    ManageRegionsComponent,
    ManageYearlyCalenderComponent,
    SelectMembersComponent,
  ],
  imports: [
    BrowserModule,
    BrowserModule,
    BrowserAnimationsModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AngularFireStorageModule,
    AngularFirestoreModule,
    ApproutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ToastrModule.forRoot({
      closeButton: false,
      timeOut: 7000,
    }),
    NgxSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    CalendarModule,
  ],
  providers: [
    SweetAlertService,
    AllCollectionsService,
    TextSearchService,
    AllErrorMsgService,
    NgxImageCompressService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
