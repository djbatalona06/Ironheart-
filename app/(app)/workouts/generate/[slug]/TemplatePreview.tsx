"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, FileText, Minus, Plus } from "lucide-react";
import { exportDocx, exportXlsx, type ProgramDay } from "@/lib/export/program";
import { addDays, mondayOf } from "@/lib/pacts/week";
import { planProgram } from "./actions";

const minutes = (d: ProgramDay) => Math.round(d.exercises.reduce((m, e) => m + e.sets * 2.5, 5));

export function TemplatePreview({ slug, name, perWeek, days: initial }: { slug: string; name: string; perWeek: number; days: ProgramDay[] }) {
  const [days, setDays] = useState(initial);
  const [start, setStart] = useState(() => addDays(mondayOf(new Date().toISOString().slice(0, 10)), 7));
  const [weeks, setWeeks] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Unique days only for display/export (6-day splits repeat 3 days).
  const unique = days.filter((d, i) => days.findIndex((x) => x.name === d.name) === i);

  const edit = (dayName: string, idx: number, patch: Partial<ProgramDay["exercises"][number]>) =>
    setDays((all) => all.map((d) => d.name !== dayName ? d : { ...d, exercises: d.exercises.map((e, i) => i === idx ? { ...e, ...patch } : e) }));
  const remove = (dayName: string, idx: number) =>
    setDays((all) => all.map((d) => d.name !== dayName ? d : { ...d, exercises: d.exercises.filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-4">
      {unique.map((d) => (
        <section key={d.name} className="card p-3">
          <h2 className="mb-2 flex justify-between font-bold">{d.name}<span className="font-mono text-xs text-muted">~{minutes(d)} min</span></h2>
          <ul className="space-y-1.5">
            {d.exercises.map((e, i) => (
              <li key={e.name + i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-sm">
                <span>{e.name}{e.pct_1rm ? <span className="text-xs text-gold"> @{e.pct_1rm}%</span> : null}</span>
                <span className="flex items-center gap-1 font-mono">
                  <button aria-label={`Fewer sets of ${e.name}`} className="grid size-8 place-items-center rounded border border-line" onClick={() => edit(d.name, i, { sets: Math.max(1, e.sets - 1) })}><Minus className="size-3" /></button>
                  {e.sets}
                  <button aria-label={`More sets of ${e.name}`} className="grid size-8 place-items-center rounded border border-line" onClick={() => edit(d.name, i, { sets: Math.min(10, e.sets + 1) })}><Plus className="size-3" /></button>
                </span>
                <input aria-label={`Reps for ${e.name}`} className="field h-8 min-h-8 w-16 text-center font-mono" value={e.reps} maxLength={10}
                  onChange={(ev) => edit(d.name, i, { reps: ev.target.value })} />
                <button aria-label={`Remove ${e.name}`} className="text-xs text-muted underline" onClick={() => remove(d.name, i)}>remove</button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => exportDocx({ name, days: unique })}><FileText className="size-4" />.docx</button>
        <button className="btn-ghost flex-1" onClick={() => exportXlsx({ name, days: unique })}><FileSpreadsheet className="size-4" />.xlsx</button>
      </div>

      <section className="card space-y-3 p-4">
        <h2 className="display text-2xl">Use this program</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-xs text-muted">Start</span>
            <input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="space-y-1"><span className="text-xs text-muted">Weeks</span>
            <input type="number" min={1} max={12} className="field font-mono" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></label>
        </div>
        <p className="text-xs text-muted">{perWeek * weeks} planned workouts. Customizations above are included.</p>
        <button className="btn-gold w-full" disabled={pending} onClick={() => startTransition(async () => {
          const res = await planProgram({ slug, name, perWeek, start, weeks, days });
          if (res?.error) setError(res.error);
        })}>{pending ? "Scheduling…" : "Schedule it"}</button>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </section>
    </div>
  );
}
