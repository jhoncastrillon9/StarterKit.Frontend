import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecoveryPasswordComponent } from './recovery-password.component';
import { PagesModule } from '../pages.module';
import { testProviders } from 'src/testing/test-providers';

describe('RecoveryPasswordComponent', () => {
  let component: RecoveryPasswordComponent;
  let fixture: ComponentFixture<RecoveryPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(RecoveryPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
