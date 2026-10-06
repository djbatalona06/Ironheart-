import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { PendingWorkouts } from "@/components/workout/PendingWorkouts";
import { requireUser } from "@/lib/supabase/server";

export default async function Workouts() {
  const { supabase, user } = await requireUser();
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, name, status, started_at, workout_sets(count)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Workouts</h1>
        <div className="flex gap-2">
          <Link href="/workouts/generate" className="btn-ghost"><Sparkles className="size-4" />Generate</Link>
          <Link href="/workouts/new" className="btn-gold" aria-label="New workout"><Plus className="size-5" /></Link>
        </div>
      </div>
      <PendingWorkouts />
      {error && <p role="alert" className="text-danger">Couldn&apos;t load workouts. Pull to refresh.</p>}
      {workouts?.length === 0 && (
        <div className="card space-y-3 p-6 text-center">
          <p className="text-muted">No workouts yet.</p>
          <Link href="/workouts/new" className="btn-gold">Log your first</Link>
        </div>
      )}
      <ul className="space-y-2">
        {workouts?.map((w) => (
          <li key={w.id}>
            <Link href={w.status === "planned" ? `/workouts/new?planned=${w.id}` : `/workouts/${w.id}`}
              className="card flex min-h-14 items-center justify-between p-3 hover:border-gold">
              <span>
                <span className="block font-semibold">{w.name}</span>
                <span className="text-xs text-muted">
                  {new Date(w.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </span>
              {w.status === "planned"
                ? <span className="rounded-full border border-gold px-2 py-0.5 text-xs text-gold">Planned</span>
                : <span className="font-mono text-sm text-muted">{w.workout_sets[0]?.count ?? 0} sets</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
