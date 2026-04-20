import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersionSelector } from './version-selector';

describe('VersionSelector', () => {
  let component: VersionSelector;
  let fixture: ComponentFixture<VersionSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VersionSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
