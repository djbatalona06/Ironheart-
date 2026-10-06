"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { macroGoals } from "@/lib/nutrition/goals";
import { requireUser } from "@/lib/supabase/server";

const num = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());

const Schema = z.object({
  name: z.string().trim().min(1).max(60),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/),
  goal: z.enum(["muscle", "fat_loss", "strength", "endurance"]),
  weight_kg: num(25, 400),
  height_cm: num(100, 250),
  birth_year: num(1900, 2020),
  sex: z.enum(["male", "female"]).optional().catch(undefined),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional().catch(undefined),
  nutrition_enabled: z.enum(["yes", "no"]),
  next: z.enum(["pact", "home"]),
});

export type OnboardState = { error?: string };

export async function finishOnboarding(_: OnboardState, form: FormData): Promise<OnboardState> {
  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the highlighted fields and try again." };
  const d = parsed.data;
  const { supabase, user } = await requireUser();

  const hasStats = d.weight_kg && d.height_cm && d.birth_year && d.sex && d.activity_level;
  const goals = hasStats
    ? macroGoals({
        weightKg: d.weight_kg!, heightCm: d.height_cm!, age: new Date().getFullYear() - d.birth_year!,
        sex: d.sex!, activity: d.activity_level!, goal: d.goal,
      })
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      name: d.name, handle: d.handle, goal: d.goal,
      weight_kg: d.weight_kg ?? null, height_cm: d.height_cm ?? null, birth_year: d.birth_year ?? null,
      sex: d.sex ?? null, activity_level: d.activity_level ?? null,
      kcal_goal: goals?.kcal ?? null, protein_g_goal: goals?.protein ?? null,
      carbs_g_goal: goals?.carbs ?? null, fat_g_goal: goals?.fat ?? null,
      nutrition_enabled: d.nutrition_enabled === "yes",
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.code === "23505" ? "That @handle is taken." : error.message };
  redirect(d.next === "pact" ? "/pacts/new" : "/home");
}
