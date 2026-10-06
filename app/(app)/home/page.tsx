import Link from "next/link";
import { Plus } from "lucide-react";
import { InviteCard } from "@/components/pact/InviteCard";
import { LiveRefresh } from "@/components/pact/LiveRefresh";
import { PactRulesBanner } from "@/components/pact/PactRulesBanner";
import { WeekCalendar } from "@/components/pact/WeekCalendar";
import { loadPactWeek, people, type PactWeek } from "@/lib/pacts/load";
import { requireUser } from "@/lib/supabase/server";

export default async function Home({ searchParams }: PageProps<"/home">) {
  const { w, invited } = await searchParams;
  const offset = Math.min(0, Math.max(-52, Number(w) || 0));
  const { supabase, user } = await requireUser();
  const { data: pacts } = await supabase.from("partnerships").select("*").in("status", ["active", "pending"]).order("created_at");
  const all = pacts ?? [];
  const partnerOf = (p: (typeof all)[number]) => (p.user_a === user.id ? p.user_b : p.user_a);
  const cards = await people(supabase, all.map(partnerOf));
  const nameOf = (id: string) => cards.get(id)?.name || `@${cards.get(id)?.handle ?? "partner"}`;

  const active = all.filter((p) => p.status === "active");
  const incoming = all.filter((p) => p.status === "pending" && p.user_b === user.id);
  const outgoing = all.filter((p) => p.status === "pending" && p.user_a === user.id);
  const weeks: PactWeek[] = await Promise.all(
    active.map((p) => loadPactWeek(supabase, p, user.id, cards.get(partnerOf(p)) ?? { id: partnerOf(p), handle: null, name: null, avatar_url: null }, offset)),
  );

  return (
    <div className="space-y-4">
      <LiveRefresh userIds={active.map(partnerOf)} me={user.id} />
      <h1 className="display text-4xl">{offset === 0 ? "This week" : "History"}</h1>
      {invited && <p role="status" className="text-sm text-gold">Invite sent. We&apos;ll let you know when they accept.</p>}

      {incoming.map((p) => (
        <InviteCard key={p.id} id={p.id} from={nameOf(p.user_a)} goalDays={p.invite_goal_days} stake={p.invite_stake} />
      ))}

      {weeks.map((wk) => {
        const lw = wk.lastWeek;
        const owes = lw && [lw.me?.result === "missed" && `You owe ${lw.me.stake}`, lw.them?.result === "missed" && `${nameOf(wk.partner.id)} owes ${lw.them.stake}`].filter(Boolean);
        return (
          <div key={wk.pact.id} className="space-y-2">
            {wk.pact.accepted_at && offset === 0 && (
              <PactRulesBanner pactId={wk.pact.id} warmup={wk.warmup} goalDays={wk.me.goal?.goal_days} stake={wk.me.goal?.stake} />
            )}
            {owes && (
              <p className={`rounded-lg border p-2 text-sm ${owes.length ? "border-danger text-danger" : "border-success text-success"}`}>
                Last week: {owes.length ? owes.join(" · ") : `both hit. Streak ${wk.pact.streak}`}
              </p>
            )}
            <WeekCalendar week={wk} me={user.id} offset={offset} />
          </div>
        );
      })}

      {outgoing.map((p) => (
        <p key={p.id} className="card p-4 text-sm text-muted">Waiting for <span className="text-partner">{nameOf(p.user_b)}</span> to accept…</p>
      ))}

      {all.length === 0 ? (
        <div className="card space-y-3 p-6 text-center">
          <h2 className="display text-3xl text-gold">Train with someone</h2>
          <p className="text-muted">Pair with a partner, set a weekly goal and a stake. Miss it and you owe.</p>
          <Link href="/pacts/new" className="btn-gold">Start a pact</Link>
        </div>
      ) : (
        <Link href="/pacts/new" className="btn-ghost w-full"><Plus className="size-4" />New pact</Link>
      )}
      <Link href="/workouts/new" className="btn-gold w-full">Log workout</Link>
    </div>
  );
}
