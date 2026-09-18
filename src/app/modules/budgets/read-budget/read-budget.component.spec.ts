import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadBudgetComponent } from './read-budget.component';
import { BudgetsModule } from '../budgets.module';
import { testProviders } from 'src/testing/test-providers';

describe('ReadBudgetComponent', () => {
  let component: ReadBudgetComponent;
  let fixture: ComponentFixture<ReadBudgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
