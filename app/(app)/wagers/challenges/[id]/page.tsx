import { notFound } from "next/navigation";
import { people } from "@/lib/pacts/load";
import { requireUser } from "@/lib/supabase/server";
import { Chat, GiftButton, Respond, WinConfetti } from "./parts";

const METRIC: Record<string, [string, string]> = {
  workouts_count: ["Most workouts", "workouts"], total_volume: ["Most volume", "kg"],
  streak: ["Longest daily streak", "days"], macro_hit: ["Most protein-goal days", "days"],
};

// Server-rendered per request, so "now" is the request time.
const daysUntil = (iso: string) => Math.ceil((Date.parse(iso) - Date.now()) / 864e5);

export default async function Challenge({ params }: PageProps<"/wagers/challenges/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  await supabase.rpc("refresh_challenge", { w: id }); // live progress on view (no-op unless active)
  const [{ data: w }, { data: msgs }, { data: gifts }, { data: me }] = await Promise.all([
    supabase.from("wagers").select("*, wager_participants(user_id, accepted, current_value)").eq("id", id).maybeSingle(),
    supabase.from("wager_messages").select("id, user_id, text, created_at").eq("wager_id", id).order("created_at").limit(100),
    supabase.from("gifts").select("id, name, icon, cost").order("cost"),
    supabase.from("profiles").select("points").single(),
  ]);
  if (!w) notFound();
  const cards = await people(supabase, w.wager_participants.map((p) => p.user_id));
  const nameOf = (u: string) => (u === user.id ? "You" : cards.get(u)?.name || `@${cards.get(u)?.handle}`);
  const [label, unit] = METRIC[w.metric];
  const scale = Math.max(Number(w.target ?? 0), ...w.wager_participants.map((p) => Number(p.current_value)), 1);
  const opponent = w.wager_participants.find((p) => p.user_id !== user.id)?.user_id;
  const pendingMe = w.status === "pending" && w.wager_participants.some((p) => p.user_id === user.id && !p.accepted);
  const daysLeft = daysUntil(w.ends_at);

  return (
    <div className="space-y-5">
      {w.status === "completed" && w.winner_id === user.id && <WinConfetti id={w.id} />}
      <header>
        <h1 className="display text-4xl">{w.title}</h1>
        <p className="text-sm text-muted">{label}{w.target ? ` · target ${w.target} ${unit}` : ""} · {
          w.status === "active" ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` :
          w.status === "completed" ? (w.winner_id ? `${nameOf(w.winner_id)} won` : "Tie") : w.status}</p>
        {w.description && <p className="mt-2 text-sm italic">“{w.description}”</p>}
      </header>

      {pendingMe && <Respond id={w.id} />}

      <section className="card space-y-3 p-4" aria-label="Progress">
        {w.wager_participants.map((p) => (
          <div key={p.user_id}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={p.user_id === user.id ? "" : "text-partner"}>{nameOf(p.user_id)}{!p.accepted && <span className="text-muted"> (invited)</span>}</span>
              <span className="font-mono">{Number(p.current_value)} {unit}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-line">
              <div className={`h-full ${p.user_id === user.id ? "bg-gold" : "bg-partner"}`} style={{ width: `${(Number(p.current_value) / scale) * 100}%`, transition: "width 400ms" }} />
            </div>
          </div>
        ))}
      </section>

      {opponent && w.status !== "declined" && (
        <GiftButton to={opponent} toName={nameOf(opponent)} wager={w.id} gifts={gifts ?? []} points={me?.points ?? 0} />
      )}
      <Chat wager={w.id} me={user.id} initial={msgs ?? []} names={Object.fromEntries(w.wager_participants.map((p) => [p.user_id, nameOf(p.user_id)]))} />
    </div>
  );
}
