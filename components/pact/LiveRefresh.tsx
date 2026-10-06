"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the page when partners log workouts (notifications are handled by Toaster). Falls back to 30s polling. */
export function LiveRefresh({ userIds, me }: { userIds: string[]; me: string }) {
  const router = useRouter();
  const key = userIds.join(",");
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | undefined;
    let cleanup = () => {};
    let cancelled = false;
    void import("@/lib/supabase/client").then(({ subscribeAuthed, supabaseBrowser }) => {
      if (cancelled) return;
      const sb = supabaseBrowser();
      const refresh = () => router.refresh();
      const ch = sb.channel(`live:${me}`);
      for (const id of key.split(",").filter(Boolean)) {
        ch.on("postgres_changes", { event: "*", schema: "public", table: "workouts", filter: `user_id=eq.${id}` }, refresh);
      }
      subscribeAuthed(ch, (status) => {
        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !poll) poll = setInterval(refresh, 30_000);
      });
      cleanup = () => void sb.removeChannel(ch);
    });
    return () => { cancelled = true; clearInterval(poll); cleanup(); };
  }, [key, me, router]);
  return null;
}
