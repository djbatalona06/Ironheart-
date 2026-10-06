"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { repsTarget, scheduleDates } from "@/lib/workout/schedule";

const Program = z.object({
  slug: z.string(),
  name: z.string().min(1).max(60),
  perWeek: z.number().int().min(1).max(7),
  start: z.iso.date(),
  weeks: z.number().int().min(1).max(12),
  days: z.array(z.object({
    name: z.string().min(1).max(60),
    exercises: z.array(z.object({ name: z.string(), sets: z.number().int().min(1).max(10), reps: z.string().max(10) })).min(1),
  })).min(1).max(7),
});

/** Creates planned workouts (+ planned sets) for the chosen weeks. */
export async function planProgram(input: z.infer<typeof Program>): Promise<{ error: string }> {
  const p = Program.safeParse(input);
  if (!p.success) return { error: "Check the program and dates." };
  const { slug, name, perWeek, start, weeks, days } = p.data;
  const { supabase, user } = await requireUser();

  const names = [...new Set(days.flatMap((d) => d.exercises.map((e) => e.name)))];
  const { data: ex } = await supabase.from("exercises").select("id, name").in("name", names).is("created_by", null);
  const idOf = new Map(ex?.map((e) => [e.name, e.id]));

  const workouts = scheduleDates(start, weeks, perWeek).map((date, i) => ({
    id: crypto.randomUUID(), user_id: user.id, status: "planned", generated_from: `template:${slug}`,
    name: `${name} · ${days[i % days.length].name}`,
    // ponytail: noon UTC keeps the calendar date right for UTC−11…+11; store real local times if that matters
    started_at: `${date}T12:00:00Z`, day: days[i % days.length],
  }));
  const sets = workouts.flatMap((w) => w.day.exercises.flatMap((e) =>
    Array.from({ length: e.sets }, () => ({ workout_id: w.id, exercise_id: idOf.get(e.name)!, reps: repsTarget(e.reps), completed: false })))
    .filter((s) => s.exercise_id).map((s, set_index) => ({ ...s, set_index })));

  const rows = workouts.map((w) => ({ id: w.id, user_id: w.user_id, status: w.status, generated_from: w.generated_from, name: w.name, started_at: w.started_at }));
  const { error } = await supabase.from("workouts").insert(rows);
  if (error) return { error: error.message };
  const { error: setErr } = await supabase.from("workout_sets").insert(sets);
  if (setErr) return { error: setErr.message };
  redirect("/workouts?planned=1");
}
