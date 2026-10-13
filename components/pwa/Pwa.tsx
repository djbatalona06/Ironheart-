"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrowserValue } from "@/hooks/useBrowserValue";

const KEY = "ironheart:visits", DISMISSED = "ironheart:install-dismissed";
const START_URL = "/home"; // app/manifest.ts start_url

type LaunchQueue = { setConsumer(consumer: (launch: { targetURL?: string }) => void): void };

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

  // The manifest's launch_handler ("focus-existing") focuses the open window without
  // navigating it, so a home-screen shortcut tapped while the app is open would do nothing.
  // Follow shortcut targets ourselves; a plain icon tap (start_url) stays where the user is.
  const router = useRouter();
  useEffect(() => {
    (window as { launchQueue?: LaunchQueue }).launchQueue?.setConsumer(({ targetURL }) => {
      if (!targetURL) return;
      const to = new URL(targetURL, location.href);
      const target = to.pathname + to.search + to.hash;
      if (to.origin !== location.origin || target === START_URL || target === location.pathname + location.search + location.hash) return;
      router.push(target);
    });
  }, [router]);

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
  try { localStorage.removeItem(WARMED); } catch {}
}

// Screens that must open with no signal: logging is the whole point offline.
const CORE = ["/home", "/workouts", "/workouts/new", "/nutrition", "/nutrition/foods", "/camera", "/wagers", "/profile", "/offline"];
const WARMED = "ironheart:warmed", EVERY = 6 * 3600_000;

/** Signed-in only: pre-caches the core screens (and their scripts) so a cold launch works offline. */
export function WarmCache() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    try { if (Date.now() - Number(localStorage.getItem(WARMED)) < EVERY) return; } catch {}
    void navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "warm", urls: CORE });
      try { localStorage.setItem(WARMED, String(Date.now())); } catch {}
    });
    // The pickers read IndexedDB first, so prime it too: offline logging needs exercises + foods.
    void Promise.all([import("@/lib/db"), import("@/lib/supabase/client")]).then(async ([{ db }, { supabaseBrowser }]) => {
      const sb = supabaseBrowser();
      const [ex, foods] = await Promise.all([
        sb.from("exercises").select("id, name, muscle_group, equipment"),
        sb.from("foods").select("id, name, serving_size, calories, protein_g, carbs_g, fat_g"),
      ]);
      if (ex.data) await db.exercises.bulkPut(ex.data);
      if (foods.data) await db.foods.bulkPut(foods.data);
    }).catch(() => {});
  }, []);
  return null;
}
