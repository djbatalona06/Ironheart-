"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import type { Cell } from "@/lib/pacts/cells";
import type { PactWeek } from "@/lib/pacts/load";

const FILL: Record<Cell["state"], string> = {
  both: "bg-gold text-bg border-gold",
  me: "bg-text text-bg border-text",
  partner: "bg-partner text-bg border-partner",
  none: "bg-line/60 text-muted border-line",
};
const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const longDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });

type DayWorkout = { id: string; name: string; user_id: string; started_at: string };

export function WeekCalendar({ week, me, offset }: { week: PactWeek; me: string; offset: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [day, setDay] = useState<Cell | null>(null);
  const [list, setList] = useState<DayWorkout[] | null>(null);
  const touchX = useRef<number | null>(null);
  const partnerName = week.partner.name || `@${week.partner.handle}`;
  const pInitial = partnerName.replace("@", "").slice(0, 1).toUpperCase();

  const go = (delta: number) => {
    const next = Math.min(0, offset + delta);
    const q = new URLSearchParams(params);
    if (next === 0) q.delete("w"); else q.set("w", String(next));
    router.push(`/home${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  async function openDay(c: Cell) {
    setDay(c); setList(null);
    if (!c.workoutIds.length) return setList([]);
    const { supabaseBrowser } = await import("@/lib/supabase/client");
    const { data } = await supabaseBrowser().from("workouts").select("id, name, user_id, started_at").in("id", c.workoutIds);
    setList(data ?? []);
  }

  const label = (c: Cell) => {
    const who = { both: `you and ${partnerName} trained`, me: "you trained", partner: `${partnerName} trained`, none: c.future ? "upcoming" : "no workouts" }[c.state];
    return `${longDay(c.day)}: ${who}${c.verified ? ", verified" : ""}${c.late ? ", late sync" : ""}`;
  };

  const pill = (who: string, done: number, goal: number | undefined, color: string) => (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-xs ${goal && done >= goal ? "border-success text-success" : "border-line"}`}>
      <span className={color}>{who}</span> {done}/{goal ?? "–"}
    </span>
  );

  return (
    <section className="card space-y-3 p-4" aria-label={`Pact with ${partnerName}`}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 60) go(dx > 0 ? -1 : 1);
        touchX.current = null;
      }}>
      <header className="flex items-center justify-between gap-2">
        <Link href={`/pacts/${week.pact.id}`} className="min-w-0">
          <span className="block truncate font-bold"><span className="text-partner">{partnerName}</span></span>
          <span className="text-xs text-muted">
            {week.warmup ? "Warm-up week · no stakes" : offset === 0 ? "This week" : `Week of ${week.ws}`}
            {week.pact.streak > 0 && ` · Streak ${week.pact.streak}`}
          </span>
        </Link>
        <div className="flex shrink-0 gap-1.5">
          {pill("You", week.me.done, week.me.goal?.goal_days, "text-text")}
          {pill(pInitial, week.them.done, week.them.goal?.goal_days, "text-partner")}
        </div>
      </header>

      <div className="flex items-center gap-1">
        <button aria-label="Previous week" onClick={() => go(-1)} className="grid size-11 shrink-0 place-items-center text-muted"><ChevronLeft /></button>
        <ol className="grid flex-1 grid-cols-7 gap-1.5">
          {week.cells.map((c, i) => (
            <li key={c.day}>
              <button onClick={() => openDay(c)} aria-label={label(c)}
                className={`relative grid aspect-square w-full place-items-center rounded-lg border text-xs font-bold ${c.future ? "border-line bg-transparent text-muted" : FILL[c.state]} ${c.today ? "ring-2 ring-gold ring-offset-2 ring-offset-surface" : ""}`}>
                {DOW[i]}
                {c.state !== "none" && (
                  <span aria-hidden className="absolute bottom-0.5 left-1 text-[9px] leading-none opacity-80">
                    {c.state === "both" ? "Y" + pInitial : c.state === "me" ? "Y" : pInitial}
                  </span>
                )}
                {c.verified && <Camera aria-hidden className="absolute bottom-0.5 right-0.5 size-2.5" />}
                {c.late && <Clock aria-hidden className="absolute right-0.5 top-0.5 size-2.5" />}
              </button>
            </li>
          ))}
        </ol>
        <button aria-label="Next week" onClick={() => go(1)} disabled={offset === 0}
          className="grid size-11 shrink-0 place-items-center text-muted disabled:opacity-20"><ChevronRight /></button>
      </div>

      {!week.warmup && week.me.goal && (
        <p className="text-xs text-muted">
          Miss your {week.me.goal.goal_days} days → you owe <span className="text-text">{week.me.goal.stake}</span>.
          {week.them.goal && <> {partnerName} owes <span className="text-text">{week.them.goal.stake}</span>.</>}
        </p>
      )}

      <Sheet open={!!day} onClose={() => setDay(null)} title={day ? longDay(day.day) : ""}>
        {list === null ? <p className="text-muted">Loading…</p> : list.length === 0 ? (
          <p className="text-muted">No workouts this day.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((w) => (
              <li key={w.id}>
                <Link href={`/workouts/${w.id}`} className="card flex min-h-12 items-center justify-between p-3">
                  <span>{w.name}</span>
                  <span className={`text-xs ${w.user_id === me ? "text-text" : "text-partner"}`}>{w.user_id === me ? "You" : partnerName}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </section>
  );
}
