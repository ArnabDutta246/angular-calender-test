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
@Injectable({
  providedIn: "root",
})
export class AuthGuardAdminService implements CanActivate, CanActivateChild {
  userStatus: any;
  constructor(private loginService: UserLoginService, private router: Router) {}
  //canActivated route configure
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.loginService.isAd().then((res) => {
      if (res) {
        return true;
      } else {
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
