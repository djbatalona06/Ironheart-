/** Circular progress ring (docs/09). Pure SVG; fills clockwise and animates via CSS transition. */
export function MacroRing({ label, current, goal, color, unit = "g" }: {
  label: string; current: number; goal: number | null; color: string; unit?: string;
}) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = goal ? Math.min(1, current / goal) : 0;
  return (
    <figure className="flex flex-col items-center gap-1" aria-label={`${label}: ${Math.round(current)}${unit}${goal ? ` of ${goal}${unit}` : ""}`}>
      <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 400ms ease-out" }} />
      </svg>
      <figcaption className="-mt-[4.25rem] mb-6 text-center font-mono text-sm leading-tight">
        {Math.round(current)}<span className="block text-[10px] text-muted">{goal ? `/ ${goal}${unit}` : unit}</span>
      </figcaption>
      <span className="text-xs text-muted">{label}</span>
    </figure>
  );
}
