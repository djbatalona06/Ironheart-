import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const MAX_CHARS = 12_000; // ≈ 3–4k tokens

/** Compact text summary of the user's last 30 days of training for the bot. */
export async function trainingContext(sb: SupabaseClient<Database>, userId: string) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await sb.from("workouts")
    .select("name, started_at, workout_sets(set_index, reps, weight_kg, rpe, completed, exercises(name))")
    .eq("user_id", userId).eq("status", "done").gte("started_at", since).order("started_at");
  const lines = (data ?? []).map((w) => {
    const sets = [...w.workout_sets].filter((s) => s.completed).sort((a, b) => a.set_index - b.set_index)
      .map((s) => `${s.exercises?.name} ${s.weight_kg ?? "BW"}x${s.reps ?? "?"}${s.rpe ? ` @${s.rpe}` : ""}`);
    return `${w.started_at.slice(0, 10)} ${w.name}: ${sets.join("; ")}`;
  });
  let out = lines.join("\n");
  while (out.length > MAX_CHARS) out = out.slice(out.indexOf("\n") + 1); // drop oldest first
  return out || "No workouts logged in the last 30 days.";
}
