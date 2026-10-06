import { addDays, mondayOf } from "@/lib/pacts/week";

// Which weekdays (0 = Monday) each frequency trains on.
const PATTERN: Record<number, number[]> = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

/** Dates for `weeks` weeks of a program starting on/after `start`, cycling through the template days. */
export function scheduleDates(start: string, weeks: number, perWeek: number): string[] {
  const offsets = PATTERN[Math.min(7, Math.max(1, perWeek))];
  const monday = mondayOf(start);
  const out: string[] = [];
  for (let w = 0; out.length < weeks * offsets.length; w++) {
    for (const o of offsets) {
      const d = addDays(monday, w * 7 + o);
      if (d >= start && out.length < weeks * offsets.length) out.push(d);
    }
  }
  return out;
}

/** Leading integer of a reps target like "6-8" or "10". */
export const repsTarget = (reps: string) => Number.parseInt(reps, 10) || null;
