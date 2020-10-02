import { FormGroup, AbstractControl, FormControl } from "@angular/forms";
import { AngularFirestore } from "@angular/fire/firestore";
import { map } from "rxjs/operators";
import * as moment from "moment";
// custom validator to check that two fields match
export class CustomValidator {
  constructor(private afs: AngularFirestore) {}
  //---------------validate password
  static validatePass(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors.validatePass) {
        // return if another validator has already found an error on the matchingControl
        return;
      }

      // set error on matchingControl if validation fails
      if (control.value !== null) {
        if (control.value !== matchingControl.value) {
          matchingControl.setErrors({ validatePass: true });
        } else {
          matchingControl.setErrors(null);
        }
      }
    };
  }
  //---------------validate email
  static validateEmail(subscriberEmail: string) {
    return (formgroup: FormGroup) => {
      const subEmail = formgroup.controls[subscriberEmail];
      if (subEmail.errors && !subEmail.errors.validateEmail) {
        return;
      }

      //set error
      if (subEmail !== null) {
        return subEmail.setErrors({ validateEmail: true });
      } else {
        return subEmail.setErrors(null);
      }
    };
  }
  //---------------validate date formet
  static validateDate(date: any) {
    return (formgroup: FormGroup) => {
      const datee = formgroup.controls[date];
      if (datee.errors && !datee.errors.validateDate) {
        return;
      }
      //set error
      if (datee.value !== null) {
        if (moment(datee.value).isValid()) {
          console.log(moment(datee.value).isValid());
          return datee.setErrors(null);
        } else {
          return datee.setErrors({ validateDate: true });
        }
      }
    };
  }
  // ---------------validate start & end--
  static startTimeEndTimeCheck() {
    return (formgroup: FormGroup) => {
      const meetingStartTime = formgroup.get("meetingStartTime");
      const meetingEndTime = formgroup.get("meetingEndTime");

      console.log(
        "new date check is after",
        moment(meetingEndTime.value, "HH:mm:ss").isAfter(
          moment(meetingStartTime.value, "HH:mm:ss")
        )
      );
      console.log(
        "new date check is same",
        moment(meetingEndTime.value, "HH:mm:ss").isSameOrBefore(
          moment(meetingStartTime.value, "HH:mm:ss")
        )
      );
      if (
        meetingEndTime.errors &&
        !meetingEndTime.errors.startTimeEndTimeCheck
      ) {
        return;
      }
      //set error
      if (meetingStartTime !== null) {
        return moment(meetingEndTime.value, "HH:mm:ss").isSameOrBefore(
          moment(meetingStartTime.value, "HH:mm:ss")
        )
          ? meetingEndTime.setErrors({ startTimeEndTimeCheck: true })
          : meetingEndTime.setErrors(null);
      } else {
        return meetingEndTime.setErrors({ startTimeEndTimeCheck: true });
      }
    };
  }
  // ---------------validate start end all
  static startTimeEndTimeCheckTwo(start, end) {
    return (formgroup: FormGroup) => {
      const StartTime = formgroup.controls[start];
      const EndTime = formgroup.controls[end];
      console.log(
        "end gsdjhfkjshd",
        moment(EndTime.value) > moment(StartTime.value)
      );

      if (EndTime.errors && !EndTime.errors.startTimeEndTimeCheckTwo) {
        return;
      }
      //set error
      if (StartTime !== null) {
        return parseFloat(moment(EndTime.value).format("DD/MM/YYYY")) >
          parseFloat(moment(StartTime.value).format("DD/MM/YYYY"))
          ? EndTime.setErrors(null)
          : EndTime.setErrors({ startTimeEndTimeCheckTwo: true });
      } else {
        return EndTime.setErrors({ startTimeEndTimeCheckTwo: true });
      }
    };
  }
  //---------------validate occurence no
  static occurenceCheck(occurence: any) {
    return (formgroup: FormGroup) => {
      const occuren = formgroup.controls[occurence];
      if (occuren.errors && !occuren.errors.occurenceCheck) {
        return;
      }
      //set error
      return occuren.value <= 30
        ? occuren.setErrors(null)
        : occuren.setErrors({ occurenceCheck: true });
    };
  }
}
