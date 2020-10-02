import { Injectable, EventEmitter } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { Router } from "@angular/router";
import { SweetAlertService } from "./sweet-alert.service";
import { HttpClient } from "@angular/common/http";
@Injectable({
  providedIn: "root",
})
export class AllCollectionsService {
  notification: string;
  latestAlert: string;
  meetings: string;
  risks: string;
  issues: string;
  tasks: string;
  users: string;
  subscribers: string;
  kpi: string;
  noti: string;
  //-----------all email path--------------
  adminUserRes: any = "https://appsolzone.com/mail/addUser.php";
  userRes: any = "https://appsolzone.com/mail/register.php";
  meetingInvite: any = "https://appsolzone.com/mail/meetingInvite.php";
  meetingUpdate: any = "https://appsolzone.com/mail/updateMeeting.php";
  taskInit: any = "https://appsolzone.com/mail/task.php";
  issueInit: any = "https://appsolzone.com/mail/issue.php";
  riskInit: any = "https://appsolzone.com/mail/risk.php";
  taskUpdate: any = "https://appsolzone.com/mail/updateTask.php";
  issueUpdate: any = "https://appsolzone.com/mail/updateIssue.php";
  riskUpdate: any = "https://appsolzone.com/mail/updateRisk.php";
  commentInit: any = "https://appsolzone.com/mail/comment.php";
  shareMeetingMinutesPath: any = "https://appsolzone.com/mail/minutes.php";
  shareIssuePath: any = "https://appsolzone.com/mail/issueShare.php";
  shareTaskPath: any = "https://appsolzone.com/mail/taskShare.php";
  shareRiskPath: any = "https://appsolzone.com/mail/riskShare.php";

  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private httpClient: HttpClient
  ) {
    this.notification = "/notifications/";
    this.latestAlert = "/latestAlerts/";
    this.users = "users";
    this.subscribers = "subscribers";
    this.noti = "notifications";
  }

  getSubscriptionplans() {
    return this.afs.collection("subscriptionOptions").ref;
  }
  getSubscriberCollection() {
    return this.afs.collection("subscribers").ref;
  }
  getSubscriberCollectionColOnly() {
    return this.afs.collection("subscribers");
  }
  getUserCollection() {
    return this.afs.collection("users").ref;
  }
  getUserCollectionColOnly() {
    return this.afs.collection("users");
  }
  getCartCollction() {
    return this.afs.collection("cart").ref;
  }
  getCartCollectionColOnly() {
    return this.afs.collection("cart");
  }
  getTransactionCollection() {
    return this.afs.collection("transactions").ref;
  }
  getTransactionCollectionColOnly() {
    return this.afs.collection("transactions");
  }

  //-------------------------------
  updateData(collectionName: string, documentId: string, data: any) {
    return new Promise((resolve: any, reject: any) => {
      this.afs
        .collection(collectionName)
        .doc(documentId)
        .update(data)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  //------------sed custom email-----------------------
  sendCustomEmail(path, data) {
    return new Promise((resolve: any, reject: any) => {
      this.httpClient
        .post(path, data, { responseType: "text" as "json" })
        .subscribe((res) => {
          console.log("Email", res);
          resolve(res);
        });
    });
  }
}
