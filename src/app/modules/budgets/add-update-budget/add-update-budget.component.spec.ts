import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateBudgetComponent } from './add-update-budget.component';

describe('AddUpdateBudgetComponent', () => {
  let component: AddUpdateBudgetComponent;
  let fixture: ComponentFixture<AddUpdateBudgetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddUpdateBudgetComponent]
    });
    fixture = TestBed.createComponent(AddUpdateBudgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
