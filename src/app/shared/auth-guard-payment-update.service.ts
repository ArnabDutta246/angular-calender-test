import { Injectable } from "@angular/core";
import {
  CanActivate,
  CanActivateChild,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";
import { Observable, BehaviorSubject } from "rxjs";
import { UserLoginService } from "./user-login.service";
import { AngularFireAuth } from "@angular/fire/auth";
@Injectable({
  providedIn: "root",
})
@Injectable({
  providedIn: "root",
})
export class AuthGuardPaymentUpdateService
  implements CanActivate, CanActivateChild {
  userStatus: any;
  constructor(private loginService: UserLoginService, private router: Router) {}
  //canActivated route configure
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.loginService.isPay().then((res) => {
      if (res) {
        //  console.log(this.loginService.isPay());
        return true;
      } else {
        // console.log(this.loginService.isPay());
        this.router.navigate(["/login"]);
        return false;
      }
    });
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(route, state);
  }
}
