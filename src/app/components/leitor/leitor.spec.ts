import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Leitor } from './leitor';

describe('Leitor', () => {
  let component: Leitor;
  let fixture: ComponentFixture<Leitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Leitor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Leitor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
