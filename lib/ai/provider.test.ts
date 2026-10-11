import { describe, expect, it } from "vitest";
import { aiConfig } from "./provider";

describe("aiConfig", () => {
  it("is null without a key", () => {
    expect(aiConfig({})).toBeNull();
    expect(aiConfig({ AI_BASE_URL: "https://api.deepseek.com", AI_MODEL: "m" })).toBeNull();
  });

  it("keeps working with the legacy OPENAI_* vars", () => {
    expect(aiConfig({ OPENAI_API_KEY: "k" })).toEqual({ apiKey: "k", baseURL: undefined, model: "gpt-5-mini" });
    expect(aiConfig({ OPENAI_API_KEY: "k", OPENAI_MODEL: "x" })?.model).toBe("x");
  });

  it("prefers AI_* over OPENAI_*", () => {
    const c = aiConfig({
      AI_API_KEY: "a", AI_BASE_URL: "https://api.deepseek.com", AI_MODEL: "deepseek-v4-flash",
      OPENAI_API_KEY: "o", OPENAI_MODEL: "gpt-5-mini",
    });
    expect(c).toEqual({ apiKey: "a", baseURL: "https://api.deepseek.com", model: "deepseek-v4-flash" });
  });

  it("refuses a custom host with no model instead of sending a wrong default", () => {
    expect(aiConfig({ AI_API_KEY: "a", AI_BASE_URL: "https://api.deepseek.com" })).toBeNull();
  });
});
