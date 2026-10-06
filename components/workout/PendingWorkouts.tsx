"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { retryFailed } from "@/lib/db/queue";

/** Queued (not yet synced) workouts at the top of the list; refreshes the list once they land. */
export function PendingWorkouts() {
  const { items, online } = useOfflineQueue();
  const router = useRouter();
  const workouts = items.filter((i) => i.kind === "workout");
  const count = workouts.length;

  useEffect(() => { if (count === 0) router.refresh(); }, [count, router]);
  if (!count) return null;

  return (
    <ul className="space-y-2" aria-label="Waiting to sync">
      {workouts.map((i) => {
        const w = (i.payload as { workout: { name: string } }).workout;
        return (
          <li key={i.seq} className="card flex min-h-14 items-center justify-between border-dashed p-3">
            <span className="font-semibold">{w.name}</span>
            {i.error
              ? <button className="text-sm text-danger underline" onClick={() => retryFailed()} title={i.error}>Failed · retry</button>
              : <span className="text-xs text-gold">{online ? "Syncing…" : "Offline · will sync"}</span>}
          </li>
        );
      })}
    </ul>
  );
}
