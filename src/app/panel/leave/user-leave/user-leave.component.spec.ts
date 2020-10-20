import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserLeaveComponent } from './user-leave.component';

describe('UserLeaveComponent', () => {
  let component: UserLeaveComponent;
  let fixture: ComponentFixture<UserLeaveComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserLeaveComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserLeaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
