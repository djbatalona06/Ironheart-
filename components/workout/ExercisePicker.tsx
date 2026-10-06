"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { db, type CachedExercise } from "@/lib/db";
import { supabaseBrowser } from "@/lib/supabase/client";

const GROUPS = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core", "full_body", "cardio"];

export function ExercisePicker({ open, onClose, onPick, userId }: {
  open: boolean; onClose: () => void; onPick: (e: CachedExercise) => void; userId: string;
}) {
  const [all, setAll] = useState<CachedExercise[]>([]);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Cache-first so the picker works offline, then refresh from the server.
    db.exercises.toArray().then((c) => c.length && setAll(c));
    supabaseBrowser().from("exercises").select("id, name, muscle_group, equipment").order("name")
      .then(({ data }) => { if (data) { setAll(data); void db.exercises.bulkPut(data); } });
  }, [open]);

  const list = useMemo(() => all.filter((e) =>
    (!group || e.muscle_group === group) && e.name.toLowerCase().includes(q.trim().toLowerCase())), [all, q, group]);

  async function addCustom() {
    const name = q.trim();
    if (!name) return;
    const { data, error } = await supabaseBrowser().from("exercises")
      .insert({ name, muscle_group: group ?? "full_body", is_custom: true, created_by: userId })
      .select("id, name, muscle_group, equipment").single();
    if (error) return setError(navigator.onLine ? error.message : "Custom exercises need a connection.");
    await db.exercises.put(data);
    onPick(data);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <input className="field mb-3" placeholder="Search exercises" aria-label="Search exercises"
        value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {GROUPS.map((g) => (
          <button key={g} onClick={() => setGroup(group === g ? null : g)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm capitalize ${group === g ? "border-gold text-gold" : "border-line text-muted"}`}>
            {g.replace("_", " ")}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {list.map((e) => (
          <li key={e.id}>
            <button onClick={() => onPick(e)} className="flex min-h-12 w-full items-center justify-between text-left">
              <span>{e.name}</span><span className="text-xs capitalize text-muted">{e.equipment}</span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <div className="space-y-3 py-6 text-center">
          <p className="text-muted">{all.length ? "No match." : "Loading exercises…"}</p>
          {q.trim() && <button className="btn-ghost" onClick={addCustom}><Plus className="size-4" />Create “{q.trim()}”</button>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Sheet>
  );
}
