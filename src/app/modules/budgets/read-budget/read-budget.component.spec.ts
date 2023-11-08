import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadBudgetComponent } from './read-budget.component';

describe('ReadBudgetComponent', () => {
  let component: ReadBudgetComponent;
  let fixture: ComponentFixture<ReadBudgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReadBudgetComponent]
    });
    fixture = TestBed.createComponent(ReadBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
