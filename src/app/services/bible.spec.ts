import { TestBed } from '@angular/core/testing';

import { Bible } from './bible';

describe('Bible', () => {
  let service: Bible;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Bible);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
