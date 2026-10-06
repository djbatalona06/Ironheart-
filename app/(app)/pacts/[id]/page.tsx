import { notFound } from "next/navigation";
import { LedgerList } from "@/components/pact/LedgerList";
import { WeekCalendar } from "@/components/pact/WeekCalendar";
import { loadPactWeek, people } from "@/lib/pacts/load";
import { requireUser } from "@/lib/supabase/server";
import { PactSettings } from "./PactSettings";

export default async function PactDetail({ params }: PageProps<"/pacts/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: pact } = await supabase.from("partnerships").select("*").eq("id", id).maybeSingle();
  if (!pact) notFound();
  const partnerId = pact.user_a === user.id ? pact.user_b : pact.user_a;
  const partner = (await people(supabase, [partnerId])).get(partnerId) ?? { id: partnerId, handle: null, name: null, avatar_url: null };
  const name = partner.name || `@${partner.handle}`;

  const [{ data: history }, { data: ledger }, week] = await Promise.all([
    supabase.from("weekly_goals").select("user_id, week_start, goal_days, days_done, result, stake")
      .eq("partnership_id", id).neq("result", "pending").order("week_start", { ascending: false }).limit(24),
    supabase.from("stake_ledger").select("*").eq("partnership_id", id).order("created_at", { ascending: false }),
    pact.status === "active" ? loadPactWeek(supabase, pact, user.id, partner) : null,
  ]);
  const weeks = [...new Set(history?.map((h) => h.week_start))];
  const mine = (await supabase.from("weekly_goals").select("goal_days, stake").eq("partnership_id", id).eq("user_id", user.id)
    .order("week_start", { ascending: false }).limit(1).maybeSingle()).data;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="display text-4xl">Pact · <span className="text-partner">{name}</span></h1>
        <p className="text-sm text-muted">
          {pact.status === "active" ? `Streak ${pact.streak} · weeks run Mon–Sun (${pact.timezone})` : `Status: ${pact.status}`}
        </p>
      </header>
      {week && <WeekCalendar week={week} me={user.id} offset={0} />}

      <section className="space-y-2">
        <h2 className="display text-2xl">Ledger</h2>
        <LedgerList rows={ledger ?? []} me={user.id} partnerName={name} path={`/pacts/${id}`} />
      </section>

      <section className="space-y-2">
        <h2 className="display text-2xl">History</h2>
        {weeks.length === 0 && <p className="text-sm text-muted">No closed weeks yet. The first closes Monday.</p>}
        <ul className="space-y-1">
          {weeks.map((ws) => {
            const row = (u: string) => history!.find((h) => h.week_start === ws && h.user_id === u);
            const cell = (u: string, label: string) => {
              const r = row(u);
              return <span className={r?.result === "hit" ? "text-success" : "text-danger"}>{label} {r?.days_done ?? 0}/{r?.goal_days}</span>;
            };
            return (
              <li key={ws} className="card flex justify-between p-3 font-mono text-sm">
                <span className="text-muted">{ws}</span><span className="flex gap-4">{cell(user.id, "You")}{cell(partnerId, name.slice(0, 1))}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {pact.status === "active" && <PactSettings id={id} goalDays={mine?.goal_days ?? 3} stake={mine?.stake ?? ""} />}
    </div>
  );
}
