"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import type { Tables } from "@/lib/supabase/types";

type Log = Pick<Tables<"nutrition_logs">, "id" | "food_name" | "calories" | "protein_g" | "carbs_g" | "fat_g" | "serving_size" | "meal_type">;
const FIELDS = [["calories", "kcal"], ["protein_g", "Protein g"], ["carbs_g", "Carbs g"], ["fat_g", "Fat g"]] as const;

export function EntryRow({ log }: { log: Log }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(log);
  const [error, setError] = useState<string | null>(null);

  async function run(op: "save" | "delete") {
    const { supabaseBrowser } = await import("@/lib/supabase/client");
    const t = supabaseBrowser().from("nutrition_logs");
    const { error } = op === "delete" ? await t.delete().eq("id", log.id)
      : await t.update({ food_name: v.food_name, calories: v.calories, protein_g: v.protein_g, carbs_g: v.carbs_g, fat_g: v.fat_g, meal_type: v.meal_type }).eq("id", log.id);
    if (error) return setError(navigator.onLine ? error.message : "Editing needs a connection.");
    setOpen(false);
    router.refresh();
  }

  return (
    <li>
      <button onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left">
        <span><span className="block">{log.food_name}</span><span className="text-xs text-muted">{log.serving_size}</span></span>
        <span className="font-mono text-sm">{Math.round(log.calories)} <span className="text-xs text-muted">kcal</span></span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Edit entry">
        <div className="space-y-3">
          <input className="field" aria-label="Food name" value={v.food_name} onChange={(e) => setV({ ...v, food_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(([k, label]) => (
              <label key={k} className="space-y-1"><span className="text-xs text-muted">{label}</span>
                <input type="number" min={0} step="0.1" inputMode="decimal" className="field font-mono" value={v[k]}
                  onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} /></label>
            ))}
          </div>
          <select className="field" aria-label="Meal" value={v.meal_type} onChange={(e) => setV({ ...v, meal_type: e.target.value })}>
            {["breakfast", "lunch", "dinner", "snack"].map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
          </select>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-gold flex-1" onClick={() => run("save")}>Save</button>
            <button className="btn-ghost text-danger" onClick={() => run("delete")}>Delete</button>
          </div>
        </div>
      </Sheet>
    </li>
  );
}
