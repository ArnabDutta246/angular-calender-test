import {
  Component,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  ElementRef,
} from "@angular/core";
//import SimpleCrypto from "simple-crypto-js";
import { sKey } from "src/app/extra/sKey";
import { ConnectionService } from "ng-connection-service";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { AngularFirestore } from "@angular/fire/firestore";
import { AllMembersDataService } from "src/app/shared/all-members-data.service";
import { ProfileImageService } from "src/app/shared/profile-image.service";
import { FormBuilder } from "@angular/forms";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";
import { map } from "rxjs/operators";
import { NotificationService } from "src/app/shared/notification.service";
import { UserLoginService } from "src/app/shared/user-login.service";
import * as CryptoJS from "crypto-js";
@Component({
  selector: "app-broadcast",
  templateUrl: "./broadcast.component.html",
  styleUrls: ["./broadcast.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class BroadcastComponent implements OnInit {
  @ViewChild("closeModalButton", { static: true }) closeModalButton: ElementRef;
  @ViewChild("taskDetailsOnlyEdit", { static: true })
  taskDetailOnlyEdit: ElementRef;
  getUserData: any;
  isConnected: any;
  statuss: any;
  allrecipientArr: any = [];
  allMemberArray: any;
  filterMemberArray: any;
  toggleSearch: boolean = false;
  details: any = "";
  toggleState = false;
  constructor(
    private connectionService: ConnectionService,
    private allCol: AllCollectionsService,
    private afs: AngularFirestore,
    public allMemberdata: AllMembersDataService,
    private proImg: ProfileImageService,
    private formBuilder: FormBuilder,
    private sl: SweetAlertService,
    private notification: NotificationService,
    private loginService: UserLoginService
  ) {}

  ngOnInit() {
    //decrytion of session data
    // const data = sessionStorage.getItem("user");
    // const simpleCrypto = new SimpleCrypto(sKey);
    // const obj: any = simpleCrypto.decryptObject(data);
    // const obj: any = this.loginService.returnSessionData();
    // this.getUserData = obj;
    const data = sessionStorage.getItem("user");
    var bytes = CryptoJS.AES.decrypt(data, sKey);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    let getUserData = decryptedData;
    this.getUserData = getUserData;
    //----------------------network check function------------------
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.statuss = "ONLINE";
      } else {
        this.statuss = "OFFLINE";
      }
    });
    this.fetchAllMember(this.getUserData.subscriberId);
  }
  fetchAllMember(id) {
    let users = this.afs
      .collection(this.allCol.users, (ref) =>
        ref
          .where("subscriberId", "==", this.getUserData.subscriberId)
          .where("status", "in", ["ACTIVE", "EXTERNAL"])
      )
      .snapshotChanges();
    users
      .pipe(
        map((actions: any[]) =>
          actions.map((a: any) => {
            let user = {
              ...a.payload.doc.data(),
              checked: true,
            };
            let checked = this.allrecipientArr.findIndex((u, i) => {
              return u.email == user.email;
            }, user);
            if (checked == -1) {
              user.checked = false;
            }
            return { ...user };
          })
        )
      )
      .subscribe((arr) => {
        //  console.log(arr);
        this.allMemberArray = arr;
        this.filterMemberArray = arr;
      });
  }
  //--------------------filter member (search)------------------------
  filterUser(e) {
    let v = e.target.value;
    let value = v.toLowerCase();
    this.allMemberArray = this.filterMemberArray.filter((member) => {
      let name = member.name.toLowerCase();
      return !name.indexOf(value);
    });
  }
  showSearchInput(id: string) {
    const i = document.getElementById(`${id}`);
    if (this.toggleSearch === false) {
      i.classList.remove("d-none");
      this.toggleSearch = true;
    } else {
      i.classList.add("d-none");
      this.toggleSearch = false;
    }
  }
  //----------------------select or remove member-------------
  //-------------------add or remove attendee------------------------
  addOrRemoveRecipient(member) {
    let data = {
      uid: member.uid,
      email: member.email,
      name: member.name,
    };
    if (
      this.allrecipientArr.filter((n) => {
        return n.uid === member.uid;
      }).length > 0
    ) {
      this.allrecipientArr = this.allrecipientArr.filter((n) => {
        return n.uid !== member.uid;
      });
      member.checked = false;
    } else {
      member.checked = true;
      this.allrecipientArr.push(data);
    }
    // console.log(this.allrecipientArr);
  }
  selectAllRecipient() {
    if (this.toggleState !== true) this.allrecipientArr = [];
    this.allMemberArray = this.allMemberArray.map(
      function (n) {
        if (!this.toggleState) {
          this.addOrRemoveRecipient(n);
          return n;
        } else {
          this.addOrRemoveRecipient(n);
          return n;
        }
      }.bind(this)
    );
    this.toggleState = !this.toggleState;
    console.log("after all selection of recipient", this.allMemberArray);
  }
  //-----------------------caching image----------------------
  profileImgErrorHandler(user: any) {
    console.log("profile image", user);
    user.picUrl = "../../../../assets/image/imgs/profile.png";
  }

  profileImageLazyLoading() {
    this.allMemberArray.forEach((m, i) => {
      this.proImg.profileImgErrorHandler(
        m.attendeeList,
        this.getUserData,
        m.attendeeUidList
      );
    });
  }
  //-------------------show network issue-------------
  showNetworkIssue() {
    this.sl.showAlert(
      "error",
      "Your network is too poor or currently you are in offline. Please check your internet connection",
      "Poor Network"
    );
    return false;
  }
  //------------------------resize text area---------------
  resizeDetailsEdit() {
    this.taskDetailOnlyEdit.nativeElement.style.height = "auto";
    this.taskDetailOnlyEdit.nativeElement.style.height =
      this.taskDetailOnlyEdit.nativeElement.scrollHeight + "px";
  }
  sendNotification() {
    for (let data of this.allrecipientArr) {
      let obj = {
        data: { id: data.uid, subscriberId: this.getUserData.subscriberId },
        origin: "broadcast",
        broadcastMsg: this.details,
        title: "Broadcast",
        name: data.name,
      };

      this.notification.createNotifications(obj);
    }
    // Logic to send broadcust message for notifications
    // we can even provide option to share this using email for external users
    // Loop through the selected members and
    this.sl.showAlert(
      "success",
      "Message broadcasted successfully to the selected recipients.",
      "Broadcast Group Message"
    );
    let b: HTMLElement = this.closeModalButton.nativeElement as HTMLElement;
    b.click();
  }
  checkDataEmpty() {
    return this.allrecipientArr.length > 0 && this.details !== ""
      ? true
      : false;
  }
  //----------------------set default state after close------------
  changeState() {
    this.toggleState = false;
    this.allrecipientArr = [];
    this.details = "";
    this.allMemberArray = this.allMemberArray.map(function (n) {
      n.checked = false;
      return n;
    });
  }
}
