import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { GetStartPageComponent } from "./get-start-page/get-start-page.component";
import { PlansComponent } from "./plans/plans.component";
import { SubscribePageComponent } from "./subscribe-page/subscribe-page.component";
import { LoginComponent } from "./auth/login/login.component";
import { PaymentComponent } from "./allPayments/payment/payment.component";
import { RegisterComponent } from "./auth/register/register.component";
import { ResetPasswordComponent } from "./auth/reset-password/reset-password.component";
import { AuthGuardAdminService } from "./shared/auth-guard-admin.service";
import { AuthGuardUserService } from "./shared/auth-guard-user.service";
import { PanelContainerComponent } from "./panel/panel-container/panel-container.component";
import { MobileLoginComponent } from "./allPayments/mobile-payments/mobile-login/mobile-login.component";
import { MobilePaymentComponent } from "./allPayments/mobile-payments/mobile-payment/mobile-payment.component";
import { DashboardComponent } from "./panel/dashboard/dashboard.component";
import { RegisterMemberComponent } from "./panel/admin/register-member/register-member.component";
import { AuthGuardPaymentUpdateService } from "./shared/auth-guard-payment-update.service";
import { UserProfileComponent } from "./panel/user/user-profile/user-profile.component";

import { UpdatePlansComponent } from "./allPayments/update-plans/update-plans.component";
import { ManageRegionsComponent } from "./panel/admin/manage-regions/manage-regions.component";
import { UserLeaveComponent } from './panel/leave/user-leave/user-leave.component';

const appRoutes: Routes = [
  { path: "", redirectTo: "/", pathMatch: "full" },
  { path: "", component: GetStartPageComponent },
  { path: "plans/:token", component: PlansComponent },
  { path: "subscribe", component: SubscribePageComponent },
  { path: "login", component: LoginComponent },
  { path: "mobile-login", component: MobileLoginComponent },
  {
    path: "mobile-payment/:uid/:plan/:sub",
    component: MobilePaymentComponent,
  },
  { path: "register", component: RegisterComponent },
  { path: "reset-password", component: ResetPasswordComponent },
  { path: "payment/:plan/:token", component: PaymentComponent },
  {
    path: "update-plan/:plan/:token",
    canActivate: [AuthGuardPaymentUpdateService],
    component: UpdatePlansComponent,
  },
  {
    path: "panel",
    canActivate: [AuthGuardAdminService],
    component: PanelContainerComponent,
    children: [
      {
        path: "member-management",
        canActivateChild: [AuthGuardAdminService],
        component: RegisterMemberComponent,
      },
      {
        path: "regions",
        canActivateChild: [AuthGuardAdminService],
        component: ManageRegionsComponent,
      },
    ],
  },
  {
    path: "panel",
    canActivate: [AuthGuardUserService],
    component: PanelContainerComponent,
    children: [
      {
        path: "dashboard",
        canActivateChild: [AuthGuardUserService],
        component: DashboardComponent,
      },
      {
        path: "user-profile",
        canActivateChild: [AuthGuardUserService],
        component: UserProfileComponent,
      },
      {
        path: "user-leave",
        canActivateChild: [AuthGuardUserService],
        component: UserLeaveComponent,
      }
    ],
  },
];
@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule],
})
export class ApproutingModule {}
