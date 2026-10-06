"use client";

import { useActionState } from "react";
import { createChallenge, type State } from "../actions";

const METRICS = [
  ["workouts_count", "Most workouts"], ["total_volume", "Most volume (kg lifted)"],
  ["streak", "Longest daily streak"], ["macro_hit", "Most days hitting protein goal"],
];

export default function NewChallenge() {
  const [state, action, pending] = useActionState<State, FormData>(createChallenge, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="display text-4xl">New challenge</h1>
      <label className="block space-y-1"><span className="text-sm text-muted">Title</span>
        <input name="title" required maxLength={80} className="field" placeholder="30-day showdown" /></label>
      <fieldset className="space-y-2"><legend className="mb-1 text-sm text-muted">Who wins?</legend>
        {METRICS.map(([v, l], i) => (
          <label key={v} className="card flex min-h-11 items-center gap-3 p-3 has-checked:border-gold">
            <input type="radio" name="metric" value={v} defaultChecked={i === 0} className="accent-gold" />{l}</label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1"><span className="text-sm text-muted">Length (days)</span>
          <input name="days" type="number" min={1} max={90} defaultValue={30} required className="field font-mono" /></label>
        <label className="space-y-1"><span className="text-sm text-muted">Target (optional)</span>
          <input name="target" type="number" min={0} className="field font-mono" /></label>
      </div>
      <label className="block space-y-1"><span className="text-sm text-muted">Opponent @handle</span>
        <input name="handle" required autoCapitalize="none" className="field" placeholder="@handle" /></label>
      <label className="block space-y-1"><span className="text-sm text-muted">Trash talk (optional)</span>
        <textarea name="description" maxLength={500} className="field min-h-16 py-2" /></label>
      <p className="text-xs text-muted">Bragging rights + points only. The winner gets 50 points to spend on gifts.</p>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button className="btn-gold w-full" disabled={pending}>{pending ? "Sending…" : "Send challenge"}</button>
    </form>
  );
}
