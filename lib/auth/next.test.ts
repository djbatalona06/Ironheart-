import { describe, expect, it } from "vitest";
import { safeNext } from "./next";

describe("safeNext", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeNext("/pacts/abc")).toBe("/pacts/abc");
    expect(safeNext("/wagers?tab=gifts")).toBe("/wagers?tab=gifts");
  });

  it.each([
    null, "", "home", "https://evil.example", "//evil.example/x", "/\\evil.example", "/\t/evil.example",
    "/login", "/login/mfa", "/auth/callback", "/api/ai", "/setup", "/" + "a".repeat(600),
  ])("rejects %s", (raw) => expect(safeNext(raw)).toBeNull());
});
