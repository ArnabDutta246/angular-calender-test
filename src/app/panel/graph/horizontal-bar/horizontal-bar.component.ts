import { Component, Input, OnChanges, OnInit } from '@angular/core';

@Component({
  selector: 'app-horizontal-bar',
  templateUrl: './horizontal-bar.component.html',
  styleUrls: ['./horizontal-bar.component.scss']
})
export class HorizontalBarComponent implements OnInit,OnChanges {
  @Input() calendarMeta:any;
  constructor() { }

  ngOnInit() {
  }
  ngOnChanges(){
    this.calendarMeta = this.calendarMeta;
  }

}
