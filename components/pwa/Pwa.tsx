"use client";

import { useEffect, useState } from "react";
import { useBrowserValue } from "@/hooks/useBrowserValue";

const KEY = "ironheart:visits", DISMISSED = "ironheart:install-dismissed";

/** Registers the service worker; shows the iOS "Add to Home Screen" tip from the 2nd visit (iOS has no install prompt). */
export function Pwa() {
  const [dismissed, setDismissed] = useState(false);
  const show = useBrowserValue(() => {
    try {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      return ios && !standalone && Number(localStorage.getItem(KEY)) >= 2 && !localStorage.getItem(DISMISSED);
    } catch { return false; }
  }, false);

  useEffect(() => {
    try { localStorage.setItem(KEY, String(Number(localStorage.getItem(KEY)) + 1)); } catch {}
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  if (!show || dismissed) return null;
  return (
    <div role="dialog" aria-label="Install IRONHEART" className="fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-gold bg-surface p-3 text-sm shadow-lg">
      <p className="flex-1">Install IRONHEART: tap <b>Share</b> → <b>Add to Home Screen</b>.</p>
      <button className="font-bold text-gold" onClick={() => { try { localStorage.setItem(DISMISSED, "1"); } catch {} setDismissed(true); }}>Got it</button>
    </div>
  );
}

/** Ask the service worker to drop cached pages (call before signing out). */
export function clearCachedPages() {
  navigator.serviceWorker?.controller?.postMessage("clear-pages");
}
