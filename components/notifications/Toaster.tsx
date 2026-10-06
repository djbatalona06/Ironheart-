"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confetti, describe } from "@/lib/notifications/format";
import { subscribeAuthed, supabaseBrowser } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

type Toast = { id: string; text: string; href: string };

/** Live in-app notifications: toast + badge refresh, confetti for wins/gifts. Polls every 30s if realtime fails. */
export function Toaster({ me }: { me: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const sb = supabaseBrowser();
    let poll: ReturnType<typeof setInterval> | undefined;
    const ch = subscribeAuthed(sb.channel(`notify:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me}` }, (e) => {
        const n = e.new as Tables<"notifications">;
        const d = describe(n.type, n.payload, me);
        setToasts((t) => [...t.slice(-2), { id: n.id, text: d.text, href: d.href }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 5000);
        if (d.celebrate) void confetti();
        router.refresh();
      }), (status) => {
        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !poll) poll = setInterval(() => router.refresh(), 30_000);
      });
    return () => { clearInterval(poll); void sb.removeChannel(ch); };
  }, [me, router]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.5rem)] z-50 mx-auto flex max-w-lg flex-col gap-2 px-4">
      {toasts.map((t) => (
        <Link key={t.id} href={t.href} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
          className="pointer-events-auto card border-gold p-3 text-sm shadow-[0_0_24px_rgba(212,175,55,0.25)]">{t.text}</Link>
      ))}
    </div>
  );
}
