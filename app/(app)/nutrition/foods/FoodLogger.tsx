"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import type { FoodEstimate } from "@/lib/ai/prompts";
import { db, type CachedFood } from "@/lib/db";
import { enqueue } from "@/lib/db/queue";
import { supabaseBrowser } from "@/lib/supabase/client";

type Item = FoodEstimate["items"][number];
const MULTS = [0.5, 1, 1.5, 2];
const round = (n: number) => Math.round(n * 10) / 10;

export function FoodLogger({ userId, day, isToday, meal: initialMeal, aiEnabled }: {
  userId: string; day: string; isToday: boolean; meal: string; aiEnabled: boolean;
}) {
  const router = useRouter();
  const [foods, setFoods] = useState<CachedFood[]>([]);
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState(initialMeal);
  const [pick, setPick] = useState<CachedFood | null>(null);
  const [mult, setMult] = useState(1);
  const [mode, setMode] = useState<"search" | "describe" | "create">("search");
  const [desc, setDesc] = useState("");
  const [estimate, setEstimate] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    db.foods.toArray().then((c) => c.length && setFoods(c));
    supabaseBrowser().from("foods").select("id, name, serving_size, calories, protein_g, carbs_g, fat_g").order("name")
      .then(({ data }) => { if (data) { setFoods(data); void db.foods.bulkPut(data); } });
  }, []);
  const list = useMemo(() => foods.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40), [foods, q]);

  async function log(items: Item[], foodId: string | null = null) {
    // Past days log at local noon so they land on the right day; today logs "now".
    const loggedAt = isToday ? new Date().toISOString() : new Date(`${day}T12:00:00`).toISOString();
    for (const i of items) {
      await enqueue({ kind: "nutrition", payload: {
        id: crypto.randomUUID(), user_id: userId, food_id: foodId, food_name: i.name, serving_size: i.serving_size,
        calories: round(i.calories), protein_g: round(i.protein_g), carbs_g: round(i.carbs_g), fat_g: round(i.fat_g),
        meal_type: meal, logged_at: loggedAt,
      } });
    }
    if (!navigator.onLine) {
      setPick(null); setEstimate(null); setDesc("");
      return setNote(`Saved offline (${items.length}). It syncs when you're back online.`);
    }
    router.push(`/nutrition${isToday ? "" : `?d=${day}`}`);
    router.refresh();
  }

  async function describe() {
    setBusy(true); setError(null);
    const res = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "food_estimate", message: desc }) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(json?.error ?? "Couldn't reach the estimator. Enter it manually.");
    setEstimate(json.items);
  }

  async function createFood(form: FormData) {
    const n = (k: string) => Number(form.get(k) || 0);
    const food = { name: String(form.get("name")).trim(), serving_size: String(form.get("serving_size")).trim() || "1 serving",
      calories: n("calories"), protein_g: n("protein_g"), carbs_g: n("carbs_g"), fat_g: n("fat_g") };
    const { data, error } = await supabaseBrowser().from("foods").insert({ ...food, created_by: userId })
      .select("id, name, serving_size, calories, protein_g, carbs_g, fat_g").single();
    if (error) return setError(navigator.onLine ? error.message : "Creating foods needs a connection.");
    await db.foods.put(data);
    setFoods((f) => [data, ...f]); setPick(data); setMode("search");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="display text-3xl">Add food</h1>
        <select aria-label="Meal" className="field w-auto" value={meal} onChange={(e) => setMeal(e.target.value)}>
          {["breakfast", "lunch", "dinner", "snack"].map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-2 text-sm">
        {(["search", "describe", "create"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-full border px-3 py-1.5 capitalize ${mode === m ? "border-gold text-gold" : "border-line text-muted"}`}>
            {m === "describe" ? "Describe it" : m === "create" ? "Create food" : "Search"}
          </button>
        ))}
      </div>

      {mode === "search" && (
        <>
          <input className="field" placeholder="Search foods" aria-label="Search foods" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <ul className="card divide-y divide-line px-3">
            {list.map((f) => (
              <li key={f.id}>
                <button className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left" onClick={() => { setPick(f); setMult(1); }}>
                  <span><span className="block">{f.name}</span><span className="text-xs text-muted">{f.serving_size}</span></span>
                  <span className="shrink-0 font-mono text-sm">{Math.round(f.calories)} kcal</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="py-6 text-center text-sm text-muted">{foods.length ? "No match. Try Create food." : "Loading…"}</li>}
          </ul>
        </>
      )}

      {mode === "describe" && (aiEnabled ? (
        <div className="space-y-3">
          <textarea className="field min-h-24 py-2" placeholder="e.g. 2 eggs, toast with butter, black coffee" aria-label="Describe what you ate"
            maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button className="btn-gold w-full" disabled={busy || desc.trim().length < 2} onClick={describe}><Sparkles className="size-4" />{busy ? "Estimating…" : "Estimate"}</button>
          {estimate && (
            <div className="card space-y-2 p-3">
              <p className="text-xs text-muted">Estimates. Edit before logging.</p>
              {estimate.map((i, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_4.5rem] items-center gap-2">
                  <span className="text-sm">{i.name} <span className="text-xs text-muted">({i.serving_size})</span></span>
                  <input type="number" aria-label={`${i.name} calories`} className="field h-9 min-h-9 font-mono" value={Math.round(i.calories)}
                    onChange={(e) => setEstimate(estimate.map((x, j) => j === idx ? { ...x, calories: Number(e.target.value) } : x))} />
                </div>
              ))}
              <button className="btn-gold w-full" onClick={() => log(estimate)}>Log {estimate.length} item{estimate.length > 1 ? "s" : ""}</button>
            </div>
          )}
        </div>
      ) : <p className="card p-4 text-muted">AI estimates aren&apos;t set up on this server. Search or create the food instead.</p>)}

      {mode === "create" && (
        <form action={createFood} className="card space-y-3 p-4">
          <input name="name" required maxLength={80} className="field" placeholder="Food name" aria-label="Food name" defaultValue={q} />
          <input name="serving_size" maxLength={40} className="field" placeholder="Serving (e.g. 1 cup)" aria-label="Serving size" />
          <div className="grid grid-cols-2 gap-2">
            {[["calories", "kcal"], ["protein_g", "Protein g"], ["carbs_g", "Carbs g"], ["fat_g", "Fat g"]].map(([k, l]) => (
              <label key={k} className="space-y-1"><span className="text-xs text-muted">{l}</span>
                <input name={k} type="number" min={0} step="0.1" inputMode="decimal" required={k === "calories"} className="field font-mono" /></label>
            ))}
          </div>
          <button className="btn-gold w-full">Save food</button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {note && <p role="status" className="text-sm text-gold">{note}</p>}

      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick?.name ?? ""}>
        {pick && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Per {pick.serving_size}</p>
            <div className="flex gap-2">
              {MULTS.map((m) => (
                <button key={m} onClick={() => setMult(m)} className={`flex-1 rounded-full border py-2 font-mono ${mult === m ? "border-gold text-gold" : "border-line"}`}>{m}×</button>
              ))}
            </div>
            <dl className="grid grid-cols-4 gap-2 text-center font-mono">
              {([["kcal", pick.calories], ["P", pick.protein_g], ["C", pick.carbs_g], ["F", pick.fat_g]] as const).map(([l, v]) => (
                <div key={l} className="card p-2"><dt className="text-xs text-muted">{l}</dt><dd>{Math.round(v * mult)}</dd></div>
              ))}
            </dl>
            <button className="btn-gold w-full" onClick={() => log([{
              name: pick.name, serving_size: mult === 1 ? pick.serving_size : `${mult} × ${pick.serving_size}`,
              calories: pick.calories * mult, protein_g: pick.protein_g * mult, carbs_g: pick.carbs_g * mult, fat_g: pick.fat_g * mult,
            }], pick.id)}>Log to {meal}</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
