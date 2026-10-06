export type SetRow = { id: string; reps: string; weight: string; rpe: string; completed: boolean };
export type Block = { exercise_id: string; name: string; sets: SetRow[] };
export type Draft = {
  id: string; name: string; startedAt: string; notes: string; blocks: Block[]; planned: boolean; generatedFrom: string;
};

export const newSet = (prev?: Pick<SetRow, "reps" | "weight">): SetRow =>
  ({ id: crypto.randomUUID(), reps: prev?.reps ?? "", weight: prev?.weight ?? "", rpe: "", completed: false });

export function emptyDraft(): Draft {
  return { id: crypto.randomUUID(), name: "", startedAt: new Date().toISOString(), notes: "", blocks: [], planned: false, generatedFrom: "manual" };
}
