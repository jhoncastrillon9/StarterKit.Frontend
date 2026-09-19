import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyConfigComponent } from './company-config.component';
import { ConfigurationsModule } from '../configurations.module';
import { testProviders } from 'src/testing/test-providers';

describe('CompanyConfigComponent', () => {
  let component: CompanyConfigComponent;
  let fixture: ComponentFixture<CompanyConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
