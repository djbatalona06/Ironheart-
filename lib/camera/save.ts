import imageCompression from "browser-image-compression";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/db/queue";
import { supabaseBrowser } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024; // Supabase free tier per-file limit

export const compressPhoto = (blob: Blob) =>
  imageCompression(new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }),
    { maxSizeMB: 0.5, maxWidthOrHeight: 1280, fileType: "image/jpeg", useWebWorker: true });

/**
 * Upload to Storage, or keep the file on this device when offline / out of quota
 * (docs/06). Offline captures retry upload on reconnect; quota failures don't.
 */
export async function saveMedia(p: {
  blob: Blob; type: "photo" | "video"; userId: string; workoutId: string | null;
  caption: string | null; isCheckin: boolean; seconds?: number;
}): Promise<{ local: boolean }> {
  if (p.blob.size > MAX_BYTES) throw new Error("That clip is over 50 MB. Record a shorter one.");
  const id = crypto.randomUUID();
  const ext = p.type === "photo" ? "jpg" : p.blob.type.includes("mp4") ? "mp4" : "webm";
  let storagePath = `${p.userId}/${id}.${ext}`;
  let local = false;

  try {
    const { error } = await supabaseBrowser().storage.from("media").upload(storagePath, p.blob, { contentType: p.blob.type });
    if (error) throw Object.assign(error, { quota: true });
  } catch (e) {
    const offline = !navigator.onLine || !(e as { quota?: boolean }).quota;
    await db.media.put({ key: id, blob: p.blob, type: p.type, createdAt: Date.now(), mediaId: id, retry: offline, ext });
    storagePath = `local:${id}`;
    local = true;
  }

  await enqueue({ kind: "media", payload: {
    id, user_id: p.userId, workout_id: p.workoutId, type: p.type, storage_path: storagePath,
    duration_seconds: p.seconds ?? null, caption: p.caption, is_checkin: p.isCheckin,
  } });
  return { local };
}
