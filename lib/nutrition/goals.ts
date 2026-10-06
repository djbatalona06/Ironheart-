export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "muscle" | "fat_loss" | "strength" | "endurance";

const FACTOR: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};
const ADJUST: Record<Goal, number> = { fat_loss: 0.8, muscle: 1.1, strength: 1, endurance: 1 };

/** Mifflin-St Jeor → daily kcal + macros (docs/09_NUTRITION_SPEC.md). */
export function macroGoals(p: {
  weightKg: number; heightCm: number; age: number; sex: Sex; activity: Activity; goal: Goal;
}) {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const kcal = Math.round(bmr * FACTOR[p.activity] * ADJUST[p.goal]);
  const protein = Math.round(2 * p.weightKg);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}
