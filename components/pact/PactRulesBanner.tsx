"use client";

import { useState } from "react";
import { useBrowserValue } from "@/hooks/useBrowserValue";

/** Shown once per pact after a mid-week accept (docs/08 → Create / Accept, step 4). */
export function PactRulesBanner({ pactId, warmup, goalDays, stake }: {
  pactId: string; warmup: boolean; goalDays?: number; stake?: string;
}) {
  const key = `ironheart:rules:${pactId}`;
  const seen = useBrowserValue(() => { try { return !!localStorage.getItem(key); } catch { return false; } }, true);
  const [dismissed, setDismissed] = useState(false);
  if (seen || dismissed) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-gold bg-gold/10 p-3 text-sm">
      <p className="flex-1">
        {warmup
          ? "Warm-up week, no stakes. Your pact starts Monday."
          : `This week counts: hit ${goalDays ?? "your"} days by Sunday or owe ${stake ?? "your stake"}.`}
      </p>
      <button className="font-bold text-gold" onClick={() => { try { localStorage.setItem(key, "1"); } catch {} setDismissed(true); }}>Got it</button>
    </div>
  );
}
