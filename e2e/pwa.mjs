import { execSync } from "node:child_process";
import { BASE, browser, check, onboard, signIn, seen } from "./lib.mjs";

const b = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const s = Date.now().toString(36);
const page = await signIn(ctx, `pwa_${s}@test.dev`);
await onboard(page, { name: "Pwa", handle: `pwa_${s}` });

const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
check(manifest.display === "standalone" && manifest.icons.length === 3 && manifest.start_url === "/home", "manifest valid");
for (const i of manifest.icons) check((await page.request.get(`${BASE}${i.src}`)).ok(), `icon ${i.src} served`);
check(/apple-touch-icon/.test(await page.content()), "apple-touch-icon linked");

await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready.then(() => true), null, { timeout: 15000 });
await page.reload(); // first load installs the SW; this one is controlled
check(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "service worker controls the page");
const swHeaders = (await page.request.get(`${BASE}/sw.js`)).headers();
check(swHeaders["cache-control"]?.includes("no-store"), "sw.js not cached by HTTP");

await page.goto(`${BASE}/workouts`);
await page.goto(`${BASE}/home`);
// Playwright's setOffline doesn't reach service-worker fetches, so take the server down instead.
execSync("fuser -k 3000/tcp || true");
await page.waitForTimeout(500);
await page.goto(`${BASE}/workouts`);
check(await seen(page, "h1:has-text('Workouts')"), "visited page loads from cache with the server down");
await page.goto(`${BASE}/workouts/generate/bot`);
check(await seen(page, "text=This page isn't saved"), "unvisited page shows offline fallback");
// Restart with the same mock-AI settings the suite expects (see e2e/README.md).
execSync("(nohup npx next start -p 3000 > /tmp/next.log 2>&1 &) && sleep 4", {
  env: { ...process.env, OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: "http://localhost:4010/v1" },
});

const res = await page.request.get(`${BASE}/home`);
check(res.headers()["x-frame-options"] === "DENY", "security headers set");
await b.close();
