import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateCustomerComponent } from './add-update-customer.component';
import { CustomersModule } from '../customers.module';
import { testProviders } from 'src/testing/test-providers';

describe('AddUpdateCustomerComponent', () => {
  let component: AddUpdateCustomerComponent;
  let fixture: ComponentFixture<AddUpdateCustomerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomersModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(AddUpdateCustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
