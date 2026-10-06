"use client";

import { useEffect, useState } from "react";
import type { QueueItem } from "@/lib/db";
import { useOnline } from "./useBrowserValue";

/**
 * Live view of the offline queue; flushes on mount, on reconnect and when the app regains focus.
 * Dexie is imported lazily so it stays out of the first-load bundle.
 */
export function useOfflineQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const online = useOnline();

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    void Promise.all([import("dexie"), import("@/lib/db"), import("@/lib/db/queue")]).then(([{ liveQuery }, { db }, { flush }]) => {
      if (cancelled) return;
      const sub = liveQuery(() => db.queue.toArray()).subscribe({ next: setItems });
      const onFocus = () => document.visibilityState === "visible" && flush();
      const onOnline = () => void flush();
      void flush();
      addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onFocus);
      cleanup = () => {
        sub.unsubscribe();
        removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onFocus);
      };
    });
    return () => { cancelled = true; cleanup(); };
  }, []);

  return { items, online, pending: items.length, failed: items.filter((i) => i.error) };
}
