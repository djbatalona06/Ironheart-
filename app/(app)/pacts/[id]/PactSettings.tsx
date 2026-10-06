"use client";

import { useActionState } from "react";
import { endPact, setGoal, type ActionState } from "@/lib/pacts/actions";

export function PactSettings({ id, goalDays, stake }: { id: string; goalDays: number; stake: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setGoal, {});
  return (
    <section className="space-y-3">
      <h2 className="display text-2xl">My goal</h2>
      <form action={action} className="card space-y-3 p-4">
        <input type="hidden" name="id" value={id} />
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <label className="space-y-1"><span className="text-xs text-muted">Days / week</span>
            <input name="goal" type="number" min={1} max={7} defaultValue={goalDays} className="field font-mono" /></label>
          <label className="space-y-1"><span className="text-xs text-muted">Stake</span>
            <input name="stake" maxLength={60} defaultValue={stake} className="field" /></label>
        </div>
        <p className="text-xs text-muted">Changes apply from next week. This week stays as agreed.</p>
        <button className="btn-gold w-full" disabled={pending}>Save</button>
        {state.ok && <p role="status" className="text-sm text-success">{state.ok}</p>}
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </form>
      <button className="btn-ghost w-full text-danger" onClick={async () => {
        if (confirm("End this pact? This week won't be scored. The ledger stays.")) await endPact(id);
      }}>End pact</button>
    </section>
  );
}
