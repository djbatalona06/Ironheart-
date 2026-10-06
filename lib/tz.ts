// Timezone helpers shared by server and client. The browser's IANA zone is
// mirrored into the `tz` cookie (components/layout/TzCookie.tsx).
import { addDays, localDate } from "@/lib/pacts/week";

/** Offset (ms) of `tz` from UTC at instant `t`. */
function offsetMs(t: number, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(t).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
}

/** UTC instant of local midnight starting `date` in `tz`. */
export function zonedMidnight(date: string, tz: string): Date {
  const guess = Date.parse(`${date}T00:00:00Z`);
  const first = guess - offsetMs(guess, tz);
  return new Date(guess - offsetMs(first, tz)); // second pass handles DST edges
}

/** [start, end) of a local calendar day as ISO strings. */
export const dayRange = (date: string, tz: string) =>
  [zonedMidnight(date, tz).toISOString(), zonedMidnight(addDays(date, 1), tz).toISOString()] as const;

export const today = (tz: string) => localDate(new Date(), tz);

export function validTz(tz: string | undefined): string {
  try { if (tz) { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } } catch {}
  return "UTC";
}
