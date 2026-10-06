"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string };

const goal = z.coerce.number().int().min(1).max(7);
const stake = z.string().trim().min(1, "Add a stake").max(60);
const msg = (e: { message: string; code?: string }) =>
  e.code === "23505" ? "You already have an open pact with this person." : e.message;

export async function createPact(_: ActionState, form: FormData): Promise<ActionState> {
  const p = z.object({ handle: z.string().trim().min(3), goal, stake, tz: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_pact", {
    partner_handle: p.data.handle.replace(/^@/, ""), goal_days: p.data.goal, stake: p.data.stake, tz: p.data.tz,
  });
  if (error) return { error: msg(error) };
  redirect("/home?invited=1");
}

export async function respondPact(_: ActionState, form: FormData): Promise<ActionState> {
  const accept = form.get("accept") === "1";
  const p = z.object({ id: z.uuid(), goal: goal.optional(), stake: stake.optional() }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_pact", {
    p: p.data.id, accept, goal_days: accept ? p.data.goal : undefined, stake: accept ? p.data.stake : undefined,
  });
  if (error) return { error: msg(error) };
  revalidatePath("/home");
  return { ok: accept ? "Pact on." : "Declined." };
}

export async function setGoal(_: ActionState, form: FormData): Promise<ActionState> {
  const p = z.object({ id: z.uuid(), goal, stake }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("set_goal", { p: p.data.id, goal_days: p.data.goal, stake: p.data.stake });
  if (error) return { error: msg(error) };
  revalidatePath(`/pacts/${p.data.id}`);
  return { ok: `Saved. Applies from the week of ${data}.` };
}

export async function endPact(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("end_pact", { p: id });
  if (error) throw new Error(error.message);
  redirect("/home");
}

export async function settleStake(ledgerId: string, path: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("settle_stake", { ledger_id: ledgerId });
  if (error) throw new Error(error.message);
  revalidatePath(path);
}
