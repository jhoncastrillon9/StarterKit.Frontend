import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateBudgetComponent } from './add-update-budget.component';
import { BudgetsModule } from '../budgets.module';
import { testProviders } from 'src/testing/test-providers';

describe('AddUpdateBudgetComponent', () => {
  let component: AddUpdateBudgetComponent;
  let fixture: ComponentFixture<AddUpdateBudgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(AddUpdateBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
