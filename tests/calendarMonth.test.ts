import { describe, expect, it } from 'vitest';
import {
  addMonths,
  buildMonthGrid,
  canPageBack,
  canPageForward,
  daysInMonth,
  firstWeekdayOfMonth,
  flowerGlyphFor,
  GARDEN_LAUNCH_MONTH,
  monthIdFromDateKey,
} from '../src/game/screens/calendarMonth';

describe('daysInMonth', () => {
  it('gets ordinary months right', () => {
    expect(daysInMonth({ year: 2026, month: 1 })).toBe(31);
    expect(daysInMonth({ year: 2026, month: 4 })).toBe(30);
  });

  it('handles February in a leap year vs a non-leap year', () => {
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29); // 2028 is a leap year
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2100, month: 2 })).toBe(28); // divisible by 100, not 400
    expect(daysInMonth({ year: 2000, month: 2 })).toBe(29); // divisible by 400
  });

  it('handles December correctly (no year-wrap bug)', () => {
    expect(daysInMonth({ year: 2026, month: 12 })).toBe(31);
  });
});

describe('firstWeekdayOfMonth', () => {
  it('matches known weekdays', () => {
    // 2026-07-01 is a Wednesday.
    expect(firstWeekdayOfMonth({ year: 2026, month: 7 })).toBe(3);
    // 2026-01-01 is a Thursday.
    expect(firstWeekdayOfMonth({ year: 2026, month: 1 })).toBe(4);
  });
});

describe('addMonths', () => {
  it('adds within a year', () => {
    expect(addMonths({ year: 2026, month: 7 }, 1)).toEqual({ year: 2026, month: 8 });
  });

  it('wraps forward across a year boundary', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('wraps backward across a year boundary', () => {
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
  });

  it('handles multi-month deltas in both directions', () => {
    expect(addMonths({ year: 2026, month: 7 }, -8)).toEqual({ year: 2025, month: 11 });
    expect(addMonths({ year: 2026, month: 7 }, 18)).toEqual({ year: 2028, month: 1 });
  });
});

describe('monthIdFromDateKey', () => {
  it('parses year and month, ignoring the day', () => {
    expect(monthIdFromDateKey('2026-07-26')).toEqual({ year: 2026, month: 7 });
  });
});

describe('canPageBack / canPageForward', () => {
  it('refuses to page back at or before the launch month', () => {
    expect(canPageBack(GARDEN_LAUNCH_MONTH)).toBe(false);
    expect(canPageBack(addMonths(GARDEN_LAUNCH_MONTH, -1))).toBe(false);
  });

  it('allows paging back to any month after launch', () => {
    expect(canPageBack(addMonths(GARDEN_LAUNCH_MONTH, 1))).toBe(true);
    expect(canPageBack({ year: 2026, month: 12 })).toBe(true);
  });

  it('refuses to page forward past the current month', () => {
    const current = { year: 2026, month: 7 };
    expect(canPageForward(current, current)).toBe(false);
    expect(canPageForward(addMonths(current, 1), current)).toBe(false);
  });

  it('allows paging forward to any month before the current one', () => {
    const current = { year: 2026, month: 7 };
    expect(canPageForward(addMonths(current, -1), current)).toBe(true);
  });
});

describe('buildMonthGrid', () => {
  it('produces the correct number of leading blanks and day cells', () => {
    // 2026-07-01 is a Wednesday -> 3 leading blanks (Sun, Mon, Tue), then 31 days.
    const cells = buildMonthGrid({ year: 2026, month: 7 }, '2026-07-26', new Set());
    const blanks = cells.filter((c) => c === null);
    const days = cells.filter((c) => c !== null);
    expect(blanks).toHaveLength(3);
    expect(days).toHaveLength(31);
    expect(cells).toHaveLength(34);
  });

  it('handles a leap-year February (29 days, correct offset)', () => {
    // 2028-02-01 is a Tuesday -> 2 leading blanks.
    const cells = buildMonthGrid({ year: 2028, month: 2 }, '2028-02-15', new Set());
    const blanks = cells.filter((c) => c === null);
    const days = cells.filter((c) => c !== null);
    expect(blanks).toHaveLength(2);
    expect(days).toHaveLength(29);
  });

  it('marks today, and only today, as isToday', () => {
    const cells = buildMonthGrid({ year: 2026, month: 7 }, '2026-07-26', new Set());
    const todays = cells.filter((c) => c?.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0]?.dateKey).toBe('2026-07-26');
  });

  it('marks days after today as future and inert, and today/past as playable', () => {
    const cells = buildMonthGrid({ year: 2026, month: 7 }, '2026-07-10', new Set()).filter((c) => c !== null);
    for (const cell of cells) {
      if (!cell) continue;
      if (cell.day < 10) {
        expect(cell.isFuture).toBe(false);
        expect(cell.playable).toBe(true);
      } else if (cell.day === 10) {
        expect(cell.isFuture).toBe(false);
        expect(cell.playable).toBe(true);
        expect(cell.isToday).toBe(true);
      } else {
        expect(cell.isFuture).toBe(true);
        expect(cell.playable).toBe(false);
      }
    }
  });

  it('marks bloomed days and attaches a flower glyph only to them', () => {
    const bloomed = new Set(['2026-07-05', '2026-07-12']);
    const cells = buildMonthGrid({ year: 2026, month: 7 }, '2026-07-26', bloomed).filter((c) => c !== null);
    for (const cell of cells) {
      if (!cell) continue;
      if (cell.dateKey === '2026-07-05' || cell.dateKey === '2026-07-12') {
        expect(cell.bloomed).toBe(true);
        expect(cell.flowerGlyph).not.toBeNull();
      } else {
        expect(cell.bloomed).toBe(false);
        expect(cell.flowerGlyph).toBeNull();
      }
    }
  });

  it('handles a month spanning a year boundary (December)', () => {
    const cells = buildMonthGrid({ year: 2026, month: 12 }, '2026-12-15', new Set());
    const days = cells.filter((c) => c !== null);
    expect(days).toHaveLength(31);
  });
});

describe('flowerGlyphFor', () => {
  it('is deterministic for the same dateKey', () => {
    expect(flowerGlyphFor('2026-07-15')).toBe(flowerGlyphFor('2026-07-15'));
  });

  it('produces a non-empty glyph for dates across all three Thai seasons', () => {
    const dates = ['2026-01-10', '2026-04-10', '2026-07-10', '2026-10-10', '2026-12-10'];
    for (const d of dates) {
      const glyph = flowerGlyphFor(d);
      expect(typeof glyph).toBe('string');
      expect(glyph.length).toBeGreaterThan(0);
    }
  });
});
