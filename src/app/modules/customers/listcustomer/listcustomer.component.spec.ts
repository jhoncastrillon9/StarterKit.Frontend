import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListcustomerComponent } from './listcustomer.component';

describe('ListcustomerComponent', () => {
  let component: ListcustomerComponent;
  let fixture: ComponentFixture<ListcustomerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListcustomerComponent]
    });
    fixture = TestBed.createComponent(ListcustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
