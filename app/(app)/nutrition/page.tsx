import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { EntryRow } from "@/components/nutrition/EntryRow";
import { MacroRing } from "@/components/nutrition/MacroRing";
import { PendingNutrition } from "@/components/nutrition/PendingNutrition";
import { addDays } from "@/lib/pacts/week";
import { requireUser, userTz } from "@/lib/supabase/server";
import { dayRange, today } from "@/lib/tz";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default async function Nutrition({ searchParams }: PageProps<"/nutrition">) {
  const tz = await userTz();
  const now = today(tz);
  const { d } = await searchParams;
  const day = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= now && d >= addDays(now, -6) ? d : now;
  const { supabase } = await requireUser();
  const [start, end] = dayRange(day, tz);
  const [{ data: profile }, { data: logs, error }] = await Promise.all([
    supabase.from("profiles").select("nutrition_enabled, kcal_goal, protein_g_goal, carbs_g_goal, fat_g_goal").single(),
    supabase.from("nutrition_logs").select("id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type")
      .gte("logged_at", start).lt("logged_at", end).order("logged_at"),
  ]);

  if (!profile?.nutrition_enabled) return (
    <div className="card space-y-3 p-6 text-center">
      <h1 className="display text-3xl">Nutrition is off</h1>
      <p className="text-muted">Turn on calorie and macro tracking in your profile.</p>
      <Link href="/profile" className="btn-gold">Open profile</Link>
    </div>
  );

  const sum = (k: "calories" | "protein_g" | "carbs_g" | "fat_g") => (logs ?? []).reduce((t, l) => t + Number(l[k]), 0);
  const kcal = sum("calories");
  const label = day === now ? "Today" : new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {day > addDays(now, -6) ? <Link aria-label="Previous day" href={`/nutrition?d=${addDays(day, -1)}`} className="grid size-11 place-items-center"><ChevronLeft /></Link> : <span className="size-11" />}
        <h1 className="display text-3xl">{label}</h1>
        {day < now ? <Link aria-label="Next day" href={`/nutrition?d=${addDays(day, 1)}`} className="grid size-11 place-items-center"><ChevronRight /></Link> : <span className="size-11" />}
      </div>

      <section className="card space-y-4 p-4">
        <div>
          <div className="mb-1 flex justify-between text-sm"><span>Calories</span>
            <span className="font-mono">{Math.round(kcal)}{profile.kcal_goal ? ` / ${profile.kcal_goal}` : ""}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Calories"
            aria-valuenow={Math.round(kcal)} aria-valuemax={profile.kcal_goal ?? undefined}>
            <div className={`h-full ${profile.kcal_goal && kcal > profile.kcal_goal ? "bg-danger" : "bg-gold"}`}
              style={{ width: `${profile.kcal_goal ? Math.min(100, (kcal / profile.kcal_goal) * 100) : 0}%` }} />
          </div>
        </div>
        <div className="flex justify-around">
          <MacroRing label="Protein" current={sum("protein_g")} goal={profile.protein_g_goal} color="var(--macro-protein)" />
          <MacroRing label="Carbs" current={sum("carbs_g")} goal={profile.carbs_g_goal} color="var(--macro-carbs)" />
          <MacroRing label="Fat" current={sum("fat_g")} goal={profile.fat_g_goal} color="var(--macro-fat)" />
        </div>
        {!profile.kcal_goal && <Link href="/profile" className="block text-center text-xs text-gold underline">Set goals</Link>}
      </section>

      <PendingNutrition />
      {error && <p role="alert" className="text-danger">Couldn&apos;t load your log.</p>}

      {MEALS.map((m) => {
        const items = logs?.filter((l) => l.meal_type === m) ?? [];
        return (
          <section key={m} className="card p-3">
            <h2 className="flex items-center justify-between font-bold capitalize">{m}
              <Link href={`/nutrition/foods?meal=${m}&d=${day}`} aria-label={`Add to ${m}`} className="grid size-11 place-items-center text-gold"><Plus /></Link>
            </h2>
            {items.length === 0 ? <p className="text-sm text-muted">Nothing logged.</p> : (
              <ul className="divide-y divide-line">{items.map((l) => <EntryRow key={l.id} log={l} />)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
