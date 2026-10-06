"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Award, CupSoda, Dumbbell, Gift, Medal, Send, Star, Trophy } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { confetti } from "@/lib/notifications/format";
import { subscribeAuthed, supabaseBrowser } from "@/lib/supabase/client";
import { respond, sendGift, type State } from "../actions";

const ICONS: Record<string, typeof Star> = { star: Star, "cup-soda": CupSoda, trophy: Trophy, dumbbell: Dumbbell, medal: Medal };

export function WinConfetti({ id }: { id: string }) {
  useEffect(() => {
    const key = `ironheart:won:${id}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch {}
    void confetti();
  }, [id]);
  return null;
}

export function Respond({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="card flex gap-2 border-gold p-3">
      <button className="btn-gold flex-1" disabled={pending} onClick={() => start(() => respond(id, true))}>Accept challenge</button>
      <button className="btn-ghost" disabled={pending} onClick={() => start(() => respond(id, false))}>Decline</button>
    </div>
  );
}

export function GiftButton({ to, toName, wager, gifts, points }: {
  to: string; toName: string; wager: string; gifts: { id: string; name: string; icon: string; cost: number }[]; points: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<State, FormData>(sendGift, {});
  useEffect(() => { if (state.ok) void confetti(); }, [state]);
  return (
    <>
      <button className="btn-ghost w-full" onClick={() => setOpen(true)}><Gift className="size-4" />Send {toName} a gift</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Send a gift">
        <form action={action} className="space-y-3">
          <input type="hidden" name="to" value={to} /><input type="hidden" name="wager" value={wager} />
          <p className="text-sm text-muted">You have <span className="font-mono text-gold">{points}</span> points. Earn more by training, hitting goals and winning.</p>
          <div className="grid grid-cols-2 gap-2">
            {gifts.map((g, i) => {
              const Icon = ICONS[g.icon] ?? Award;
              return (
                <label key={g.id} className={`card flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 p-2 has-checked:border-gold ${g.cost > points ? "opacity-40" : ""}`}>
                  <input type="radio" name="gift" value={g.id} disabled={g.cost > points} defaultChecked={i === 0 && g.cost <= points} className="sr-only" />
                  <Icon className="size-6 text-gold" /><span className="text-sm">{g.name}</span><span className="font-mono text-xs text-muted">{g.cost} pts</span>
                </label>
              );
            })}
          </div>
          <input name="note" maxLength={140} className="field" placeholder="Message (optional)" aria-label="Gift message" />
          <button className="btn-gold w-full" disabled={pending || points < (gifts[0]?.cost ?? 0)}>{pending ? "Sending…" : "Send gift"}</button>
          {state.ok && <p role="status" className="text-sm text-success">{state.ok}</p>}
          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        </form>
      </Sheet>
    </>
  );
}

type Msg = { id: string; user_id: string; text: string; created_at: string };

export function Chat({ wager, me, initial, names }: { wager: string; me: string; initial: Msg[]; names: Record<string, string> }) {
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = subscribeAuthed(sb.channel(`chat:${wager}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wager_messages", filter: `wager_id=eq.${wager}` },
        (e) => setMsgs((m) => (m.some((x) => x.id === (e.new as Msg).id) ? m : [...m, e.new as Msg]))));
    return () => { void sb.removeChannel(ch); };
  }, [wager]);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    const { data, error } = await supabaseBrowser().from("wager_messages").insert({ wager_id: wager, user_id: me, text: t }).select().single();
    if (error) { setText(t); return setError(navigator.onLine ? error.message : "Chat needs a connection."); }
    setError(null);
    setMsgs((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  }

  return (
    <section className="space-y-2">
      <h2 className="display text-2xl">Trash talk</h2>
      <ol className="max-h-80 space-y-2 overflow-y-auto">
        {msgs.length === 0 && <li className="text-sm text-muted">No messages yet.</li>}
        {msgs.map((m) => (
          <li key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.user_id === me ? "ml-auto bg-gold text-bg" : "bg-surface-2"}`}>
            {m.user_id !== me && <span className="block text-xs text-partner">{names[m.user_id]}</span>}{m.text}
          </li>
        ))}
        <li ref={end} aria-hidden />
      </ol>
      <form onSubmit={send} className="flex gap-2">
        <input className="field" placeholder="Say something" aria-label="Chat message" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-gold px-4" aria-label="Send message" disabled={!text.trim()}><Send className="size-4" /></button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
