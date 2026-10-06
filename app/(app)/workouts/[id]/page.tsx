import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { MediaThumb } from "@/components/workout/MediaThumb";
import { DeleteWorkout } from "./DeleteWorkout";

export default async function WorkoutDetail({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: w } = await supabase
    .from("workouts")
    .select("id, user_id, name, started_at, ended_at, notes, workout_sets(id, set_index, reps, weight_kg, rpe, completed, exercises(name)), media(id, type, is_checkin, caption, storage_path)")
    .eq("id", id)
    .maybeSingle();
  if (!w) notFound();
  const mine = w.user_id === user.id;

  // Group sets by exercise, keeping first-seen order.
  const groups = new Map<string, typeof w.workout_sets>();
  for (const s of [...w.workout_sets].sort((a, b) => a.set_index - b.set_index)) {
    const name = s.exercises?.name ?? "Exercise";
    groups.set(name, [...(groups.get(name) ?? []), s]);
  }
  const remote = w.media.filter((m) => !m.storage_path.startsWith("local:")).map((m) => m.storage_path);
  const { data: signed } = remote.length ? await supabase.storage.from("media").createSignedUrls(remote, 3600) : { data: [] };
  const urlOf = (p: string) => signed?.find((s) => s.path === p)?.signedUrl ?? null;
  const minutes = w.ended_at ? Math.round((+new Date(w.ended_at) - +new Date(w.started_at)) / 60000) : null;

  return (
    <article className="space-y-4">
      <header>
        <h1 className="display text-4xl">{w.name}</h1>
        <p className="text-sm text-muted">
          {new Date(w.started_at).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          {minutes ? ` · ${minutes} min` : ""}
          {w.media.some((m) => m.is_checkin) && <span className="ml-2 text-gold">· Verified</span>}
        </p>
      </header>
      {[...groups].map(([name, sets]) => (
        <section key={name} className="card p-3">
          <h2 className="mb-2 font-bold">{name}</h2>
          <table className="w-full text-center font-mono text-sm">
            <thead className="text-xs text-muted"><tr><th>SET</th><th>KG</th><th>REPS</th><th>RPE</th></tr></thead>
            <tbody>
              {sets.map((s, i) => (
                <tr key={s.id} className={s.completed ? "" : "text-muted line-through"}>
                  <td>{i + 1}</td><td>{s.weight_kg ?? "–"}</td><td>{s.reps ?? "–"}</td><td>{s.rpe ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {w.media.length > 0 && (
        <section className="grid grid-cols-2 gap-2">
          {w.media.map((m) => <MediaThumb key={m.id} path={m.storage_path} url={urlOf(m.storage_path)} type={m.type} caption={m.caption} />)}
        </section>
      )}
      {w.notes && <p className="card whitespace-pre-wrap p-3 text-muted">{w.notes}</p>}
      {mine && (
        <div className="flex gap-3">
          {!w.media.some((m) => m.is_checkin) && (
            <Link href={`/camera?checkin=${w.id}`} className="btn-gold flex-1"><Camera className="size-4" />Add photo check-in</Link>
          )}
          <DeleteWorkout id={w.id} />
        </div>
      )}
    </article>
  );
}
