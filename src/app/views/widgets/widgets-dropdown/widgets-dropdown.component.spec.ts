import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WidgetsDropdownComponent } from './widgets-dropdown.component';
import { WidgetsModule } from '../widgets.module';
import { testProviders } from 'src/testing/test-providers';

describe('WidgetsDropdownComponent', () => {
  let component: WidgetsDropdownComponent;
  let fixture: ComponentFixture<WidgetsDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetsModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(WidgetsDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
