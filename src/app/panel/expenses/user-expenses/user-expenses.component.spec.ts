import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserExpensesComponent } from './user-expenses.component';

describe('UserExpensesComponent', () => {
  let component: UserExpensesComponent;
  let fixture: ComponentFixture<UserExpensesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserExpensesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserExpensesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
