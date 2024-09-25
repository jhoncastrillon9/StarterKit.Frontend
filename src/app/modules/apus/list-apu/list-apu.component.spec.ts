import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListApuComponent } from './list-apu.component';

describe('ListApuComponent', () => {
  let component: ListApuComponent;
  let fixture: ComponentFixture<ListApuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListApuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListApuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
