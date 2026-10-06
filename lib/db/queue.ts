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
  return sb.from("nutrition_logs").upsert(item.payload, { onConflict: "id", ignoreDuplicates: true });
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
