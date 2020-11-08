import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { ConnectionService } from "ng-connection-service";
import { NgxSpinnerService } from "ngx-spinner";
import { map } from "rxjs/operators";
import { CountryCode } from "src/app/extra/country-code";
import { AllCollectionsService } from "src/app/shared/all-collections.service";
import { AllErrorMsgService } from "src/app/shared/all-error-msg.service";
import { AllMembersDataService } from "src/app/shared/all-members-data.service";
import { SweetAlertService } from "src/app/shared/sweet-alert.service";

@Component({
  selector: "app-manage-regions",
  templateUrl: "./manage-regions.component.html",
  styleUrls: ["./manage-regions.component.scss"],
})
export class ManageRegionsComponent implements OnInit {
  @ViewChild("manageRegionPanel", { static: false })
  manageRegionPanel: ElementRef;
  @ViewChild("manageYearCalenderPanel", { static: false })
  manageYearCalenderPanel: ElementRef;
  //variables
  country: any = CountryCode;
  regionCount: number = 0;
  getUserData: any;
  status = "ONLINE"; //initializing as online by default
  isConnected = true;
  pageObj: any = {
    // this object contains all variables of editing mode
    addCountryMode: false,
    newCountry: "",
    newRegionData: {
      addRegionOf: "",
      region: "",
      description: "",
    },
    haveCountries: [],
  };
  forYearlyCalender=null;
  constructor(
    private allMemberDataService: AllMembersDataService,
    private connectionService: ConnectionService,
    private alertMessage: SweetAlertService,
    private allCol: AllCollectionsService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.country = CountryCode.sort((a, b) => (a.Name > b.Name ? 1 : -1));
    this.getUserData = this.allMemberDataService.getCurrLogUserData();
    //----------------------network check function------------------
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      if (this.isConnected) {
        this.status = "ONLINE";
      } else {
        this.status = "OFFLINE";
      }
    });
    //---------------------get user regions-------------------------
    this.getUserRegions();
  }

  //-----------------------get user regions-----------------------
  getUserRegions() {
    this.spinner.show();
    if ((this.status = "ONLINE")) {
      this.allCol.afs
        .collection(this.allCol._REGIONS, (ref) =>
          ref.where("subscriberId", "==", this.getUserData.subscriberId)
        )
        .snapshotChanges()
        .pipe(
          map((actions: any[]) =>
            actions.map((a: any) => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              this.regionCount += data.region ? data.region.length : 0;
              return { id, ...data };
            })
          )
        )
        .subscribe((data) => {
          if (this.getUserData.role == "ADMIN") {
            this.pageObj.haveCountries = data;
          }
          // else if (this.session.user.leaveAdmin) {
          //   let leaveAdmin = this.session.user.leaveAdmin;
          //   let regionCodes = Object.keys(leaveAdmin);
          //   this.pageObj.haveCountries = data.filter((d) => {
          //     let region = d.region.filter((r) =>
          //       regionCodes.includes(
          //         d.country + "_" + r.code.replace(/[^A-Za-z]/g, "")
          //       )
          //     );
          //     if (region.length > 0) {
          //       d.region = region;
          //       return true;
          //     } else {
          //       return false;
          //     }
          //   });
          // } else {
          //   // expense admin user
          //   let expenseAdmin = this.session.user.expenseAdmin;
          //   let regionCodes = Object.keys(expenseAdmin);
          //   this.pageObj.haveCountries = data.filter((d) => {
          //     let region = d.region.filter((r) =>
          //       regionCodes.includes(
          //         d.country + "_" + r.code.replace(/[^A-Za-z]/g, "")
          //       )
          //     );
          //     if (region.length > 0) {
          //       d.region = region;
          //       return true;
          //     } else {
          //       return false;
          //     }
          //   });
          // }
          this.spinner.hide();
        });
    } else {
      // network check failed

      this.showNetworkIssue();
    }
  }

  // add a new country
  // condition 1: Need network checking
  // condition 2: Make confirmation
  // condition 3: check if already exits or not // requires for double click
  saveNewCountry() {
    if (navigator.onLine) {
      // network check
      if (this.pageObj.newCountry) {
        // check if country selected
        this.alertMessage
          .confirmAlert(
            "Confirmation needed",
            "Are you sure you want to add a new country?"
          )
          .then((check) => {
            if (check) {
              // confirmed to add new country
              let pos = this.pageObj.haveCountries
                .map(function (e) {
                  return e.country;
                })
                .indexOf(this.country[this.pageObj.newCountry].Iso2);
              if (pos == -1) {
                // if not previously exists
                this.spinner.show(); // loader on
                this.allCol
                  .adddata(this.allCol._REGIONS, {
                    // add data now
                    subscriberId: this.getUserData.subscriberId, // subscriber id
                    country: this.country[this.pageObj.newCountry].Iso2, // country code
                    countryName: this.country[this.pageObj.newCountry].Name, // country name
                    region: [], // for all regions
                    generalHoliday: [], // for general holidays in this country
                  })
                  .then(() => {
                    // update successful
                    this.pageObj.addCountryMode = false; // hide country adding field

                    this.spinner.hide(); // loader off
                  })
                  .catch((err) => {
                    // update failed
                    this.alertMessage.showAlert(
                      "error",
                      err,
                      "Please try again"
                    ); // show why error
                    //console.log(err);
                    this.spinner.hide(); // loader off
                  });
              } else {
                // if previously exists
                this.alertMessage.showAlert(
                  "info",
                  "Already exists",
                  "This country already exists."
                );
              }
            }
          })
          .catch(() => {
            this.pageObj.addCountryMode = false;
          }); // does not want to add new country
      } else {
        // country not selected
        this.alertMessage.showAlert(
          "info",
          "Please select a country to add.",
          "No country selected"
        );
      }
    } else {
      // network not available
      this.alertMessage.poorNetwork();
    }
  }
  // delete a country data
  // condition 1: check internet
  // condition 2: make delete confirmation
  // shut down the loader
  deleteCoutryData(id, country) {
    if (this.status === "ONLINE") {
      // naetwork check
      this.alertMessage
        .confirmAlert(
          "Confirmation",
          "Are you sure you want to delete " + country + "."
        )
        .then((event) => {
          if (event) {
            this.spinner.show();
            // delete from database
            this.allCol.afs
              .collection(this.allCol._REGIONS)
              .doc(id)
              .delete()
              .then(() => {
                // delete successfull
                this.spinner.hide(); // hide loader
              })
              .catch((err) => {
                // delete failed
                this.alertMessage.showAlert("error", err, "Please try again"); // show why error
                console.log(err);
                this.spinner.hide(); // loader off
              });
          }
        })
        .catch((err) => {}); // do nothing when 'no' clicks
    } else {
      // network not available
      this.alertMessage.poorNetwork();
    }
  }

  // add new region under a country
  // condition 1: check internet
  // condition 2: check if this region already exists
  // condition 3: check both fields are given
  // condition 4: update data
  addnewRegionFnc() {
    if (this.status === "ONLINE") {
      // network check
      // get the country under which user is adding new region
      let pos = this.pageObj.haveCountries
        .map(function (e) {
          return e.id;
        })
        .indexOf(this.pageObj.newRegionData.addRegionOf);
      // data of that country
      let dataOf = this.pageObj.haveCountries[pos];
      if (
        this.pageObj.newRegionData.region.trim(" ") != "" ||
        this.pageObj.newRegionData.description != ""
      ) {
        // check for blank fields
        // check if this region already exsts or not by taking the position in region array
        pos = dataOf.region
          .map(function (e) {
            return e.code;
          })
          .indexOf(this.pageObj.newRegionData.region);
        if (pos == -1) {
          // position not found means doesnot exsits
          let objFor = {
            code: this.pageObj.newRegionData.region.trim(" "),
            desc: this.pageObj.newRegionData.description,
          };
          dataOf.region.push(objFor);
          this.spinner.show(); // start the loader
          this.allCol
            .updateData(this.allCol._REGIONS, dataOf.id, {
              region: dataOf.region,
            })
            .then((res) => {
              // region add successfull
              // reset all data in region filed
              this.pageObj.newRegionData.addRegionOf = "";
              this.pageObj.newRegionData.region = "";
              this.pageObj.newRegionData.description = "";
              this.spinner.hide(); // stop the loader
            })
            .catch((err) => {
              // region add failed
              this.spinner.hide(); // stop the loader
              this.alertMessage.showAlert("error", err, "Please try again"); // why failed
            });
        } else {
          // region already exsits
          this.alertMessage.showAlert(
            "info",
            "You already have " +
              this.pageObj.newRegionData.region.trim(" ") +
              " under " +
              dataOf.countryName,
            "Already have"
          );
        }
      } else {
        // blank field found
        this.alertMessage.showAlert(
          "error",
          "Please note that both region name and description are mandatory to create a region. Please check region name, description and try again",
          "Missing data"
        );
      }
    } else {
      // failed to check internet
      this.alertMessage.poorNetwork();
    }
  }
  visitToYearCalenderSet(id, cCode, cName, regCode, regdesc) {
    let b: HTMLElement = this.manageYearCalenderPanel
      .nativeElement as HTMLElement;
    b.click();
    if(this.getUserData.role == "ADMIN"){
      this.forYearlyCalender= {
        data: this.getUserData,
        countryData: {
          region: regCode,
          regDesc: regdesc,
          documentId: id,
          countryCode: cCode,
          countryName: cName
        }
      }
    }else{
     this.forYearlyCalender= {
        data: this.getUserData,
        countryData: {
          region: regCode,
          regDesc: regdesc,
          countryCode: cCode,
          countryName: cName
        }
      }
    }
  }
  backToManageRegion() {
let b: HTMLElement = this.manageRegionPanel.nativeElement as HTMLElement;
    b.click();
  }
  //-------------------show network issue-------------
  showNetworkIssue() {
    this.spinner.hide();
    this.alertMessage.poorNetwork();
    return false;
  }
}
