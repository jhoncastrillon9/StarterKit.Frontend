import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListcustomerComponent } from './listcustomer.component';
import { CustomersModule } from '../customers.module';
import { testProviders } from 'src/testing/test-providers';

describe('ListcustomerComponent', () => {
  let component: ListcustomerComponent;
  let fixture: ComponentFixture<ListcustomerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomersModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ListcustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
