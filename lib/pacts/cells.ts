export type DayRow = { day: string; user_id: string; verified: boolean; late: boolean; workout_ids: string[] };
export type CellState = "both" | "me" | "partner" | "none";
export type Cell = {
  day: string; state: CellState; verified: boolean; late: boolean;
  today: boolean; future: boolean; workoutIds: string[];
};

/** Map calendar RPC rows to the 7 cells of WeekCalendar (docs/03_DESIGN_SYSTEM.md). */
export function cellsFor(days: string[], rows: DayRow[], me: string, today: string): Cell[] {
  return days.map((day) => {
    const mine = rows.find((r) => r.day === day && r.user_id === me);
    const theirs = rows.find((r) => r.day === day && r.user_id !== me);
    const state: CellState = mine && theirs ? "both" : mine ? "me" : theirs ? "partner" : "none";
    return {
      day, state,
      verified: Boolean(mine?.verified || theirs?.verified),
      late: Boolean(mine?.late || theirs?.late),
      today: day === today,
      future: day > today,
      workoutIds: [...(mine?.workout_ids ?? []), ...(theirs?.workout_ids ?? [])],
    };
  });
}

export function countDays(rows: DayRow[], user: string) {
  return new Set(rows.filter((r) => r.user_id === user).map((r) => r.day)).size;
}
