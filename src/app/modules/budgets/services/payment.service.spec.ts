import { TestBed } from '@angular/core/testing';

import { PaymentService } from './payment.service';
import { testProviders } from 'src/testing/test-providers';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...testProviders] });
    service = TestBed.inject(PaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
