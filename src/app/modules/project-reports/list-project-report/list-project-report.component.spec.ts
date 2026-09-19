import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListProjectReportComponent } from './list-project-report.component';
import { testProviders } from 'src/testing/test-providers';

describe('ListProjectReportComponent', () => {
  let component: ListProjectReportComponent;
  let fixture: ComponentFixture<ListProjectReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListProjectReportComponent],
      providers: [...testProviders],
    }).compileComponents();

    fixture = TestBed.createComponent(ListProjectReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
