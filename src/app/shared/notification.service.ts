import { Injectable } from "@angular/core";
import * as moment from "moment";
import { AngularFirestore } from "@angular/fire/firestore";
import { AllCollectionsService } from "./all-collections.service";
import { SweetAlertService } from "./sweet-alert.service";

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  getUserData: any;
  constructor(
    private afs: AngularFirestore,
    private allCol: AllCollectionsService,
    private sl: SweetAlertService
  ) {
    // this.fetchMember();
  }
  getNotifications(eventInfo) {
    // triggering event info can be anything, but should include the following
    // origin: meetings, risks, issues, tasks
    // eventType: add, assignowner, update,
    // data: data related to the notification
    // prevData: for updates if required supply previous data
    switch (eventInfo.origin) {
      case "meetings":
        return this.getMeetingNotifications(eventInfo);
        break;
      case "tasks":
        return this.getTaskNotifications(eventInfo);
        break;
      case "issues":
        return this.getIssueNotifications(eventInfo);
        break;
      case "risks":
        return this.getRiskNotifications(eventInfo);
        break;
      case "broadcast":
        return this.getBroadcastNotifications(eventInfo);
        break;
    }
  }
  getMeetingsMessage(eventInfo: any, userEventType: any) {
    // eventInfo.data to include meeting start time, meeting end time
    let message = "";
    if (userEventType == "add") {
      message =
        "You have been invited to meeting '" +
        eventInfo.data.meetingTitle +
        "' to be held on %meetingStart%" +
        " . For further details, please open the app and check the Meetings section.";
    } else if (userEventType == "update") {
      message =
        "The meeting details of '" +
        eventInfo.data.meetingTitle +
        "' has been updated.";
      message +=
        eventInfo.data.meetingStart != eventInfo.prevData.meetingStart
          ? "The meeting is now rescheduled to be held on %meetingStart%" + " ."
          : "";
      message +=
        " For further details, please open the app and check the Meetings section.";
    } else if (userEventType == "assignowner") {
      message =
        "You have been requested to conduct the meeting '" +
        eventInfo.data.meetingTitle +
        "' to be held on %meetingStart%" +
        " by " +
        eventInfo.prevData.ownerId.name +
        ". For further details, please open the app and check the Meetings section.";
    }

    return message;
  }

  getTasksMessage(eventInfo: any, userEventType: any) {
    // eventInfo.data to include meeting start time, meeting end time
    let message = "";
    if (userEventType == "assignowner") {
      message =
        "Task '" +
        eventInfo.data.taskTitle +
        "' has been assigned to you. For further details, please open the app and check the Tasks section.";
    } else if (userEventType == "update") {
      message =
        "The task details of '" +
        eventInfo.data.taskTitle +
        "' has been updated. For further details, please open the app and check the Meetings section.";
    }

    return message;
  }

  getIssuesMessage(eventInfo: any, userEventType: any) {
    // eventInfo.data to include meeting start time, meeting end time
    let message = "";
    if (userEventType == "assignowner") {
      message =
        "Issue '" +
        eventInfo.data.issueTitle +
        "' has been assigned to you. For further details, please open the app and check the Issues section.";
    } else if (userEventType == "update") {
      message =
        "The issue details of '" +
        eventInfo.data.issueTitle +
        "' has been updated. For further details, please open the app and check the Issues section.";
    }

    return message;
  }

  getRisksMessage(eventInfo: any, userEventType: any) {
    // eventInfo.data to include meeting start time, meeting end time
    let message = "";
    if (userEventType == "assignowner") {
      message =
        "Risk '" +
        eventInfo.data.riskTitle +
        "' has been assigned to you. For further details, please open the app and check the Risks section.";
    } else if (userEventType == "update") {
      message =
        "The risk details of '" +
        eventInfo.data.riskTitle +
        "' has been updated. For further details, please open the app and check the Risks section.";
    }

    return message;
  }
  getMeetingNotifications(eventInfo) {
    let newNotifications = [];
    // create notification if the meetingowner changed
    if (
      eventInfo.eventType == "update" &&
      eventInfo.data.ownerId.uid != eventInfo.prevData.ownerId.uid
    ) {
      let _newOwnerAlertObj = {
        notificationref:
          eventInfo.data.ownerId.uid + "_" + eventInfo.data.subscriberId,
        notificationTime: new Date(),
        msgBody: this.getMeetingsMessage(eventInfo, "assignowner"),
        name: eventInfo.data.ownerId.name,
        Origin: eventInfo.origin,
        docId: eventInfo.data.id,
        Actions: { Action1: "Dismiss" },
        refValues: {
          meetingId: eventInfo.data.id,
          title: eventInfo.data.meetingTitle,
          meetingStart: eventInfo.data.meetingStart,
        },
        sendEmailData: {
          userEventType: "assignowner",
          ownerId: { ...eventInfo.data.ownerId },
          prevOwner: { ...eventInfo.prevData.ownerId },
        },
      };
      newNotifications.push(_newOwnerAlertObj);
    }
    // need to create notifications for each of the attendees
    eventInfo.data.attendeeList.forEach((mp) => {
      if (mp.uid) {
        // lets check whether the user is newly added or existing user
        let userEventType = "add";
        if (eventInfo.eventType == "update") {
          let isExisting = eventInfo.prevData.attendeeList.findIndex((u, i) => {
            return u.uid == mp.uid;
          }, mp);
          if (isExisting != -1) {
            userEventType = "update";
          }
        }
        let _newAlertObj = {
          notificationref: mp.uid + "_" + eventInfo.data.subscriberId,
          notificationTime: new Date(),
          msgBody: this.getMeetingsMessage(eventInfo, userEventType),
          name: mp.name,
          attendee: mp,
          Origin: eventInfo.origin,
          docId: eventInfo.data.id,
          Actions:
            userEventType == "add"
              ? { Action1: "Accept", Action2: "Decline" }
              : { Action1: "Dismiss" },
          refValues: {
            meetingId: eventInfo.data.id,
            title: eventInfo.data.meetingTitle,
            meetingStart: eventInfo.data.meetingStart,
          },
          sendEmailData: {
            userEventType,
            ownerId: { ...eventInfo.data.ownerId },
            attendee: { ...mp },
          },
        };
        newNotifications.push(_newAlertObj);
      }
    });

    return newNotifications;
  }

  getTaskNotifications(eventInfo) {
    let newNotifications = [];
    // List of users to send notifications
    let taskFollowers = [];
    taskFollowers.push({ taskOwner: true, ...eventInfo.data.taskOwner });
    if (
      eventInfo.eventType == "update" &&
      eventInfo.updatedBy.uid != eventInfo.data.taskInitiator.uid
    ) {
      taskFollowers.push({ taskOwner: false, ...eventInfo.data.taskInitiator });
    }
    // need to create notifications for each of the task followers
    taskFollowers.forEach((mp) => {
      if (mp.uid) {
        // lets check whether the user is newly added or existing user
        let userEventType =
          (mp.taskOwner && eventInfo.eventType == "add") ||
          (mp.taskOwner &&
            eventInfo.eventType == "update" &&
            eventInfo.data.taskOwner.uid != eventInfo.prevData.taskOwner.uid)
            ? "assignowner"
            : "update";
        let _newAlertObj = {
          notificationref: mp.uid + "_" + eventInfo.data.subscriberId,
          notificationTime: new Date(),
          msgBody: this.getTasksMessage(eventInfo, userEventType),
          name: mp.name,
          Origin: eventInfo.origin,
          docId: eventInfo.data.id,
          Actions: { Action1: "Dismiss" },
          refValues: {
            taskId: eventInfo.data.id,
            title: eventInfo.data.taskTitle,
          },
          read: false,
        };
        newNotifications.push(_newAlertObj);
      }
    });

    return newNotifications;
  }

  getIssueNotifications(eventInfo) {
    let newNotifications = [];
    // List of users to send notifications
    let issueFollowers = [];
    issueFollowers.push({ issueOwner: true, ...eventInfo.data.issueOwner });
    if (
      eventInfo.eventType == "update" &&
      eventInfo.updatedBy.uid != eventInfo.data.issueInitiator.uid
    ) {
      issueFollowers.push({
        issueOwner: false,
        ...eventInfo.data.issueInitiator,
      });
    }
    // need to create notifications for each of the task followers
    issueFollowers.forEach((mp) => {
      if (mp.uid) {
        // lets check whether the user is newly added or existing user
        let userEventType =
          (mp.issueOwner && eventInfo.eventType == "add") ||
          (mp.issueOwner &&
            eventInfo.eventType == "update" &&
            eventInfo.data.issueOwner.uid != eventInfo.prevData.issueOwner.uid)
            ? "assignowner"
            : "update";
        let _newAlertObj = {
          notificationref: mp.uid + "_" + eventInfo.data.subscriberId,
          notificationTime: new Date(),
          msgBody: this.getIssuesMessage(eventInfo, userEventType),
          name: mp.name,
          Origin: eventInfo.origin,
          docId: eventInfo.data.id,
          Actions: { Action1: "Dismiss" },
          refValues: {
            taskId: eventInfo.data.id,
            title: eventInfo.data.issueTitle,
          },
          read: false,
        };
        newNotifications.push(_newAlertObj);
      }
    });

    return newNotifications;
  }

  getRiskNotifications(eventInfo) {
    let newNotifications = [];
    // List of users to send notifications
    let riskFollowers = [];
    riskFollowers.push({ riskOwner: true, ...eventInfo.data.riskOwner });
    if (
      eventInfo.eventType == "update" &&
      eventInfo.updatedBy.uid != eventInfo.data.riskInitiator.uid
    ) {
      riskFollowers.push({ riskOwner: false, ...eventInfo.data.riskInitiator });
    }
    // need to create notifications for each of the task followers
    riskFollowers.forEach((mp) => {
      if (mp.uid) {
        // lets check whether the user is newly added or existing user
        let userEventType =
          (mp.riskOwner && eventInfo.eventType == "add") ||
          (mp.riskOwner &&
            eventInfo.eventType == "update" &&
            eventInfo.data.riskOwner.uid != eventInfo.prevData.riskOwner.uid)
            ? "assignowner"
            : "update";
        let _newAlertObj = {
          notificationref: mp.uid + "_" + eventInfo.data.subscriberId,
          notificationTime: new Date(),
          msgBody: this.getRisksMessage(eventInfo, userEventType),
          name: mp.name,
          Origin: eventInfo.origin,
          docId: eventInfo.data.id,
          Actions: { Action1: "Dismiss" },
          refValues: {
            riskId: eventInfo.data.id,
            title: eventInfo.data.riskTitle,
          },
          read: false,
        };
        newNotifications.push(_newAlertObj);
      }
    });

    return newNotifications;
  }
  getBroadcastNotifications(eventInfo) {
    let newNotifications = [];

    let _newAlertObj = {
      notificationref: eventInfo.data.id + "_" + eventInfo.data.subscriberId,
      notificationTime: new Date(),
      msgBody: eventInfo.broadcastMsg,
      name: eventInfo.name,
      Origin: eventInfo.origin,
      docId: "",
      Actions: { Action1: "Dismiss" },
      refValues: { broadcastId: "", title: eventInfo.title },
    };
    newNotifications.push(_newAlertObj);

    return newNotifications;
  }
  // Get the list of users for which the alerts to be created and create the required alerts
  createNotifications(eventInfo: any) {
    let notificationid;
    let notifications = this.getNotifications(eventInfo);
    return new Promise((resolve: any, reject: any) => {
      // initiate a btach
      let batch = this.afs.firestore.batch(); // initiate batch
      // Loop through the notifications to populate notifications
      notifications.forEach((msg) => {
        //set user data
        // let userRef = this.afs
        //   .collection(this.allCol.notification)
        //   .doc(msg.notificationref).ref;
        // batch.set(userRef, {
        //   uid: msg.notificationref,
        // });
        // set the document for the item in concern
        notificationid = eventInfo.data.id + moment.utc();
        let itemRef = this.afs
          .collection(this.allCol.notification)
          .doc(msg.notificationref)
          .collection(this.allCol.latestAlert)
          .doc(notificationid).ref;

        // Now remove notificationref from msg

        // Keeping this reference as this is required to get FCM device key
        // from users collection for the user
        // delete msg.notificationref;
        batch.set(itemRef, msg);
        if (eventInfo.origin === "meetings") {
          this.sendEmail(eventInfo, msg.sendEmailData, notificationid);
        }
      });

      batch
        .commit()
        .then(() => {
          console.log("success");

          resolve(true);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  }
  //-------------------------------------
  sendEmail(eventInfo: any, sendEmailData: any, notificationid: any) {
    if (
      eventInfo.origin === "meetings" &&
      sendEmailData &&
      sendEmailData.userEventType === "add"
    ) {
      let uid_sid =
        sendEmailData.attendee.uid + "_" + eventInfo.data.subscriberId;
      this.allCol
        .sendCustomEmail(this.allCol.meetingInvite, {
          toEmail: sendEmailData.attendee.email,
          toName: sendEmailData.attendee.name,
          initiator: eventInfo.data.ownerId.name,
          orgName: eventInfo.data.subscriberId,
          urlAccept:
            "https://ocurrenshub.firebaseapp.com/meeting-response/accept/" +
            notificationid +
            "/" +
            uid_sid,
          urlReject:
            "https://ocurrenshub.firebaseapp.com/meeting-response/reject/" +
            notificationid +
            "/" +
            uid_sid,
          urlTentative:
            "https://ocurrenshub.firebaseapp.com/meeting-response/tentative/" +
            notificationid +
            "/" +
            uid_sid,
          meetingTitle: eventInfo.data.meetingTitle,
          initationDate:
            moment
              .utc(eventInfo.data.meetingStart)
              .format("MMM DD, YYYY h:mm a") + " UTC",
          targetCompletionDate:
            moment
              .utc(eventInfo.data.meetingEnd)
              .format("MMM DD, YYYY h:mm a") + " UTC",
          status: eventInfo.data.status,
        })
        .then((sent: any) => {
          console.log(sent);
        });
    } else if (
      eventInfo.origin === "meetings" &&
      sendEmailData &&
      sendEmailData.userEventType === "update"
    ) {
      this.allCol
        .sendCustomEmail(this.allCol.meetingUpdate, {
          toEmail: sendEmailData.attendee.email,
          toName: sendEmailData.attendee.name,
          initiator: eventInfo.data.ownerId.name,
          orgName: eventInfo.data.subscriberId,
          meetingTitle: eventInfo.data.meetingTitle,
          initationDate:
            moment
              .utc(eventInfo.data.meetingStart)
              .format("MMM DD, YYYY h:mm a") + " UTC",
          targetCompletionDate:
            moment
              .utc(eventInfo.data.meetingEnd)
              .format("MMM DD, YYYY h:mm a") + " UTC",
          status: eventInfo.data.status,
        })
        .then((sent: any) => {
          console.log(sent);
        });
    } else if (
      eventInfo.origin === "meetings" &&
      sendEmailData &&
      sendEmailData.userEventType === "assignowner"
    ) {
      this.allCol
        .sendCustomEmail(this.allCol.meetingUpdate, {
          toEmail: sendEmailData.ownerId.email,
          toName: sendEmailData.ownerId.name,
          initiator: eventInfo.prevData.ownerId.name,
          orgName: eventInfo.data.subscriberId,
          meetingTitle:
            eventInfo.data.meetingTitle + " (assigned meeting owner)",
          initationDate:
            moment
              .utc(eventInfo.data.meetingStart)
              .format("MMM DD, YYYY h:mm a") + " UTC",
          targetCompletionDate:
            moment
              .utc(eventInfo.data.meetingEnd)
              .format("MMM DD, YYYY h:mm a") + " UTC",
          status: eventInfo.data.status,
        })
        .then((sent: any) => {
          console.log(sent);
        });
    }
  }
  //---------------------------
  clearNotification(notification) {
    this.afs
      .collection(this.allCol.notification)
      .doc(notification.notificationref)
      .collection(this.allCol.latestAlert)
      .doc(notification.id)
      .delete()
      .then((res) => {
        // Nothing pending ENJOY THE LIFE!!!!! PHEW!!!
      })
      .catch((err) => {
        this.sl.showAlert(
          "error",
          "Unexpected error occured! Please try again.",
          "Fail"
        );
      });
  }

  recordMeetingResponse(notification: any, userData: any, response: any) {
    console.log("Input values", notification, userData, response);
    // let meeting$ = this.allCol.afs.collection(this.allCol._COLL_MEETING).doc(notification.refValues.meetingId);

    let rlDocRef = this.afs.firestore
      .collection(this.allCol.meetings)
      .doc(notification.refValues.meetingId);

    return this.afs.firestore
      .runTransaction(
        function (transaction) {
          // This code may get re-run multiple times if there are conflicts related to rlDocRef.
          return transaction.get(rlDocRef).then((doc) => {
            if (doc.exists) {
              let meetingData = doc.data();
              let attendeeList = meetingData.attendeeList;
              console.log("Input promise doc ", meetingData, attendeeList);
              // Now check the attendee data and change it to
              let attendeePos = attendeeList.findIndex(
                (u, i) => u.uid == userData.uid,
                userData
              );
              console.log("Input promise doc attendeePos", attendeePos);
              if (attendeePos != -1) {
                let attendee = attendeeList[attendeePos];
                // change the acceptance to true
                Object.assign(attendee, { accepted: response });
                // now replace the array element with splice
                attendeeList.splice(attendeePos, 1, attendee);
                console.log("attendeeList ", attendeeList, attendeePos);
                // Now update the document with merge option true as we only intend to update the attendeelist
                transaction.update(rlDocRef, { attendeeList: attendeeList });
                // So remove the notification
                if (["accept", "decline"].includes(response)) {
                  // this.sfp.defaultAlert("Accept","Before adding to calendar.");
                  let calendarData = {
                    meetingEnd: meetingData.meetingEnd,
                    meetingStart: meetingData.meetingStart,
                    ...notification,
                  };
                  if (response == "accept") {
                    // this.addCalendarEvent(calendarData);
                    this.clearNotification(calendarData);
                  } else {
                    this.clearNotification(calendarData);
                    // this.deleteCalendarEvent(calendarData);
                  }
                } else {
                  this.clearNotification(notification);
                }
              }
            } else {
              // doc.data() will be undefined in this case
              console.log("No such document!");
              this.clearNotification(notification);
            }
          });
        }.bind(this)
      )
      .then(
        function (res) {
          // Now safely delete the ference from the queue
          console.log(
            "Transaction successfully committed!",
            notification.refValues.meetingId
          );
          return true;
        }.bind(this)
      )
      .catch(
        function (error) {
          console.log(
            "Transaction failed: ",
            notification.refValues.meetingId,
            error
          );
          this.sl.showAlert(
            "error",
            "Unexpected error occured! Please try again.",
            "Fail"
          );
          return false;
        }.bind(this)
      );
  }
}
