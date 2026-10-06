import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { PendingWorkouts } from "@/components/workout/PendingWorkouts";
import { requireUser } from "@/lib/supabase/server";

export default async function Workouts() {
  const { supabase, user } = await requireUser();
  const [{ data: workouts, error }, { data: upcoming }] = await Promise.all([
    supabase.from("workouts").select("id, name, status, started_at, workout_sets(count)")
      .eq("user_id", user.id).eq("status", "done").order("started_at", { ascending: false }).limit(50),
    supabase.from("workouts").select("id, name, started_at")
      .eq("user_id", user.id).eq("status", "planned").order("started_at").limit(3),
  ]);

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
      {upcoming && upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gold">UP NEXT</h2>
          {upcoming.map((w) => (
            <Link key={w.id} href={`/workouts/new?planned=${w.id}`} className="card flex min-h-14 items-center justify-between border-gold/50 p-3 hover:border-gold">
              <span className="font-semibold">{w.name}</span>
              <span className="text-xs text-muted">{new Date(w.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</span>
            </Link>
          ))}
        </section>
      )}
      {error && <p role="alert" className="text-danger">Couldn&apos;t load workouts. Pull to refresh.</p>}
      {workouts?.length === 0 && !upcoming?.length && (
        <div className="card space-y-3 p-6 text-center">
          <p className="text-muted">No workouts yet.</p>
          <Link href="/workouts/new" className="btn-gold">Log your first</Link>
        </div>
      )}
      <ul className="space-y-2">
        {workouts?.map((w) => (
          <li key={w.id}>
            <Link href={`/workouts/${w.id}`}
              className="card flex min-h-14 items-center justify-between p-3 hover:border-gold">
              <span>
                <span className="block font-semibold">{w.name}</span>
                <span className="text-xs text-muted">
                  {new Date(w.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </span>
              <span className="font-mono text-sm text-muted">{w.workout_sets[0]?.count ?? 0} sets</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
