"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodLogger, type FoodLoggerProps } from "@/app/(app)/nutrition/foods/FoodLogger";
import { shareDb, type PendingShare } from "@/lib/db";

/**
 * A photo or text shared to IRONHEART from another app (public/sw.js parks it in IndexedDB).
 * Shows it next to the food logger, prefilled, and removes it once logged or dismissed.
 * The photo is a reference for the user: it is never uploaded.
 */
export function SharedFood(props: FoodLoggerProps) {
  const router = useRouter();
  const [share, setShare] = useState<PendingShare | null>();
  const [photo, setPhoto] = useState<string>();

  useEffect(() => {
    let url: string | undefined;
    shareDb.shares.toCollection().last().then((s) => {
      if (!s) return router.replace("/nutrition");
      if (s.image) setPhoto((url = URL.createObjectURL(s.image)));
      setShare(s);
    }).catch(() => setShare(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [router]);

  if (share === undefined) return <p className="text-sm text-muted">Loading what you shared…</p>;
  if (share === null) return <p role="alert" className="text-sm text-danger">Couldn&apos;t open what you shared. <Link href="/nutrition" className="underline">Back to nutrition</Link></p>;

  const text = [share.title, share.text, share.url].filter(Boolean).join("\n");
  const clear = () => shareDb.shares.clear();
  return (
    <div className="space-y-4">
      <section className="card space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Shared to IRONHEART</h2>
          <button className="min-h-11 px-2 text-sm text-muted underline" onClick={async () => { await clear(); router.replace("/nutrition"); }}>Dismiss</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
        {photo && <img src={photo} alt="Shared photo" className="max-h-64 w-full rounded-lg object-contain" />}
        {text && <p className="whitespace-pre-wrap break-words text-sm text-muted">{text}</p>}
        <p className="text-xs text-muted">Kept on this device only. It&apos;s removed when you log it or dismiss it.</p>
      </section>
      <FoodLogger {...props} prefill={text} onLogged={clear} />
    </div>
  );
}
