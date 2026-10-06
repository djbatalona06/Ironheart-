"use client";

import { useActionState } from "react";
import { respondPact, type ActionState } from "@/lib/pacts/actions";

export function InviteCard({ id, from, goalDays, stake }: { id: string; from: string; goalDays: number; stake: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(respondPact, {});
  if (state.ok) return <p role="status" className="card p-4 text-center text-gold">{state.ok}</p>;
  return (
    <form action={action} className="card space-y-3 border-gold p-4">
      <input type="hidden" name="id" value={id} />
      <p><span className="font-bold text-partner">{from}</span> challenged you: {goalDays} days a week or they owe <b>{stake}</b>.</p>
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <label className="space-y-1"><span className="text-xs text-muted">Your days</span>
          <input name="goal" type="number" min={1} max={7} defaultValue={goalDays} className="field font-mono" /></label>
        <label className="space-y-1"><span className="text-xs text-muted">Your stake</span>
          <input name="stake" maxLength={60} defaultValue={stake} className="field" /></label>
      </div>
      <div className="flex gap-2">
        <button name="accept" value="1" className="btn-gold flex-1" disabled={pending}>Accept</button>
        <button name="accept" value="0" className="btn-ghost" disabled={pending}>Decline</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
