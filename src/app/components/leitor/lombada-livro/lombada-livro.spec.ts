import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LombadaLivro } from './lombada-livro';

describe('LombadaLivro', () => {
  let component: LombadaLivro;
  let fixture: ComponentFixture<LombadaLivro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LombadaLivro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LombadaLivro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
