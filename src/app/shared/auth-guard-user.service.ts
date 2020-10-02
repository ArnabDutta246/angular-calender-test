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
export class AuthGuardUserService implements CanActivate, CanActivateChild {
  userStatus: any;
  constructor(
    private loginService: UserLoginService,
    private router: Router,
    private afAuth: AngularFireAuth
  ) {}
  //canActivated route configure
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.loginService.isUs().then((res) => {
      if (res) {
        // console.log(this.loginService.isUs());
        return true;
      } else {
        //  console.log(this.loginService.isUs());
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
