import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdatePlansComponent } from './update-plans.component';

describe('UpdatePlansComponent', () => {
  let component: UpdatePlansComponent;
  let fixture: ComponentFixture<UpdatePlansComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdatePlansComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdatePlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
