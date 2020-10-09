import {
  Component,
  OnInit,
  ViewEncapsulation,
  HostListener,
} from "@angular/core";
import { UserLoginService } from "src/app/shared/user-login.service";
import { environment } from "src/environments/environment";
//import SimpleCrypto from "simple-crypto-js";
import * as CryptoJS from "crypto-js";
import { sKey } from "src/app/extra/sKey";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFirestore } from "@angular/fire/firestore";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { map } from "rxjs/operators";
import { NotificationService } from "src/app/shared/notification.service";
import { interval } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { ConnectionService } from "ng-connection-service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import * as moment from "moment";
import * as firebase from "firebase";

@Component({
  selector: "app-panel-container",
  templateUrl: "./panel-container.component.html",
  styleUrls: ["./panel-container.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class PanelContainerComponent implements OnInit {
  showNavMenu: boolean = false;
  currentUser: any;
  userNotificationInfo: any;
  userDocId: string = "";
  allNotification = [];
  userAttendeeList = [];
  originArr: string[] = ["meetings", "risks", "issues", "tasks", "broadcast"];
  currTime: any = new Date();
  getUserData: any;
  currUserPic: any = "";
  //-----------check online/offline
  status = "ONLINE"; //initializing as online by default
  isConnected = true;
  //---------------------------
  innerWidth: any;
  constructor(
    private loginService: UserLoginService,
    private afs: AngularFirestore,
    private allCol: AllCollectionsService,
    private notification: NotificationService,
    private toastr: ToastrService,
    private connectionService: ConnectionService,
    private sl: SweetAlertService
  ) {
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // const obj: any = simpleCrypto.decryptObject(data);
    const obj: any = this.loginService.returnSessionData();
    this.getUserData = obj;
  }
  @HostListener("window:resize", ["$event"])
  onResize(event?) {
    this.innerWidth = window.innerWidth;
    // if (this.innerWidth < 1200) this.sideNavOpen();
  }
  collapse: boolean = true;
  ngOnInit() {
    //----------------------network check function------------------
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.status = "ONLINE";
      } else {
        this.status = "OFFLINE";
      }
    });
    //decrytion of session data
    const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // const obj: any = simpleCrypto.decryptObject(data);
    // let getUserData = obj;
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    let getUserData = decryptedData;
    this.currentUser = getUserData;
    this.userDocId = this.currentUser.uid + "_" + this.currentUser.subscriberId;
    // this.callCloudFunction();
    //console.log(".........current user data...........", this.currentUser);
    //-----------get curr user data--------------
    if (this.userDocId !== "") {
      let currD$ = this.afs
        .collection(this.allCol.users)
        .doc(this.userDocId)
        .snapshotChanges();
      currD$
        .pipe(
          map((a) => {
            dataa = a.payload.data();
          })
        )
        .subscribe(() => {
          this.currentUser = dataa;
        });
      //-----------------------notification data for user----------------
      let dataa;
      let users$ = this.afs
        .collection(this.allCol.notification)
        .doc(this.userDocId)
        .snapshotChanges();
      users$
        .pipe(
          map((a) => {
            dataa = a.payload.data();
          })
        )
        .subscribe(() => {
          this.userNotificationInfo = dataa;
          // console.log(this.userNotificationInfo);
        });

      //-----------------------notification of user----------------
      this.afs
        .collection(
          this.allCol.notification + this.userDocId + this.allCol.latestAlert
        )
        .snapshotChanges()
        .pipe(
          map((actions: any[]) =>
            actions.map((a: any) => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              if (
                data.Origin == "meetings" &&
                data.msgBody.includes("%meetingStart%")
              ) {
                data.msgBody = data.msgBody.replace(
                  "%meetingStart%",
                  moment(data.refValues.meetingStart.seconds * 1000).format(
                    "lll"
                  )
                );
              }
              return { id, ...data };
            })
          )
        )
        .subscribe(
          function (responce) {
            this.allNotification = [];
            this.allNotification = responce;
            this.allNotification.sort(
              (a, b) => b.notificationTime.seconds - a.notificationTime.seconds
            );
            //console.log(this.allNotification);
          }.bind(this)
        );
    }
    setInterval(() => {
      this.currTime = new Date();
    }, 1000);

    this.initService();

    this.onResize();
  }

  // accept_meeting(meetingData, i) {
  //   if (this.status === "ONLINE") {
  //     // console.log("whole meeting data", meetingData.refValues.meetingId);
  //     let data;
  //     let users$ = this.afs
  //       .collection(this.allCol.meetings)
  //       .doc(`${meetingData.refValues.meetingId}`)
  //       .snapshotChanges();
  //     users$
  //       .pipe(
  //         map((a) => {
  //           data = a.payload.data();
  //         })
  //       )
  //       .subscribe(() => {
  //         this.userAttendeeList = data.attendeeList;
  //         //  console.log(this.userAttendeeList);
  //         this.update_attendeeList(
  //           meetingData.refValues.meetingId,
  //           i,
  //           meetingData
  //         );
  //       });
  //   } else {
  //     this.showNetworkIssue();
  //   }
  // }
  // update_attendeeList(docId: string, index, data) {
  //   var i;
  //   // console.log("get DocId", docId);
  //   for (i = 0; i < this.userAttendeeList.length; i++) {
  //     if (this.userAttendeeList[i].uid == this.currentUser.uid) {
  //       let obj = {
  //         attendance: false,
  //         email: this.userAttendeeList[i].email,
  //         name: this.userAttendeeList[i].name,
  //         picUrl: this.userAttendeeList[i].picUrl,
  //         uid: this.userAttendeeList[i].uid,
  //         accepted: "accept",
  //       };

  //       this.userAttendeeList.splice(i, 1);
  //       this.userAttendeeList.splice(i, 0, obj);
  //     }
  //   }

  //   this.allCol
  //     .updateData(this.allCol.meetings, docId, {
  //       attendeeList: this.userAttendeeList,
  //     })
  //     .then(() => {
  //       this.allNotification.splice(index, 1);
  //       this.notification.clearNotification(data);
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
  // }

  // reject_dismiss(data, i) {
  //   if (this.status === "ONLINE") {
  //     this.allNotification.splice(i, 1);
  //     //  console.log("Notification id", data);
  //     data.Origin === "meetings" && data.Actions.Action1 === "Decline"
  //       ? this.notification.recordMeetingResponse(
  //           data,
  //           this.getUserData,
  //           "decline"
  //         )
  //       : this.notification.clearNotification(data);
  //   } else {
  //     this.showNetworkIssue();
  //   }
  // }

  //-------------------------
  //logout
  logOut() {
    this.loginService.logout();
  }
  // ---------------------side navbar on/off
  sideNavOpen() {
    this.showNavMenu = !this.showNavMenu;
    // const sideNv = document.getElementById("sideNav");
    // const allContent = document.getElementById("allContent");
    // if (this.collapse) {
    //   sideNv.style.left = -280 + "px";
    //   this.collapse = false;
    // } else {
    //   sideNv.style.left = 0 + "px";
    //   this.collapse = true;
    // }
  }
  // ---------------------side navbar on/off
  //----------------------open notification
  openNotification() {
    document.getElementById("mySidenav").style.height = "100%";
    document.getElementById("mySidenav").style.top = "0";
    document.getElementById("clsBtn").style.top = "0";
    // console.log("open notificaion");
  }
  closeNotification() {
    document.getElementById("mySidenav").style.height = "0%";
    document.getElementById("mySidenav").style.top = "-105px";
    document.getElementById("clsBtn").style.top = "-100px";
  }
  //----------------------open notification
  //----------------------profile image setting----------
  profileImgErrorHandler(user: any) {
    user.picUrl = "../../../assets/image/imgs/profile.png";
  }
  //-----------------------check internet speed---------------
  initService() {
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    const numbers = interval(270000);
    const takeFourNumbers = numbers.pipe();
    takeFourNumbers.subscribe((x) => {
      if (conn) {
        if (conn.saveData) {
          // do something
        }
        const connectionlist = ["slow-2g", "2g", "3g", "4g"];
        const effectiveType = conn.effectiveType;
        console.log(effectiveType);
        if (
          effectiveType !== connectionlist[3] &&
          effectiveType !== connectionlist[2]
        ) {
          this.toastr.warning("Please check your connection", "Slow Internet");
        }
      }
    });
  }

  //-------------------show network issue-------------
  showNetworkIssue() {
    this.sl.showAlert(
      "error",
      "Your network is too poor.Please check your internet connection",
      "Poor Network"
    );
    return false;
  }
  //----------------------------------------------------
  callCloudFunction() {
    let users$ = this.afs
      .collection(this.allCol.subscribers)
      .doc(this.getUserData.subscriberId)
      .snapshotChanges();
    users$
      .pipe(
        map((a: any) => {
          let data: any = a.payload.data();
          return data;
        })
      )
      .subscribe((data) => {
        if (
          !data.overDueDate ||
          moment(data.overDueDate.seconds * 1000).format("LL") <
            moment().format("LL")
        ) {
          try {
            // Use the function name from Firebase
            const callable = firebase
              .functions()
              .httpsCallable("overDueFunction");

            // Create an Observable and pass any data you want to the function
            const obs = callable({ userData: this.getUserData });
          } catch (e) {
            console.log(e);
          }
        }
      });
  }
}
