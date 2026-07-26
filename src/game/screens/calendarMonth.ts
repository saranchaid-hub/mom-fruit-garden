// Pure month-grid construction for the Garden Calendar (ปฏิทินสวน,
// ADR-0005 / BLUEPRINT-M9 M9.4b). No DOM, no `new Date()` reading the system
// clock — "today" is always passed in as a dateKey string so this stays unit
// testable without faking system time. The one place that *does* read the
// clock is src/game/dailyDate.ts.

/** A calendar month, 1-based (1 = มกราคม). Deliberately not a Date — a Date
 * can't represent "July 2026" without picking an arbitrary day/time, which
 * invites off-by-one bugs at month boundaries. */
export interface MonthId {
  year: number;
  month: number; // 1-12
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function monthIdFromDateKey(dateKey: string): MonthId {
  const [yearStr, monthStr] = dateKey.split('-');
  return { year: Number(yearStr), month: Number(monthStr) };
}

export function dateKeyFor(monthId: MonthId, day: number): string {
  return `${monthId.year}-${pad2(monthId.month)}-${pad2(day)}`;
}

/** Adds `delta` months to a MonthId, wrapping the year as needed. Negative
 * deltas page backward. */
export function addMonths(monthId: MonthId, delta: number): MonthId {
  const zeroBasedTotal = monthId.year * 12 + (monthId.month - 1) + delta;
  const year = Math.floor(zeroBasedTotal / 12);
  const month = (((zeroBasedTotal % 12) + 12) % 12) + 1;
  return { year, month };
}

export function compareMonthId(a: MonthId, b: MonthId): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

/** Number of days in `monthId`, leap years included — `new Date(y, m, 0)`
 * (m is our 1-based month, so 0-based-next-month) lands on day 0 of that
 * next month, i.e. the last day of the month we actually want. */
export function daysInMonth(monthId: MonthId): number {
  return new Date(monthId.year, monthId.month, 0).getDate();
}

/** JS weekday (0 = Sunday .. 6 = Saturday) of the 1st of `monthId`. */
export function firstWeekdayOfMonth(monthId: MonthId): number {
  return new Date(monthId.year, monthId.month - 1, 1).getDay();
}

// The Daily Garden — and the game itself — didn't exist before this month
// (M0 landed 2026-07-05, per git history). Paging back indefinitely into
// months that could never have had a garden in them is pointless, so paging
// stops here rather than growing unbounded.
export const GARDEN_LAUNCH_MONTH: MonthId = { year: 2026, month: 7 };

export function canPageBack(viewedMonthId: MonthId): boolean {
  return compareMonthId(viewedMonthId, GARDEN_LAUNCH_MONTH) > 0;
}

export function canPageForward(viewedMonthId: MonthId, currentMonthId: MonthId): boolean {
  return compareMonthId(viewedMonthId, currentMonthId) < 0;
}

export interface CalendarDayCell {
  dateKey: string;
  day: number;
  isToday: boolean;
  /** Strictly after today — rendered inert, never clickable. */
  isFuture: boolean;
  /** Today or any past day — playable without limit, per ADR-0005. */
  playable: boolean;
  bloomed: boolean;
  /** Which flower glyph to show, only set when `bloomed` is true. */
  flowerGlyph: string | null;
}

/** `null` marks a leading pad cell (days of the previous month peeking into
 * this month's first calendar row) — rendered blank, never a real day. */
export type CalendarCell = CalendarDayCell | null;

export function buildMonthGrid(
  monthId: MonthId,
  todayKey: string,
  bloomedDateKeys: ReadonlySet<string>,
): CalendarCell[] {
  const leadingBlanks = firstWeekdayOfMonth(monthId);
  const total = daysInMonth(monthId);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= total; day++) {
    const dateKey = dateKeyFor(monthId, day);
    // Plain string comparison is safe here: both sides are zero-padded
    // 'YYYY-MM-DD', which sorts identically to chronological order.
    const isFuture = dateKey > todayKey;
    const bloomed = bloomedDateKeys.has(dateKey);
    cells.push({
      dateKey,
      day,
      isToday: dateKey === todayKey,
      isFuture,
      playable: !isFuture,
      bloomed,
      flowerGlyph: bloomed ? flowerGlyphFor(dateKey) : null,
    });
  }

  return cells;
}

// Small, deliberately simple season -> glyph sets (BLUEPRINT-M9: "ดอกต่างกัน
// ตามฤดู"). Thailand's three real seasons (hot/rainy/cool) rather than a
// four-season year, since that's what CONTEXT.md's Thai vocabulary implies.
// Every glyph is an actual flower — the feature is ดอกไม้ประจำวัน, and this
// square is what she looks at every day for months, so a sheaf of rice or a
// cactus standing in for a bloom would be quietly wrong. All nine are
// Emoji 1.0 (2015), old enough that no phone she might use renders them as
// an empty box; a tofu square on the calendar would be worse than any
// cleverer choice of flower.
const SEASON_FLOWERS: Record<'cool' | 'hot' | 'rainy', readonly string[]> = {
  cool: ['🌼', '🌻', '💐'], // ~พ.ย.-ก.พ., ฤดูหนาว
  hot: ['🌺', '🌷', '🌹'], // ~มี.ค.-พ.ค., ฤดูร้อน
  rainy: ['🌸', '💮', '🏵️'], // ~มิ.ย.-ต.ค., ฤดูฝน
};

function seasonForMonth(month: number): 'cool' | 'hot' | 'rainy' {
  if (month === 12 || month <= 2) return 'cool';
  if (month >= 3 && month <= 5) return 'hot';
  return 'rainy';
}

/** Deterministic flower glyph for a bloomed day: which glyph depends only on
 * the dateKey (season from month, variety from day), so the calendar always
 * renders the same flower for the same day, reload after reload. */
export function flowerGlyphFor(dateKey: string): string {
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const set = SEASON_FLOWERS[seasonForMonth(month)];
  return set[day % set.length] as string;
}
