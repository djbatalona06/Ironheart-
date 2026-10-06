"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Mirrors the browser timezone into a cookie so server pages can compute "today". */
export function TzCookie({ current }: { current: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, router]);
  return null;
}
