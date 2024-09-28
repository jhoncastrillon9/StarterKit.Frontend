import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetConfigComponent } from './budget-config.component';

describe('BudgetConfigComponent', () => {
  let component: BudgetConfigComponent;
  let fixture: ComponentFixture<BudgetConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
