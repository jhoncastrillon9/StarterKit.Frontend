import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListBudgetHistoryComponent } from './list-budget-history.component';
import { BudgetHistoryModule } from '../budget-history.module';
import { testProviders } from 'src/testing/test-providers';

describe('ListBudgetHistoryComponent', () => {
  let component: ListBudgetHistoryComponent;
  let fixture: ComponentFixture<ListBudgetHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetHistoryModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ListBudgetHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
