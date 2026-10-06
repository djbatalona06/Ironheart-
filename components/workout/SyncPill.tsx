"use client";

import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function SyncPill() {
  const { online, pending } = useOfflineQueue();
  if (online && !pending) return null;
  return (
    <span role="status" className="rounded-full border border-gold px-3 py-1 text-xs text-gold">
      {online ? `Syncing ${pending}…` : pending ? `Offline · ${pending} queued` : "Offline"}
    </span>
  );
}
