import type { Json } from "@/lib/supabase/types";

type P = { name?: string; handle?: string; partnership_id?: string; wager_id?: string; title?: string; stake?: string;
  gift?: string; message?: string; text?: string; warmup?: boolean; declined?: boolean; winner_id?: string | null;
  results?: { user_id: string; result: string; stake: string }[] };

/** Human text + deep link for a notification (shared by the list page and live toasts). */
export function describe(type: string, raw: Json, me: string): { text: string; href: string; celebrate?: boolean } {
  const p = (raw ?? {}) as P;
  const who = p.name || (p.handle ? `@${p.handle}` : "Your partner");
  const pact = `/pacts/${p.partnership_id}`, chal = `/wagers/challenges/${p.wager_id}`;
  switch (type) {
    case "pact_invite": return { text: `${who} challenged you to a weekly pact`, href: "/home" };
    case "pact_accepted": return { text: `${who} accepted your pact${p.warmup ? ". Warm-up week first" : ". This week counts"}`, href: pact };
    case "pact_declined": return { text: `${who} declined your pact`, href: "/home" };
    case "pact_ended": return { text: `${who} ended your pact`, href: "/wagers" };
    case "partner_checkin": return { text: `${who} just trained`, href: "/home" };
    case "stake_settled": return { text: `${who} marked “${p.stake}” as paid`, href: pact };
    case "week_result": {
      const mine = p.results?.find((r) => r.user_id === me), theirs = p.results?.find((r) => r.user_id !== me);
      if (mine?.result === "hit" && theirs?.result === "hit") return { text: "Week closed: you both hit your goals. Streak +1", href: pact, celebrate: true };
      const owe = [mine?.result === "missed" && `you owe ${mine.stake}`, theirs?.result === "missed" && `your partner owes ${theirs.stake}`].filter(Boolean).join(" · ");
      return { text: `Week closed: ${owe}`, href: pact, celebrate: mine?.result === "hit" };
    }
    case "wager_invite": return { text: `${who} challenged you: ${p.title}`, href: chal };
    case "wager_accepted": return { text: `${who} accepted “${p.title}”`, href: chal };
    case "wager_result":
      if (p.declined) return { text: `${who} declined “${p.title}”`, href: chal };
      return p.winner_id === me ? { text: `You won “${p.title}”! +50 pts`, href: chal, celebrate: true }
        : { text: p.winner_id ? `“${p.title}” is over. Not this time` : `“${p.title}” ended in a tie`, href: chal };
    case "partner_message": return { text: `${who}: ${p.text}`, href: chal };
    case "gift_received": return { text: `${who} sent you a ${p.gift}${p.message ? `: “${p.message}”` : ""}`, href: "/profile", celebrate: true };
    default: return { text: "New activity", href: "/home" };
  }
}

export async function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: fire } = await import("canvas-confetti");
  void fire({ particleCount: 90, spread: 70, origin: { y: 0.3 }, colors: ["#D4AF37", "#F5C542", "#8A7024"] });
  navigator.vibrate?.([10, 50, 10]);
}
