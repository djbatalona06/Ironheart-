"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export type State = { error?: string; ok?: string };

export async function createChallenge(_: State, form: FormData): Promise<State> {
  const p = z.object({
    title: z.string().trim().min(1).max(80), description: z.string().max(500).optional(),
    metric: z.enum(["workouts_count", "total_volume", "streak", "macro_hit"]),
    target: z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number().min(0).optional()),
    days: z.coerce.number().int().min(1).max(90), handle: z.string().trim().min(3),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { supabase } = await requireUser();
  const now = new Date();
  const { data, error } = await supabase.rpc("create_challenge", {
    title: p.data.title, description: p.data.description ?? "", metric: p.data.metric, target: p.data.target,
    starts_at: now.toISOString(), ends_at: new Date(+now + p.data.days * 864e5).toISOString(),
    invitee_handle: p.data.handle.replace(/^@/, ""),
  });
  if (error) return { error: error.message };
  redirect(`/wagers/challenges/${data}`);
}

export async function respond(id: string, accept: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_challenge", { w: id, accept });
  if (error) throw new Error(error.message);
  revalidatePath(`/wagers/challenges/${id}`);
}

export async function sendGift(_: State, form: FormData): Promise<State> {
  const p = z.object({ to: z.uuid(), gift: z.uuid(), wager: z.uuid().optional(), note: z.string().max(140).optional() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Pick a gift." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("send_gift", { to_user: p.data.to, gift: p.data.gift, wager: p.data.wager, note: p.data.note });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Gift sent." };
}
