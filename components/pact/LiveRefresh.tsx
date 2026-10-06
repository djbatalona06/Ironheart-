"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeAuthed, supabaseBrowser } from "@/lib/supabase/client";

/** Re-renders the page when partners log workouts (notifications are handled by Toaster). Falls back to 30s polling. */
export function LiveRefresh({ userIds, me }: { userIds: string[]; me: string }) {
  const router = useRouter();
  const key = userIds.join(",");
  useEffect(() => {
    const sb = supabaseBrowser();
    let poll: ReturnType<typeof setInterval> | undefined;
    const refresh = () => router.refresh();
    const ch = sb.channel(`live:${me}`);
    for (const id of key.split(",").filter(Boolean)) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "workouts", filter: `user_id=eq.${id}` }, refresh);
    }
    subscribeAuthed(ch, (status) => {
        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !poll) poll = setInterval(refresh, 30_000);
      });
    return () => { clearInterval(poll); void sb.removeChannel(ch); };
  }, [key, me, router]);
  return null;
}
