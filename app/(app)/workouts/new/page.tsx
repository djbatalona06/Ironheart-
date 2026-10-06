import { Logger } from "@/components/workout/Logger";
import { emptyDraft } from "@/lib/workout/draft";
import { requireUser } from "@/lib/supabase/server";

export default async function NewWorkout() {
  const { user } = await requireUser();
  return (
    <>
      <h1 className="display mb-4 text-4xl">Log workout</h1>
      <Logger userId={user.id} initial={emptyDraft()} storageKey="ironheart:draft" />
    </>
  );
}
