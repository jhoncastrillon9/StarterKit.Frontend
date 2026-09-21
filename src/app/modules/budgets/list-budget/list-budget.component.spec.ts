import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListBudgetComponent } from './list-budget.component';
import { BudgetsModule } from '../budgets.module';
import { testProviders } from 'src/testing/test-providers';

describe('ListBudgetComponent', () => {
  let component: ListBudgetComponent;
  let fixture: ComponentFixture<ListBudgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ListBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
