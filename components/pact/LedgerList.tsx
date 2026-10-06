"use client";

import { useTransition } from "react";
import { settleStake } from "@/lib/pacts/actions";
import type { Tables } from "@/lib/supabase/types";

/** "You owe Alex 2 × Buy dinner" grouped rows; only the creditor sees Settle. */
export function LedgerList({ rows, me, partnerName, path }: {
  rows: Tables<"stake_ledger">[]; me: string; partnerName: string; path: string;
}) {
  const [pending, start] = useTransition();
  const open = rows.filter((r) => !r.settled);
  const groups = new Map<string, Tables<"stake_ledger">[]>();
  for (const r of open) groups.set(`${r.debtor_id}|${r.stake}`, [...(groups.get(`${r.debtor_id}|${r.stake}`) ?? []), r]);

  if (open.length === 0) return <p className="text-sm text-muted">All square. Nobody owes anything.</p>;
  return (
    <ul className="space-y-2">
      {[...groups.values()].map((g) => {
        const iOwe = g[0].debtor_id === me;
        return (
          <li key={g[0].id} className={`card flex items-center justify-between gap-3 p-3 ${iOwe ? "border-danger" : ""}`}>
            <span>
              {iOwe ? <>You owe <span className="text-partner">{partnerName}</span></> : <><span className="text-partner">{partnerName}</span> owes you</>}{" "}
              <b className="font-mono">{g.length} ×</b> {g[0].stake}
            </span>
            {!iOwe && (
              <button className="btn-ghost shrink-0" disabled={pending} onClick={() => start(() => settleStake(g[0].id, path))}>
                Settle 1
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
