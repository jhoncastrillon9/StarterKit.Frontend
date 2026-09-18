import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangePasswordComponent } from './change-password.component';
import { PagesModule } from '../pages.module';
import { testProviders } from 'src/testing/test-providers';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagesModule],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
