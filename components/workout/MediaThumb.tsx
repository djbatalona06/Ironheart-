"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

/** Shows a Storage-backed (signed URL) or device-local (IndexedDB) photo/clip. */
export function MediaThumb({ path, url, type, caption }: { path: string; url: string | null; type: string; caption: string | null }) {
  const [src, setSrc] = useState(url);
  const local = path.startsWith("local:");
  useEffect(() => {
    if (!local) return;
    let u: string | undefined;
    db.media.get(path.slice(6)).then((m) => { if (m) setSrc((u = URL.createObjectURL(m.blob))); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [local, path]);

  return (
    <figure className="card overflow-hidden">
      {!src ? <div className="grid aspect-video place-items-center text-xs text-muted">{local ? "Stored on another device" : "Unavailable"}</div>
        : type === "video" ? <video src={src} playsInline muted controls className="w-full" />
        // eslint-disable-next-line @next/next/no-img-element -- signed/blob URLs
        : <img src={src} alt={caption ?? "Workout photo"} className="w-full" />}
      {(caption || local) && (
        <figcaption className="flex justify-between gap-2 p-2 text-xs">
          <span>{caption}</span>{local && <span className="text-gold">Stored on this device</span>}
        </figcaption>
      )}
    </figure>
  );
}
