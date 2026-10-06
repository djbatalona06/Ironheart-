// IRONHEART service worker. Hand-written, no build step (docs/07, Phase 6 notes).
// Static assets: cache-first. Pages + RSC payloads: network-first (3s), fall back
// to cache, then /offline. Supabase/API traffic is never cached.
const VERSION = "v1";
// HTML and RSC payloads share URLs, so they live in separate caches (never serve one for the other).
const STATIC = `static-${VERSION}`, PAGES = `pages-${VERSION}`, RSC = `rsc-${VERSION}`, IMAGES = `images-${VERSION}`;
const PRECACHE = ["/offline", "/icons/192.png", "/icons/512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Sign-out clears cached pages so the next person on this device can't see them.
self.addEventListener("message", (e) => {
  if (e.data === "clear-pages") e.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(RSC)]));
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => c.delete(k)));
}

async function networkFirst(cacheName, req, fallbackToOffline) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
    if (res.ok && !res.redirected) { cache.put(req, res.clone()); trim(cacheName, 40); }
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    if (fallbackToOffline) return (await caches.match("/offline")) ?? Response.error();
    return Response.error();
  }
}

async function cacheFirst(cacheName, req, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) { cache.put(req, res.clone()); if (max) trim(cacheName, max); }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;     // Supabase, OpenAI, etc.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (url.pathname.startsWith("/_next/static/")) return e.respondWith(cacheFirst(STATIC, req));
  if (req.mode === "navigate") return e.respondWith(networkFirst(PAGES, req, true));
  if (req.headers.get("RSC") === "1") return e.respondWith(networkFirst(RSC, req, false)); // client-side navigations
  if (req.destination === "image") return e.respondWith(cacheFirst(IMAGES, req, 100));
});
