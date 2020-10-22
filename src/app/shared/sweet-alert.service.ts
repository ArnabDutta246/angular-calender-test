import { Injectable } from "@angular/core";
import Swal from "sweetalert2";
import { Router } from "@angular/router";
import { AllCollectionsService } from "./all-collections.service";
import { AngularFirestore } from "@angular/fire/firestore";
@Injectable({
  providedIn: "root",
})
export class SweetAlertService {
  constructor(
    private router: Router,
    private allCol: AllCollectionsService,
    private afs: AngularFirestore
  ) {}
  showAlert(response: string, text: string, errorTitle?: string) {
    switch (response) {
      case "success":
        Swal.fire({
          icon: "success",
          title: errorTitle,
          html: text,
          showConfirmButton: true,
          allowOutsideClick: false,
          // timer: 2500,
        });
        break;
      case "error":
        Swal.fire({
          icon: "error",
          title: errorTitle,
          html: text,
          allowOutsideClick: false,
        });
        break;
      case "info":
        Swal.fire({
          icon: "info",
          title: errorTitle,
          html: text,
          showConfirmButton: true,
          allowOutsideClick: false,
        });
        break;
      default:
        break;
    }
  }
  //---------------------
  // show alert for naviagte
  showAlertWithNavigate(
    response: string,
    text: string,
    navigateRoute: any,
    pageName: any,
    iconn: any = "warning"
  ) {
    Swal.fire({
      title: response,
      text: text,
      icon: iconn,
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: `Navigate ${pageName} page`,
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        this.router.navigate([`${navigateRoute}`]);
      }
    });
  }
  //---------------------
  // show alert for naviagte and custom button
  showAlertWithNavigateCustomButton(
    response: string,
    text: string,
    navigateRoute: any,
    pageName: any,
    iconn: any = "warning",
    cancelButtonText: string = "Later"
  ) {
    Swal.fire({
      title: response,
      text: text,
      icon: iconn,
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: cancelButtonText,
      confirmButtonText: `${pageName}`,
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        this.router.navigate([`${navigateRoute}`]);
      }
    });
  }
  //--------------------
  //show alert with return type
  showAlertReturnType(text: string, ques?: string) {
    return Swal.fire({
      title: `${ques}`,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "I agree",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        return true;
      } else {
        return false;
      }
    });
  }
  showAlertReturnTypeWithImage(text: string, img, ques?: string) {
    return Swal.fire({
      title: `Are you sure ${ques}?`,
      text: text,
      imageUrl: img === "" ? "../../assets/image/imgs/profile.png" : img,
      imageWidth: 200,
      imageHeight: 200,
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "I agree!",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        return true;
      }
    });
  }
  //--------------------
  //show alert with return type
  showAlertReturnTypePromise(text: string, ques?: string) {
    return new Promise((resolved, rej) => {
      return Swal.fire({
        title: `${ques}`,
        text: text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "I agree",
        allowOutsideClick: false,
      }).then((result) => {
        if (result.value) {
          return resolved(true);
        } else {
          return resolved(false);
        }
      });
    });
  }
  //-----------------------
  //terms and service alert
  async alertTermsAndService(id, tncVersion, tncLink) {
    const { value: accept } = await Swal.fire({
      html: `Please note that the terms of service has been updated. You can view the new terms of services at the link provided below. <a href='${tncLink}' style='color:blue'>Terms of service</a>`,
      title: "Terms of service",
      input: "checkbox",
      inputValue: "1",
      inputPlaceholder: "I agree with the terms and conditions",
      confirmButtonText: "Agree",
      showCancelButton: true,
      cancelButtonColor: "#d33",
      cancelButtonText: "Later",
      allowOutsideClick: false,
      inputValidator: (result: any) => {
        return !result && "You need to agree with T&C";
      },
    });

    if (accept) {
      this.afs.collection(this.allCol.subscribers).doc(id).update({
        tncVersion: tncVersion,
      });
      this.showAlert(
        "success",
        "You have accept terms of services",
        "Successfully Updated"
      );
    }
  }
  //-----------navigate function----
  navigateAddPage(page) {
    let a = this.showAlertReturnTypePromise(
      "There are changes not saved. Are you sure you would like to exit without saving changes?",
      "Warning"
    ).then((res) => {
      if (res) {
        this.router.navigate([`/panel/${page}`]);
      }
    });
  }
  //------------------poor network error-------------------
  public poorNetwork() {
    this.showAlert(
      "error",
      "Your network is too poor or your in offline.Please check your internet connection",
      "Poor Network"
    );
  }
  //----------- Confirm Alert
  //----------- show alert with return type
  confirmAlert(text: string, ques?: string) {
    return Swal.fire({
      title: `${ques}`,
      html: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.value) {
        return true;
      } else {
        return false;
      }
    });
  }
}
