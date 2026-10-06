"use client";

import { useActionState, useEffect, useState } from "react";
import { useBrowserValue } from "@/hooks/useBrowserValue";
import { createPact, type ActionState } from "@/lib/pacts/actions";
import { supabaseBrowser } from "@/lib/supabase/client";

const STAKES = ["Buy dinner", "Do the dishes", "Pick the movie", "Buy coffee for a week"];
type Card = { id: string | null; handle: string | null; name: string | null };

export function NewPactForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPact, {});
  const [handle, setHandle] = useState("");
  const [stake, setStake] = useState(STAKES[0]);
  const [matches, setMatches] = useState<Card[]>([]);
  const tz = useBrowserValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC");
  const q = handle.replace(/^@/, "").trim().toLowerCase();

  useEffect(() => {
    if (q.length < 2) return;
    const t = setTimeout(async () => {
      const { data } = await supabaseBrowser().from("public_profiles").select("id, handle, name").ilike("handle", `${q}%`).limit(5);
      setMatches(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tz" value={tz} />
      <label className="block space-y-1"><span className="text-sm text-muted">Partner&apos;s @handle</span>
        <input name="handle" className="field" required autoCapitalize="none" autoComplete="off" placeholder="@handle"
          value={handle} onChange={(e) => setHandle(e.target.value)} />
      </label>
      {q.length >= 2 && matches.length > 0 && !matches.some((m) => m.handle === handle.replace(/^@/, "")) && (
        <ul className="card divide-y divide-line">
          {matches.map((m) => (
            <li key={m.id}><button type="button" className="flex min-h-11 w-full items-center gap-2 px-3 text-left" onClick={() => setHandle(m.handle ?? "")}>
              <span className="text-partner">@{m.handle}</span><span className="text-muted">{m.name}</span>
            </button></li>
          ))}
        </ul>
      )}
      <label className="block space-y-1"><span className="text-sm text-muted">My weekly goal (days)</span>
        <input name="goal" type="number" min={1} max={7} defaultValue={4} required className="field font-mono" />
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-muted">If I miss, I owe…</legend>
        <div className="flex flex-wrap gap-2">
          {STAKES.map((s) => (
            <button type="button" key={s} onClick={() => setStake(s)}
              className={`rounded-full border px-3 py-1.5 text-sm ${stake === s ? "border-gold text-gold" : "border-line text-muted"}`}>{s}</button>
          ))}
        </div>
        <input name="stake" className="field" maxLength={60} required aria-label="Stake" value={stake} onChange={(e) => setStake(e.target.value)} />
      </fieldset>
      <p className="text-xs text-muted">Weeks run Monday–Sunday in {tz}.</p>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button className="btn-gold w-full" disabled={pending}>{pending ? "Sending…" : "Send invite"}</button>
    </form>
  );
}
