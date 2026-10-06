import { supabaseBrowser } from "@/lib/supabase/client";
import { db, type QueueItem } from "./index";

// Offline-first writes for workouts + nutrition (docs/02_ARCHITECTURE.md).
// Rows carry client-generated UUIDs, and inserts use ON CONFLICT DO NOTHING,
// so replaying an item after a dropped connection is safe.

export async function enqueue(item: Omit<QueueItem, "createdAt" | "seq" | "error">) {
  await db.queue.add({ ...item, createdAt: Date.now() } as QueueItem);
  void flush();
}

type Result = { error: { message: string; code?: string } | null };

async function send(item: QueueItem): Promise<Result> {
  const sb = supabaseBrowser();
  if (item.kind === "workout") {
    const { workout: { planned, ...workout }, sets } = item.payload;
    // A planned workout already exists server-side → mark it done; otherwise insert.
    const w = planned
      ? await sb.from("workouts").update({ status: "done", name: workout.name, started_at: workout.started_at,
          ended_at: workout.ended_at, notes: workout.notes }).eq("id", workout.id)
      : await sb.from("workouts").upsert(workout, { onConflict: "id", ignoreDuplicates: true });
    if (w.error) return w;
    // Sets upsert fully: planned sets get the logged reps/weights.
    return sets.length ? sb.from("workout_sets").upsert(sets, { onConflict: "id" }) : { error: null };
  }
  if (item.kind === "media") return sb.from("media").upsert(item.payload, { onConflict: "id", ignoreDuplicates: true });
  return sb.from("nutrition_logs").upsert(item.payload, { onConflict: "id", ignoreDuplicates: true });
}

/** Upload photos/clips that were captured offline, then point their media rows at Storage. */
async function uploadLocalMedia(userId: string) {
  const sb = supabaseBrowser();
  for (const m of await db.media.filter((x) => x.retry).toArray()) {
    const path = `${userId}/${m.mediaId}.${m.ext}`;
    const up = await sb.storage.from("media").upload(path, m.blob, { contentType: m.blob.type, upsert: true });
    if (up.error) { await db.media.update(m.key, { retry: false }); continue; } // quota/limit: keep local
    const { error } = await sb.from("media").update({ storage_path: path }).eq("id", m.mediaId);
    if (!error) await db.media.delete(m.key);
  }
}

let running: Promise<void> | null = null;

/** Send queued items in order. Stops at the first network failure; data errors are kept with a message. */
export function flush() {
  running ??= (async () => {
    try {
      for (const item of await db.queue.orderBy("seq").toArray()) {
        if (item.error) continue;
        let res: Result;
        try {
          res = await send(item);
        } catch {
          return; // offline / fetch failed: retry on next trigger
        }
        if (!res.error) await db.queue.delete(item.seq!);
        else if (!res.error.code) return; // transport-level error: retry later
        else await db.queue.update(item.seq!, { error: res.error.message });
      }
      const { data } = await supabaseBrowser().auth.getSession(); // local read, no network
      if (data.session && (await db.media.filter((x) => x.retry).count())) await uploadLocalMedia(data.session.user.id).catch(() => {});
    } finally {
      running = null;
    }
  })();
  return running;
}

export const retryFailed = async () => {
  await db.queue.toCollection().modify({ error: undefined });
  return flush();
};
