import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateComponent } from './add-update.component';
import { PaymentsModule } from '../payments.module';
import { testProviders } from 'src/testing/test-providers';

describe('AddUpdateComponent', () => {
  let component: AddUpdateComponent;
  let fixture: ComponentFixture<AddUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(AddUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
