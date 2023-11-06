import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateCustomerComponent } from './add-update-customer.component';

describe('AddUpdateCustomerComponent', () => {
  let component: AddUpdateCustomerComponent;
  let fixture: ComponentFixture<AddUpdateCustomerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddUpdateCustomerComponent]
    });
    fixture = TestBed.createComponent(AddUpdateCustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
