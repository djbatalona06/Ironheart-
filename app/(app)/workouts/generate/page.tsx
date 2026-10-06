import Link from "next/link";
import { Bot } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";

export default async function Generate() {
  const { supabase } = await requireUser();
  const { data: templates, error } = await supabase.from("workout_templates").select("slug, name, days_per_week, description").order("days_per_week");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Programs</h1>
        <Link href="/workouts/generate/bot" className="btn-ghost"><Bot className="size-4" />Ask the bot</Link>
      </div>
      <p className="text-sm text-muted">Pick a proven structure, customize it, schedule it. Planned workouts only count toward your pact once you log them.</p>
      {error && <p role="alert" className="text-danger">Couldn&apos;t load programs.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates?.map((t) => (
          <li key={t.slug}>
            <Link href={`/workouts/generate/${t.slug}`} className="card block h-full space-y-1 p-4 hover:border-gold">
              <span className="font-mono text-xs text-gold">{t.days_per_week} DAYS / WEEK</span>
              <span className="block font-bold">{t.name}</span>
              <span className="block text-sm text-muted">{t.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
