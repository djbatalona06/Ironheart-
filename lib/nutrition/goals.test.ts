import { expect, test } from "vitest";
import { macroGoals } from "./goals";

test("80kg 180cm 30yo moderate male building muscle", () => {
  // BMR 1780 ×1.55 ×1.1 = 3035 kcal; fat 25% = 84g; carbs (3035-640-756)/4 = 410g
  const g = macroGoals({ weightKg: 80, heightCm: 180, age: 30, sex: "male", activity: "moderate", goal: "muscle" });
  expect(g).toEqual({ kcal: 3035, protein: 160, fat: 84, carbs: 410 });
});

test("female fat loss uses -161 and 20% deficit", () => {
  // BMR = 600 + 1031.25 - 125 - 161 = 1345.25; ×1.2 ×0.8 = 1291.4
  expect(macroGoals({ weightKg: 60, heightCm: 165, age: 25, sex: "female", activity: "sedentary", goal: "fat_loss" }).kcal).toBe(1291);
});
