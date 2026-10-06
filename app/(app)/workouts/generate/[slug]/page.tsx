import { notFound } from "next/navigation";
import type { ProgramDay } from "@/lib/export/program";
import { requireUser } from "@/lib/supabase/server";
import { TemplatePreview } from "./TemplatePreview";

export default async function Template({ params }: PageProps<"/workouts/generate/[slug]">) {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const { data: t } = await supabase.from("workout_templates").select("*").eq("slug", slug).maybeSingle();
  if (!t) notFound();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="display text-4xl">{t.name}</h1>
        <p className="text-sm text-muted">{t.description}</p>
        <p className="mt-1 text-xs text-muted">{t.source_note}</p>
      </header>
      <TemplatePreview slug={t.slug} name={t.name} perWeek={t.days_per_week} days={t.days as unknown as ProgramDay[]} />
    </div>
  );
}
