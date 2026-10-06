"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Read a browser-only value without a hydration mismatch (server renders `fallback`). */
export function useBrowserValue<T>(read: () => T, fallback: T, subscribe: (cb: () => void) => () => void = noop) {
  return useSyncExternalStore(subscribe, read, () => fallback);
}

const onlineSub = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => { removeEventListener("online", cb); removeEventListener("offline", cb); };
};
export const useOnline = () => useBrowserValue(() => navigator.onLine, true, onlineSub);
