import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiturgyDetail } from './liturgy-detail';

describe('LiturgyDetail', () => {
  let component: LiturgyDetail;
  let fixture: ComponentFixture<LiturgyDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiturgyDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiturgyDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
