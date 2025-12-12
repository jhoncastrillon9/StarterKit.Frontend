import { TestBed } from '@angular/core/testing';
import { ListBudgetHistoryComponent } from './list-budget-history.component';

describe('ListBudgetHistoryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListBudgetHistoryComponent ]
    })
    .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ListBudgetHistoryComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
