import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageYearlyCalenderComponent } from './manage-yearly-calender.component';

describe('ManageYearlyCalenderComponent', () => {
  let component: ManageYearlyCalenderComponent;
  let fixture: ComponentFixture<ManageYearlyCalenderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageYearlyCalenderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageYearlyCalenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
