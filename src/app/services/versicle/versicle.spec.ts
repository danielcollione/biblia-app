import { TestBed } from '@angular/core/testing';
import { Versicle } from './versicle';

describe('Versicle', () => {
  let service: Versicle;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Versicle);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
