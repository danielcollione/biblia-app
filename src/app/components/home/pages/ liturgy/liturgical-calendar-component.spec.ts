import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiturgicalCalendarComponent } from './liturgical-calendar-component';

describe('LiturgicalCalendarComponent', () => {
  let component: LiturgicalCalendarComponent;
  let fixture: ComponentFixture<LiturgicalCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiturgicalCalendarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiturgicalCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
