import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetConfigComponent } from './budget-config.component';
import { ConfigurationsModule } from '../configurations.module';
import { testProviders } from 'src/testing/test-providers';

describe('BudgetConfigComponent', () => {
  let component: BudgetConfigComponent;
  let fixture: ComponentFixture<BudgetConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
