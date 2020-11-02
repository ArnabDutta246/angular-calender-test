import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLeaveCalenderComponent } from './admin-leave-calender.component';

describe('AdminLeaveCalenderComponent', () => {
  let component: AdminLeaveCalenderComponent;
  let fixture: ComponentFixture<AdminLeaveCalenderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminLeaveCalenderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminLeaveCalenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
