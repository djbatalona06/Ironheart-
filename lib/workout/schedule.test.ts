import { expect, test } from "vitest";
import { repsTarget, scheduleDates } from "./schedule";

test("3-day program from a Wednesday skips Monday that week", () => {
  // 2026-10-07 is a Wednesday → Wed, Fri, then Mon/Wed/Fri…
  expect(scheduleDates("2026-10-07", 2, 3)).toEqual(["2026-10-07", "2026-10-09", "2026-10-12", "2026-10-14", "2026-10-16", "2026-10-19"]);
});
test("4-day pattern", () => {
  expect(scheduleDates("2026-10-05", 1, 4)).toEqual(["2026-10-05", "2026-10-06", "2026-10-08", "2026-10-09"]);
});
test("reps target", () => {
  expect([repsTarget("6-8"), repsTarget("10"), repsTarget("AMRAP")]).toEqual([6, 10, null]);
});
