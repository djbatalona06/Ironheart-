"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function PendingNutrition() {
  const { items, online } = useOfflineQueue();
  const router = useRouter();
  const logs = items.filter((i) => i.kind === "nutrition");
  useEffect(() => { if (logs.length === 0) router.refresh(); }, [logs.length, router]);
  if (!logs.length) return null;
  return (
    <p role="status" className="rounded-lg border border-dashed border-gold p-3 text-sm text-gold">
      {logs.length} {logs.length === 1 ? "entry" : "entries"} {online ? "syncing…" : "saved offline, will sync"}
    </p>
  );
}
