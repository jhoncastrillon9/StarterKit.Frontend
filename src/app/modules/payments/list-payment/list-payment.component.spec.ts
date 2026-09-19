import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPaymentComponent } from './list-payment.component';
import { PaymentsModule } from '../payments.module';
import { testProviders } from 'src/testing/test-providers';

describe('ListPaymentComponent', () => {
  let component: ListPaymentComponent;
  let fixture: ComponentFixture<ListPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ListPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
