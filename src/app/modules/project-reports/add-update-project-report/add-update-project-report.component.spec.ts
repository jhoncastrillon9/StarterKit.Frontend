import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateProjectReportComponent } from './add-update-project-report.component';
import { testProviders } from 'src/testing/test-providers';

describe('AddUpdateProjectReportComponent', () => {
  let component: AddUpdateProjectReportComponent;
  let fixture: ComponentFixture<AddUpdateProjectReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdateProjectReportComponent],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(AddUpdateProjectReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
