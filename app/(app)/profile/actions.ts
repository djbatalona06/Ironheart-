"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { macroGoals } from "@/lib/nutrition/goals";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

const num = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(min).max(max).nullable());

const Schema = z.object({
  name: z.string().trim().min(1).max(60),
  goal: z.enum(["muscle", "fat_loss", "strength", "endurance"]),
  weight_kg: num(25, 400), height_cm: num(100, 250), birth_year: num(1900, 2020),
  sex: z.enum(["male", "female"]).nullable().catch(null),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).nullable().catch(null),
  nutrition_enabled: z.preprocess((v) => v === "on", z.boolean()),
  auto: z.preprocess((v) => v === "on", z.boolean()),
  kcal_goal: num(800, 8000), protein_g_goal: num(0, 600), carbs_g_goal: num(0, 1200), fat_g_goal: num(0, 400),
});

export async function updateProfile(_: { ok?: string; error?: string }, form: FormData): Promise<{ ok?: string; error?: string }> {
  const p = Schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Check the highlighted values." };
  const { auto, kcal_goal, protein_g_goal, carbs_g_goal, fat_g_goal, ...d } = p.data;
  const { supabase, user } = await requireUser();
  // Manual goals as entered; auto goals only when stats are complete (otherwise keep the saved ones).
  const goals = !auto ? { kcal_goal, protein_g_goal, carbs_g_goal, fat_g_goal }
    : d.weight_kg && d.height_cm && d.birth_year && d.sex && d.activity_level
      ? (({ kcal, protein, carbs, fat }) => ({ kcal_goal: kcal, protein_g_goal: protein, carbs_g_goal: carbs, fat_g_goal: fat }))(
          macroGoals({ weightKg: d.weight_kg, heightCm: d.height_cm, age: new Date().getFullYear() - d.birth_year,
            sex: d.sex, activity: d.activity_level, goal: d.goal }))
      : {};
  const { error } = await supabase.from("profiles").update({ ...d, ...goals }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Ends open pacts (partners are notified) then deletes the auth user; everything else cascades. */
export async function deleteAccount() {
  const { supabase, user } = await requireUser();
  const { data: pacts } = await supabase.from("partnerships").select("id").in("status", ["pending", "active"]);
  for (const p of pacts ?? []) await supabase.rpc("end_pact", { p: p.id });
  await supabase.auth.signOut();
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);
  redirect("/login");
}
