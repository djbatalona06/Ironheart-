import Link from "next/link";
import { Plus } from "lucide-react";
import { LedgerList } from "@/components/pact/LedgerList";
import { people } from "@/lib/pacts/load";
import { requireUser } from "@/lib/supabase/server";

const METRIC: Record<string, string> = { workouts_count: "Workouts", total_volume: "Volume (kg)", streak: "Streak", macro_hit: "Protein days" };

export default async function Wagers({ searchParams }: PageProps<"/wagers">) {
  const { tab } = await searchParams;
  const challenges = tab === "challenges";
  const { supabase, user } = await requireUser();

  const tabs = (
    <div role="tablist" className="flex border-b border-line">
      {[["Pacts", "/wagers"], ["Challenges", "/wagers?tab=challenges"]].map(([label, href]) => {
        const on = (label === "Challenges") === challenges;
        return <Link key={label} role="tab" aria-selected={on} href={href}
          className={`min-h-11 flex-1 border-b-2 py-3 text-center font-bold ${on ? "border-gold text-gold" : "border-transparent text-muted"}`}>{label}</Link>;
      })}
    </div>
  );

  if (!challenges) {
    const [{ data: pacts }, { data: ledger }] = await Promise.all([
      supabase.from("partnerships").select("id, user_a, user_b, status, streak").in("status", ["active", "ended"]).order("created_at", { ascending: false }),
      supabase.from("stake_ledger").select("*").order("created_at", { ascending: false }),
    ]);
    const partnerOf = (p: { user_a: string; user_b: string }) => (p.user_a === user.id ? p.user_b : p.user_a);
    const cards = await people(supabase, (pacts ?? []).map(partnerOf));
    return (
      <div className="space-y-4">
        <h1 className="display text-4xl">Wagers</h1>{tabs}
        {!pacts?.length && <p className="card p-6 text-center text-muted">No pacts yet. <Link href="/pacts/new" className="text-gold underline">Start one</Link>.</p>}
        {pacts?.map((p) => {
          const c = cards.get(partnerOf(p));
          const name = c?.name || `@${c?.handle}`;
          return (
            <section key={p.id} className="space-y-2">
              <Link href={`/pacts/${p.id}`} className="flex items-baseline justify-between">
                <h2 className="font-bold text-partner">{name}</h2>
                <span className="text-xs text-muted">{p.status === "active" ? `Streak ${p.streak}` : "Ended"} →</span>
              </Link>
              <LedgerList rows={(ledger ?? []).filter((l) => l.partnership_id === p.id)} me={user.id} partnerName={name} path="/wagers" />
            </section>
          );
        })}
      </div>
    );
  }

  const { data: list } = await supabase.from("wagers")
    .select("id, title, metric, status, ends_at, winner_id, wager_participants(user_id, accepted, current_value)")
    .order("created_at", { ascending: false });
  const groups = [["Active", "active"], ["Invites", "pending"], ["Finished", "completed"]] as const;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Wagers</h1>
        <Link href="/wagers/challenges/new" className="btn-gold" aria-label="New challenge"><Plus className="size-5" /></Link>
      </div>
      {tabs}
      {!list?.length && <p className="card p-6 text-center text-muted">No challenges yet. Bet a partner on workouts, volume, streaks or protein.</p>}
      {groups.map(([label, status]) => {
        const items = list?.filter((w) => w.status === status) ?? [];
        return items.length > 0 && (
          <section key={status} className="space-y-2">
            <h2 className="text-sm font-bold text-gold">{label.toUpperCase()}</h2>
            {items.map((w) => {
              const mine = w.wager_participants.find((p) => p.user_id === user.id);
              const best = Math.max(...w.wager_participants.map((p) => Number(p.current_value)));
              return (
                <Link key={w.id} href={`/wagers/challenges/${w.id}`} className="card flex min-h-14 items-center justify-between gap-3 p-3 hover:border-gold">
                  <span><span className="block font-semibold">{w.title}</span><span className="text-xs text-muted">{METRIC[w.metric]}</span></span>
                  <span className="text-right font-mono text-sm">
                    {status === "completed" ? (w.winner_id === user.id ? <span className="text-success">WON</span> : w.winner_id ? <span className="text-danger">LOST</span> : "TIE")
                      : status === "pending" && !mine?.accepted ? <span className="text-gold">Respond</span>
                      : <>{Number(mine?.current_value ?? 0)}<span className="text-muted"> / {best}</span></>}
                  </span>
                </Link>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
