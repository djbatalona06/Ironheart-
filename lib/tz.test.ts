import { expect, test } from "vitest";
import { dayRange, validTz, zonedMidnight } from "./tz";

test("local midnight in New York (EDT, UTC-4)", () => {
  expect(zonedMidnight("2026-10-05", "America/New_York").toISOString()).toBe("2026-10-05T04:00:00.000Z");
});
test("DST end day is 25 hours long", () => {
  const [s, e] = dayRange("2026-11-01", "America/New_York");
  expect([s, e]).toEqual(["2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"]);
});
test("positive offsets and bad zones", () => {
  expect(zonedMidnight("2026-10-05", "Asia/Tokyo").toISOString()).toBe("2026-10-04T15:00:00.000Z");
  expect(validTz("Not/AZone")).toBe("UTC");
});
