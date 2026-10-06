"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Timer, Trash2 } from "lucide-react";
import { ExercisePicker } from "./ExercisePicker";
import { enqueue } from "@/lib/db/queue";
import { newSet, type Draft } from "@/lib/workout/draft";

const REST_SECONDS = 90;

export function Logger({ userId, initial, storageKey }: { userId: string; initial: Draft; storageKey: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [picking, setPicking] = useState(false);
  const [rest, setRest] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  // Restore / persist the draft so a reload or app switch never loses a session.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage after hydration
    if (saved) setDraft(JSON.parse(saved) as Draft);
  }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(draft)); }, [draft, storageKey]);
  useEffect(() => {
    if (rest <= 0) return;
    const t = setTimeout(() => { if (rest === 1) navigator.vibrate?.(200); setRest(rest - 1); }, 1000);
    return () => clearTimeout(t);
  }, [rest]);

  const update = (fn: (d: Draft) => void) => setDraft((d) => { const c = structuredClone(d); fn(c); return c; });
  const setField = (b: number, s: number, key: "reps" | "weight" | "rpe", v: string) =>
    update((d) => { d.blocks[b].sets[s][key] = v; });

  function toggle(b: number, s: number) {
    const done = !draft.blocks[b].sets[s].completed;
    update((d) => { d.blocks[b].sets[s].completed = done; });
    if (done) { setRest(REST_SECONDS); navigator.vibrate?.(10); }
  }

  const doneSets = draft.blocks.flatMap((b) => b.sets).filter((s) => s.completed).length;

  async function finish() {
    setSaving(true);
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    await enqueue({ kind: "workout", payload: {
      workout: {
        id: draft.id, user_id: userId, name: draft.name.trim() || "Workout", status: "done",
        started_at: draft.startedAt, ended_at: new Date().toISOString(), notes: draft.notes.trim() || null,
        generated_from: draft.generatedFrom, ...(draft.planned && { planned: true }),
      },
      sets: draft.blocks.flatMap((b) => b.sets.map((s, i) => ({
        id: s.id, workout_id: draft.id, exercise_id: b.exercise_id, set_index: i,
        reps: num(s.reps), weight_kg: num(s.weight), rpe: num(s.rpe), completed: s.completed,
      }))),
    } });
    localStorage.removeItem(storageKey);
    if (!navigator.onLine) {
      // Can't navigate without a connection: confirm in place and start a fresh draft.
      setSavedOffline(true); setSaving(false); setRest(0);
      setDraft({ ...draft, id: crypto.randomUUID(), name: "", notes: "", blocks: [], startedAt: new Date().toISOString(), planned: false });
      return;
    }
    router.push(`/workouts?saved=${draft.id}`);
    router.refresh();
  }

  if (savedOffline) return (
    <div role="status" className="card space-y-3 p-6 text-center">
      <p className="font-bold text-gold">Saved on this device</p>
      <p className="text-sm text-muted">You&apos;re offline. It syncs automatically when you&apos;re back, and still counts for the day you trained.</p>
      <button className="btn-ghost" onClick={() => setSavedOffline(false)}>Log another</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <input className="field display text-2xl" placeholder="WORKOUT NAME" aria-label="Workout name"
        value={draft.name} onChange={(e) => update((d) => { d.name = e.target.value; })} />

      {draft.blocks.length === 0 && (
        <p className="card p-6 text-center text-muted">Add your first exercise to start logging.</p>
      )}

      {draft.blocks.map((block, b) => (
        <section key={block.exercise_id + b} className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{block.name}</h2>
            <button aria-label={`Remove ${block.name}`} className="grid size-11 place-items-center text-muted"
              onClick={() => update((d) => { d.blocks.splice(b, 1); })}><Trash2 className="size-4" /></button>
          </div>
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.75rem] gap-2 text-center text-xs text-muted">
            <span>SET</span><span>KG</span><span>REPS</span><span>RPE</span><span />
          </div>
          {block.sets.map((s, i) => (
            <div key={s.id} className={`grid grid-cols-[2rem_1fr_1fr_1fr_2.75rem] items-center gap-2 ${s.completed ? "opacity-70" : ""}`}>
              <span className="text-center font-mono text-muted">{i + 1}</span>
              <input className="field text-center font-mono" inputMode="decimal" aria-label={`Set ${i + 1} weight`}
                value={s.weight} onChange={(e) => setField(b, i, "weight", e.target.value)} />
              <input className="field text-center font-mono" inputMode="numeric" aria-label={`Set ${i + 1} reps`}
                value={s.reps} onChange={(e) => setField(b, i, "reps", e.target.value)} />
              <input className="field text-center font-mono" inputMode="decimal" aria-label={`Set ${i + 1} RPE`}
                value={s.rpe} onChange={(e) => setField(b, i, "rpe", e.target.value)} />
              <button aria-label={`Complete set ${i + 1}`} aria-pressed={s.completed} onClick={() => toggle(b, i)}
                className={`grid size-11 place-items-center rounded-full border ${s.completed ? "border-success bg-success text-bg" : "border-line"}`}>
                <Check className="size-5" />
              </button>
            </div>
          ))}
          <button className="w-full rounded-lg py-2 text-sm text-gold"
            onClick={() => update((d) => { d.blocks[b].sets.push(newSet(d.blocks[b].sets.at(-1))); })}>+ Add set</button>
        </section>
      ))}

      <button className="btn-ghost w-full" onClick={() => setPicking(true)}><Plus className="size-4" />Add exercise</button>

      <textarea className="field min-h-20 py-2" placeholder="Notes" aria-label="Notes" maxLength={1000}
        value={draft.notes} onChange={(e) => update((d) => { d.notes = e.target.value; })} />

      <div className="sticky bottom-20 z-10 flex items-center gap-3">
        {rest > 0 && (
          <button onClick={() => setRest(0)} aria-label="Skip rest timer"
            className="card flex min-h-11 items-center gap-2 px-4 font-mono text-gold">
            <Timer className="size-4" />{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </button>
        )}
        <button className="btn-gold flex-1" disabled={saving || doneSets === 0} onClick={finish}>
          {saving ? "Saving…" : `Finish workout${doneSets ? ` · ${doneSets} sets` : ""}`}
        </button>
      </div>

      <ExercisePicker open={picking} userId={userId} onClose={() => setPicking(false)} onPick={(e) => {
        update((d) => { d.blocks.push({ exercise_id: e.id, name: e.name, sets: [newSet()] }); });
        setPicking(false);
      }} />
    </div>
  );
}
