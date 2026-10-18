import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradingJournal } from './trading-journal';

describe('TradingJournal', () => {
  let component: TradingJournal;
  let fixture: ComponentFixture<TradingJournal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradingJournal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TradingJournal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
