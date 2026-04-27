import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EbookPage } from './ebook-page';

describe('EbookPage', () => {
  let component: EbookPage;
  let fixture: ComponentFixture<EbookPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EbookPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EbookPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
