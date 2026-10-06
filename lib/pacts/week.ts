// Calendar-date math for pact weeks. Dates are 'YYYY-MM-DD' strings in the
// pact's timezone; the SQL functions (week_start_of, credit_date) are the
// source of truth for scoring — this is only for rendering.

/** Local calendar date of instant `t` in `tz`. */
export function localDate(t: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export const weekStart = (t: Date, tz: string) => mondayOf(localDate(t, tz));

export const weekDays = (ws: string) => Array.from({ length: 7 }, (_, i) => addDays(ws, i));

/** ISO weekday 1 (Mon) … 7 (Sun) of a calendar date. */
export const isoDow = (date: string) => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
