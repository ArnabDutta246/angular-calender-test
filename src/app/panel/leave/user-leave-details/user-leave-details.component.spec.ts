import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserLeaveDetailsComponent } from './user-leave-details.component';

describe('UserLeaveDetailsComponent', () => {
  let component: UserLeaveDetailsComponent;
  let fixture: ComponentFixture<UserLeaveDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserLeaveDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserLeaveDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
