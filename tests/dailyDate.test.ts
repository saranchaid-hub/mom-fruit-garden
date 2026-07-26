import { describe, expect, it } from 'vitest';
import { dateKeyFromDate, todayDateKey } from '../src/game/dailyDate';

describe('dateKeyFromDate', () => {
  it('formats year/month/day with zero-padding from local date parts', () => {
    expect(dateKeyFromDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKeyFromDate(new Date(2026, 6, 26))).toBe('2026-07-26');
    expect(dateKeyFromDate(new Date(2028, 11, 31))).toBe('2028-12-31');
  });

  it('does not drift across the UTC day boundary: an early-morning local time stays that local day', () => {
    // Thailand is UTC+7. 2026-07-26 00:30 local time is 2026-07-25 17:30 UTC
    // — if this ever used toISOString() (or any UTC conversion) instead of
    // local getters, this would wrongly come out as 2026-07-25.
    const earlyMorningLocal = new Date(2026, 6, 26, 0, 30);
    expect(dateKeyFromDate(earlyMorningLocal)).toBe('2026-07-26');

    // And the reverse: late at night should not roll over to tomorrow.
    const lateNightLocal = new Date(2026, 6, 26, 23, 45);
    expect(dateKeyFromDate(lateNightLocal)).toBe('2026-07-26');
  });

});

describe('todayDateKey', () => {
  it('defaults to formatting the current local date', () => {
    const now = new Date();
    expect(todayDateKey(now)).toBe(dateKeyFromDate(now));
  });

  it('accepts an explicit Date', () => {
    expect(todayDateKey(new Date(2027, 2, 3))).toBe('2027-03-03');
  });
});
