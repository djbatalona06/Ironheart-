import { notFound } from "next/navigation";
import { Logger } from "@/components/workout/Logger";
import { requireUser } from "@/lib/supabase/server";
import { emptyDraft, type Block, type Draft } from "@/lib/workout/draft";

export default async function NewWorkout({ searchParams }: PageProps<"/workouts/new">) {
  const { planned } = await searchParams;
  const { supabase, user } = await requireUser();
  let draft: Draft = emptyDraft();

  if (typeof planned === "string") {
    const { data: w } = await supabase.from("workouts")
      .select("id, name, generated_from, workout_sets(id, set_index, reps, weight_kg, exercise_id, exercises(name))")
      .eq("id", planned).eq("user_id", user.id).eq("status", "planned").maybeSingle();
    if (!w) notFound();
    const blocks: Block[] = [];
    for (const s of [...w.workout_sets].sort((a, b) => a.set_index - b.set_index)) {
      let b = blocks.at(-1);
      if (b?.exercise_id !== s.exercise_id) blocks.push(b = { exercise_id: s.exercise_id, name: s.exercises?.name ?? "Exercise", sets: [] });
      b.sets.push({ id: s.id, reps: s.reps?.toString() ?? "", weight: s.weight_kg?.toString() ?? "", rpe: "", completed: false });
    }
    draft = { ...draft, id: w.id, name: w.name, blocks, planned: true, generatedFrom: w.generated_from ?? "manual" };
  }

  return (
    <>
      <h1 className="display mb-4 text-4xl">{draft.planned ? "Planned workout" : "Log workout"}</h1>
      <Logger userId={user.id} initial={draft} storageKey={draft.planned ? `ironheart:draft:${draft.id}` : "ironheart:draft"} />
    </>
  );
}
