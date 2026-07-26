// The single place in the game layer that turns "now" into a Daily Garden
// dateKey ('YYYY-MM-DD'). Every call site (the map's entry button hint, the
// calendar screen, app.ts's goToDailyGarden) must import this rather than
// rolling its own — see the warning below for why.
//
// core/daily.ts stays pure and Date-free on purpose (BLUEPRINT-M9 M9.4b);
// this is where the one unavoidable `new Date()` in the whole Daily Garden
// feature lives.

/**
 * Formats a Date's *local* calendar day as 'YYYY-MM-DD'.
 *
 * Deliberately uses getFullYear/getMonth/getDate, never toISOString() or any
 * other UTC-based conversion. Thailand is UTC+7: toISOString() reports the
 * UTC day, so any time before 07:00 local would be stamped with *yesterday's*
 * date. Mom opening the game at 6am would then be handed yesterday's board
 * and, on winning it, have her bloom land on the wrong square of the
 * calendar — a bug that would look like nothing was wrong until she checked
 * the calendar days later.
 */
export function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's Daily Garden dateKey, from the local clock. */
export function todayDateKey(now: Date = new Date()): string {
  return dateKeyFromDate(now);
}
