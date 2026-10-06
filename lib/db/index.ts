import Dexie, { type EntityTable } from "dexie";
import type { TablesInsert } from "@/lib/supabase/types";

export type WorkoutPayload = {
  workout: TablesInsert<"workouts"> & { id: string; planned?: boolean };
  sets: TablesInsert<"workout_sets">[];
};
export type QueueItem = { seq?: number; createdAt: number; error?: string } & (
  | { kind: "workout"; payload: WorkoutPayload }
  | { kind: "nutrition"; payload: TablesInsert<"nutrition_logs"> }
);
export type CachedExercise = { id: string; name: string; muscle_group: string; equipment: string | null };
export type LocalMedia = { key: string; blob: Blob; type: "photo" | "video"; createdAt: number };

export const db = new Dexie("ironheart") as Dexie & {
  queue: EntityTable<QueueItem, "seq">;
  exercises: EntityTable<CachedExercise, "id">;
  media: EntityTable<LocalMedia, "key">;
};
db.version(1).stores({ queue: "++seq, kind", exercises: "id, name", media: "key" });
