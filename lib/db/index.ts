import Dexie, { type EntityTable } from "dexie";
import type { TablesInsert } from "@/lib/supabase/types";

export type WorkoutPayload = {
  workout: TablesInsert<"workouts"> & { id: string; planned?: boolean };
  sets: TablesInsert<"workout_sets">[];
};
export type QueueItem = { seq?: number; createdAt: number; error?: string } & (
  | { kind: "workout"; payload: WorkoutPayload }
  | { kind: "nutrition"; payload: TablesInsert<"nutrition_logs"> }
  | { kind: "media"; payload: TablesInsert<"media"> & { id: string } }
);
export type CachedExercise = { id: string; name: string; muscle_group: string; equipment: string | null };
export type LocalMedia = { key: string; blob: Blob; type: "photo" | "video"; ext: string; createdAt: number; mediaId: string; retry: boolean };
export type CachedFood = { id: string; name: string; serving_size: string; calories: number; protein_g: number; carbs_g: number; fat_g: number };

export const db = new Dexie("ironheart") as Dexie & {
  queue: EntityTable<QueueItem, "seq">;
  exercises: EntityTable<CachedExercise, "id">;
  media: EntityTable<LocalMedia, "key">;
  foods: EntityTable<CachedFood, "id">;
};
db.version(1).stores({ queue: "++seq, kind", exercises: "id, name", media: "key" });
db.version(2).stores({ foods: "id, name" });

/** Content shared to the app from another app (manifest share_target), waiting to be logged. */
export type PendingShare = { id?: number; title: string; text: string; url: string; image: File | null; createdAt: number };

// Written by public/sw.js with plain IndexedDB, so it gets its own database: the worker never
// has to open (or version) the offline queue above. Keep name, version and store in sync with sw.js.
export const shareDb = new Dexie("ironheart-share") as Dexie & { shares: EntityTable<PendingShare, "id"> };
shareDb.version(1).stores({ shares: "++id" });
