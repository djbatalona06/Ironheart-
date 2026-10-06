import { describe, expect, test } from "vitest";
import { cellsFor, countDays } from "./cells";
import { addDays, isoDow, localDate, mondayOf, weekStart, weekDays } from "./week";

describe("week math", () => {
  test("Sunday night in New York is still the previous week", () => {
    // 2026-10-05 03:00Z = Sun Oct 4, 11pm EDT
    expect(weekStart(new Date("2026-10-05T03:00:00Z"), "America/New_York")).toBe("2026-09-28");
    expect(weekStart(new Date("2026-10-05T04:00:00Z"), "America/New_York")).toBe("2026-10-05");
  });
  test("DST change (US fall back 2026-11-01) keeps Monday weeks", () => {
    expect(localDate(new Date("2026-11-01T06:30:00Z"), "America/New_York")).toBe("2026-11-01");
    expect(weekStart(new Date("2026-11-02T05:30:00Z"), "America/New_York")).toBe("2026-11-02");
    expect(weekDays("2026-10-26")).toEqual(["2026-10-26","2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31","2026-11-01"]);
  });
  test("year boundary + ISO weekday", () => {
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect([isoDow("2026-10-05"), isoDow("2026-10-11")]).toEqual([1, 7]);
  });
});

describe("calendar cells", () => {
  const days = weekDays("2026-10-05");
  const rows = [
    { day: "2026-10-05", user_id: "me", verified: true, late: false, workout_ids: ["w1"] },
    { day: "2026-10-05", user_id: "p", verified: false, late: false, workout_ids: ["w2"] },
    { day: "2026-10-06", user_id: "me", verified: false, late: false, workout_ids: ["w3"] },
    { day: "2026-10-07", user_id: "p", verified: false, late: true, workout_ids: ["w4"] },
  ];
  const cells = cellsFor(days, rows, "me", "2026-10-07");
  test("both / me / partner / none", () => {
    expect(cells.slice(0, 4).map((c) => c.state)).toEqual(["both", "me", "partner", "none"]);
  });
  test("markers, today, future", () => {
    expect(cells[0].verified).toBe(true);
    expect(cells[2]).toMatchObject({ late: true, today: true, future: false });
    expect(cells[3].future).toBe(true);
    expect(cells[0].workoutIds).toEqual(["w1", "w2"]);
  });
  test("counts distinct days per user", () => {
    expect([countDays(rows, "me"), countDays(rows, "p")]).toEqual([2, 2]);
  });
});
