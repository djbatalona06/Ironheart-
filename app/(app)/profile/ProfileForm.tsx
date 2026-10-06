"use client";

import { useActionState, useEffect, useState } from "react";
import { clearCachedPages } from "@/components/pwa/Pwa";
import { MediaThumb } from "@/components/workout/MediaThumb";
import { db, type LocalMedia } from "@/lib/db";
import type { Tables } from "@/lib/supabase/types";
import { deleteAccount, signOut, updateProfile } from "./actions";

export function ProfileForm({ p }: { p: Tables<"profiles"> }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [auto, setAuto] = useState(true);
  const field = (name: keyof Tables<"profiles">, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="space-y-1"><span className="text-xs text-muted">{label}</span>
      <input name={name} defaultValue={(p[name] as string | number | null) ?? ""} className="field font-mono" type="number" inputMode="decimal" {...props} /></label>
  );
  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="display text-2xl">Profile & goals</h2>
      <label className="block space-y-1"><span className="text-xs text-muted">Name</span>
        <input name="name" defaultValue={p.name ?? ""} required maxLength={60} className="field" /></label>
      <label className="block space-y-1"><span className="text-xs text-muted">Training goal</span>
        <select name="goal" defaultValue={p.goal ?? "muscle"} className="field">
          <option value="muscle">Build muscle</option><option value="fat_loss">Lose fat</option>
          <option value="strength">Get stronger</option><option value="endurance">Endurance</option>
        </select></label>
      <div className="grid grid-cols-2 gap-2">
        {field("weight_kg", "Weight (kg)", { step: "0.1" })}{field("height_cm", "Height (cm)")}{field("birth_year", "Birth year")}
        <label className="space-y-1"><span className="text-xs text-muted">Sex</span>
          <select name="sex" defaultValue={p.sex ?? ""} className="field"><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></label>
      </div>
      <label className="block space-y-1"><span className="text-xs text-muted">Activity</span>
        <select name="activity_level" defaultValue={p.activity_level ?? ""} className="field">
          <option value="">—</option><option value="sedentary">Sedentary</option><option value="light">Light</option>
          <option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very active</option>
        </select></label>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="nutrition_enabled" defaultChecked={p.nutrition_enabled} className="size-5 accent-gold" />Track nutrition</label>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="auto" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-5 accent-gold" />Calculate goals from my stats</label>
      <fieldset disabled={auto} className="grid grid-cols-2 gap-2 disabled:opacity-50">
        {field("kcal_goal", "kcal / day")}{field("protein_g_goal", "Protein g")}{field("carbs_g_goal", "Carbs g")}{field("fat_g_goal", "Fat g")}
      </fieldset>
      <button className="btn-gold w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {state.ok && <p role="status" className="text-sm text-success">{state.ok}</p>}
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function LocalMediaPanel({ profileMedia }: { profileMedia: { id: string; storage_path: string; type: string; caption: string | null; url: string | null }[] }) {
  const [local, setLocal] = useState<LocalMedia[]>([]);
  useEffect(() => { db.media.toArray().then(setLocal); }, []);
  const exportAll = () => local.forEach((m, i) => setTimeout(() => {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(m.blob), download: `ironheart-${m.mediaId}.${m.ext}` });
    a.click();
  }, i * 300));
  if (!local.length && !profileMedia.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="display text-2xl">Photos & clips</h2>
      {local.length > 0 && (
        <div className="card flex items-center justify-between p-3 text-sm">
          <span>{local.length} stored on this device only</span>
          <button className="text-gold underline" onClick={exportAll}>Export all</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {profileMedia.map((m) => <MediaThumb key={m.id} path={m.storage_path} url={m.url} type={m.type} caption={m.caption} />)}
      </div>
    </section>
  );
}

export function DangerZone({ email }: { email: string }) {
  return (
    <section className="space-y-2">
      <form action={signOut} onSubmit={clearCachedPages}><button className="btn-ghost w-full">Sign out of {email}</button></form>
      <button className="btn-ghost w-full text-danger" onClick={async () => {
        if (confirm("Delete your account and all your data? Active pacts end and partners are notified. This can't be undone.")) { clearCachedPages(); await deleteAccount(); }
      }}>Delete account</button>
    </section>
  );
}
