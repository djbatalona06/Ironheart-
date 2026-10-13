"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Nutrition's reminder that a share is still waiting (shared while offline or signed out). */
export function ShareWaiting() {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    // Lazy: keeps Dexie out of Nutrition's first-load bundle.
    void import("@/lib/db").then(({ shareDb }) => shareDb.shares.count()).then((n) => setWaiting(n > 0)).catch(() => {});
  }, []);
  if (!waiting) return null;
  return <Link href="/nutrition?shared=1" className="block rounded-lg border border-dashed border-gold p-3 text-sm text-gold">Something you shared is waiting to be logged.</Link>;
}
