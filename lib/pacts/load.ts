import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import { cellsFor, countDays, type Cell, type DayRow } from "./cells";
import { addDays, localDate, weekDays, weekStart } from "./week";

type Sb = SupabaseClient<Database>;
export type Person = { id: string; handle: string | null; name: string | null; avatar_url: string | null };
export type Goal = Pick<Tables<"weekly_goals">, "goal_days" | "stake" | "result" | "days_done">;
export type PactWeek = {
  pact: Tables<"partnerships">;
  partner: Person;
  ws: string;
  warmup: boolean;
  cells: Cell[];
  me: { done: number; goal: Goal | null };
  them: { done: number; goal: Goal | null };
  lastWeek: { ws: string; me: Goal | null; them: Goal | null } | null;
};

export async function people(sb: Sb, ids: string[]) {
  const { data } = await sb.from("public_profiles").select("id, handle, name, avatar_url").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id!, p as Person]));
}

/** One pact's week as the calendar needs it. `offset` = weeks back from the current one. */
export async function loadPactWeek(sb: Sb, pact: Tables<"partnerships">, me: string, partner: Person, offset = 0): Promise<PactWeek> {
  const now = new Date();
  const ws = addDays(weekStart(now, pact.timezone), 7 * offset);
  const prev = addDays(ws, -7);
  const [{ data: rows }, { data: goals }] = await Promise.all([
    sb.rpc("pact_week_days", { p: pact.id, ws }),
    sb.from("weekly_goals").select("user_id, week_start, goal_days, stake, result, days_done")
      .eq("partnership_id", pact.id).in("week_start", [ws, prev]),
  ]);
  const goal = (user: string, week: string) => goals?.find((g) => g.user_id === user && g.week_start === week) ?? null;
  const dayRows = (rows ?? []) as DayRow[];
  const lastMe = goal(me, prev), lastThem = goal(partner.id, prev);

  return {
    pact, partner, ws,
    warmup: Boolean(pact.started_week && pact.started_week > ws),
    cells: cellsFor(weekDays(ws), dayRows, me, localDate(now, pact.timezone)),
    me: { done: countDays(dayRows, me), goal: goal(me, ws) },
    them: { done: countDays(dayRows, partner.id), goal: goal(partner.id, ws) },
    lastWeek: offset === 0 && lastMe && lastMe.result !== "pending" ? { ws: prev, me: lastMe, them: lastThem } : null,
  };
}
