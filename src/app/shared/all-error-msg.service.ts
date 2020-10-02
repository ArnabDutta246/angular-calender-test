import { Injectable } from "@angular/core";
import { SweetAlertService } from "./sweet-alert.service";

@Injectable({
  providedIn: "root",
})
export class AllErrorMsgService {
  //-------------------------------------------------
  public errorArray: string[] = [
    "not exist sid", //0
    "grace period over new registration", //1
    "wrong Password re-enter", //2
    "already exist sid", //3
    "subscribe email used by other org", //4
    "Insufficient Free license", //5
    "Email already user for organisation", //6
    "User already register in other organization", //7
    "User already in this organization", //8
    "grace period in free plan admin", //9
    "greace period in paid plan", //10
    "not registered yet", //11
    "leaver status of user", //12
    "Pending Activation", //13
    "grace period in free plan user", //14
    "unavailable", //15
  ];
  public successArray: string[] = [
    "registration successfull", //0
    "already registered in organization", //1
    "subscription register success", //2
    "verify email", //3
    "Admin user registration success", //4
    "Admin user deactive", //5
    "Admin user request rejected", //6
    "New meeting created successfully", //7
    "Current meeting Updated successfully", //8
    "New risk created successfully", //9
    "New task created successfully", //10
    "Current risk updated successfully", //11
    "Current task updated successfully", //12
    "New issue created successfully", //13
    "Current issue updated successfully", //14
  ];

  constructor(private sl: SweetAlertService) {}
  //---------- function signIn error------------------------
  public signInRegisterError(err) {
    if (err.code == "auth/user-not-found") {
      this.sl.showAlert(
        "error",
        "This user does not exits, please check your credential.",
        "User Not Found"
      );
    } else if (err.code == "auth/network-request-failed") {
      this.sl.showAlert(
        "error",
        "Please check your internet connection to proceed.",
        "Network Error"
      );
    } else if (err.code == "auth/wrong-password") {
      this.sl.showAlert(
        "error",
        "Incorrect user details/password. Please try again.",
        "Password Mismatch"
      );
    } else if (err.code == "auth/email-already-in-use") {
      this.sl.showAlert(
        "error",
        "This email is already used by someone else, please try other email address.",
        "Rogue User"
      );
    } else if (err.code == "auth/too-many-requests") {
      this.sl.showAlert(
        "error",
        "This user entered wrong password too many time.",
        "Too many failed attempt"
      );
    } else {
      this.sl.showAlert(
        "error",
        "Something went wrong, Try Again." + err.toString(),
        "Something went wrong"
      );
    }
  }

  //-------------------------- error message ------------------------------
  public errorMsg(err: string, value?: any) {
    /**
     * for user registration error
     */
    if (err === this.errorArray[0]) {
      this.sl.showAlert(
        "error",
        "There is no such organization by this ID",
        "Wrong Information"
      );
    } else if (err === this.errorArray[1]) {
      this.sl.showAlert(
        "error",
        "Company grace period is over. For renew or upgrade, please contact your admin.",
        "Subscription"
      );
    } else if (err === this.errorArray[2]) {
      this.sl.showAlert(
        "error",
        "Your password is not correct. Please re-type your password.",
        "Wrong Password"
      );
    } else if (err === this.errorArray[3]) {
      /**
       * for oragnisation registration error
       */
      this.sl.showAlert(
        "error",
        "This subscription Id is  exist",
        "Already Exist Subscription Id"
      );
    } else if (err === this.errorArray[4]) {
      this.sl.showAlert(
        "error",
        "This Email is used by other organization",
        "Email Already Used"
      );
    } else if (err === this.errorArray[5]) {
      /**
       * For Admin member registration error
       */
      this.sl.showAlert(
        "error",
        "You have no more free license. You can only add external users now. Please buy additional lincece to add new ACTIVE users.",
        "No free licence available"
      );
    } else if (err === this.errorArray[6]) {
      this.sl.showAlert(
        "error",
        "Sorry! this email already used as organization email..You should update organisation email before this action",
        "Email already use as organization email"
      );
    } else if (err === this.errorArray[7]) {
      this.sl.showAlert(
        "error",
        "The user seems to have registered earlier. Please request the user to Sign up using his/her credentials.",
        "User action required"
      );
    } else if (err === this.errorArray[8]) {
      this.sl.showAlert(
        "error",
        "The user exists for the organisation. Please check member list to take necessary action.",
        "User exists"
      );
    } else if (err === this.errorArray[9]) {
      /**
       * Login page error
       * payment due error
       */
      this.sl.showAlert(
        "error",
        "Your grace period is over.Renew or upgrade your subscription plan to enjoy the benefit",
        "Upgrade Plan"
      );
    } else if (err === this.errorArray[10]) {
      /**
       * refference
       *  title: string,
          text: string,
          navigateRoute: any,
          pageName: any,
          iconn: any = "warning",
          cancelButtonText: string
       */
      this.sl.showAlertWithNavigateCustomButton(
        "Trial Period",
        `Your free plan will expire in ${value} days.Please upgrade your plan to enjoy the benefit`,
        "update-plan",
        "Upgrade",
        "warning",
        "Later"
      );
    } else if (err === this.errorArray[15]) {
      this.sl.showAlert(
        "info",
        `Your free plan will expire in ${value} days. Please contact your admin to upgrade the subscription.`,
        "Trial Period"
      );
    } else if (err === this.errorArray[11]) {
      this.sl.showAlert(
        "info",
        `You company in ${value} days grace period.Contact with Admin.`,
        "Renew Subscription"
      );
    } else if (err === this.errorArray[16]) {
      this.sl.showAlertWithNavigateCustomButton(
        "Renew Subscription",
        `You company in ${value} days grace period.Clear your due payment to enjoy the benefit`,
        "update-plan",
        "Upgrade",
        "warning",
        "Later"
      );
    } else if (err === this.errorArray[12]) {
      this.sl.showAlert(
        "error",
        "Sorry! Your are not register in this organizatin",
        "Not Registered Yet"
      );
    } else if (err === this.errorArray[13]) {
      this.sl.showAlert(
        "error",
        "You already left this organization.For Getting access permission contact with your admin",
        "Account Retricted"
      );
    } else if (err === this.errorArray[14]) {
      this.sl.showAlert(
        "error",
        "Your account is pending activation by Admin. Please liaise with Admin",
        "Pending Activation"
      );
    } else if (err === "unavailable") {
      this.sl.showAlert(
        "error",
        "Failed to get document because the client is offline.",
        "Loose Network"
      );
    } else {
      this.sl.showAlert(
        "error",
        "Something went wrong, Try Again.",
        "Something went wrong"
      );
    }
  }
  //-------------------------- success message ------------------------------
  public successMsg(success: string, value?: any) {
    if (success === this.successArray[0]) {
      this.sl.showAlert(
        "success",
        "You have been registered successfully, Please log in..",
        "Successfully registered"
      );
    } else if (success === this.successArray[1]) {
      this.sl.showAlertWithNavigate(
        "Already Registered",
        "You are already in this organization.Do you want to log in?",
        "/login",
        "Login"
      );
    } else if (success === this.successArray[2]) {
      this.sl.showAlert(
        "success",
        "Successfully Organisation data register",
        "Registration successfully"
      );
    } else if (success === this.successArray[3]) {
      this.sl.showAlert(
        "info",
        "A Verification email sent to your email address.Please check and verify your email id",
        "Please verify your email"
      );
    } else if (success === this.successArray[4]) {
      this.sl.showAlert(
        "success",
        `User has been added successfully and instruction has been sent to him for account activation and login. Please request the user to check all folders, categories including the spam folder of the mailbox for the email`,
        "User Added Successfully"
      );
    } else if (success === this.successArray[6]) {
      this.sl.showAlert(
        "success",
        `User has been added as external user. He / She will receive the updates, but, will not have access to the application. To provide him access, please add them as Organization User`,
        "User Added As External"
      );
    } else if (success === this.successArray[5]) {
      const texted =
        value === "EXTERNAL"
          ? "User will not be able to login to the application as External User.However he will continue to receive the notification and updates"
          : "User will not be able to login to the application anymore";
      const title =
        value === "EXTERNAL"
          ? "The user approved as external"
          : value === "LEAVER"
          ? "User left"
          : "User suspended";
      this.sl.showAlert("info", `${texted}`, `${title}`);
    } else if (success === this.successArray[6]) {
      this.sl.showAlert(
        "info",
        `User will not be able to login to the application anymore`,
        `User request rejected`
      );
    } else if (success === this.successArray[7]) {
      /**
       * create new meeting success alert
       */
      this.sl.showAlert(
        "success",
        "New meeting created successfully",
        "Created Successfully"
      );
    } else if (success === this.successArray[8]) {
      this.sl.showAlert(
        "success",
        "This Meeting's data Updated Successfully",
        "Updated"
      );
    } else if (success === this.successArray[9]) {
      this.sl.showAlert(
        "success",
        "New risk created successfully",
        "Created Successfully"
      );
    } else if (success === this.successArray[10]) {
      this.sl.showAlert(
        "success",
        "New task created successfully",
        "Created Successfully"
      );
    } else if (success === this.successArray[11]) {
      this.sl.showAlert(
        "success",
        "This risk's data updated successfully",
        "Updated"
      );
    } else if (success === this.successArray[12]) {
      this.sl.showAlert(
        "success",
        "This task's data updated successfully",
        "Updated"
      );
    } else if (success === this.successArray[13]) {
      /**
       * create new meeting success alert
       */
      this.sl.showAlert(
        "success",
        "New issue created successfully",
        "Created Successfully"
      );
    } else if (success === this.successArray[14]) {
      this.sl.showAlert(
        "success",
        "This issues's data Updated Successfully",
        "Updated"
      );
    }
  }
  //--------------------------return type------------------------------
  public returnTypeArray: string[] = ["Admin Creation Ask"];
  public retureTypeInfo(msg) {
    if (msg === this.returnTypeArray[0]) {
      return this.sl.showAlertReturnType(
        "Are you you want to create another admin user. or select user?",
        "Admin Creation"
      );
    }
  }
}
