"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { useOnline } from "./useBrowserValue";
import { db, type QueueItem } from "@/lib/db";
import { flush } from "@/lib/db/queue";

/** Live view of the offline queue; flushes on mount, on reconnect and when the app regains focus. */
export function useOfflineQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const online = useOnline();

  useEffect(() => {
    const sub = liveQuery(() => db.queue.toArray()).subscribe({ next: setItems });
    const onFocus = () => document.visibilityState === "visible" && flush();
    const onOnline = () => void flush();
    void flush();
    addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      sub.unsubscribe();
      removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return { items, online, pending: items.length, failed: items.filter((i) => i.error) };
}
