import { execSync } from "node:child_process";
import { BASE, browser, check, onboard, signIn, seen, sql } from "./lib.mjs";

const b = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
const s = Date.now().toString(36);
const page = await signIn(ctx, `pwa_${s}@test.dev`);
await onboard(page, { name: "Pwa", handle: `pwa_${s}` });

const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
check(manifest.display === "standalone" && manifest.icons.length === 3 && manifest.start_url === "/home", "manifest valid");
for (const i of manifest.icons) check((await page.request.get(`${BASE}${i.src}`)).ok(), `icon ${i.src} served`);
const html = await page.content();
check(/apple-touch-icon/.test(html), "apple-touch-icon linked");
const splash = [...html.matchAll(/rel="apple-touch-startup-image"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*rel="apple-touch-startup-image"/g)].map((m) => m[1] ?? m[2]);
check(splash.length === 10, `10 iOS splash screens linked (${splash.length})`);
check((await Promise.all(splash.map((u) => page.request.get(`${BASE}${u}`).then((r) => r.ok())))).every(Boolean), "splash images served");

await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready.then(() => true), null, { timeout: 15000 });
await page.reload(); // first load installs the SW; this one is controlled
check(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "service worker controls the page");
const swHeaders = (await page.request.get(`${BASE}/sw.js`)).headers();
check(swHeaders["cache-control"]?.includes("no-store"), "sw.js not cached by HTTP");

// ---- warm cache: core screens + exercise/food lists are stored without visiting them ----
// (waitForFunction treats an async predicate's Promise as truthy, so poll with evaluate instead.)
const isWarm = () => page.evaluate(async () => {
  const pages = await caches.open("pages-v2");
  if (!(await pages.match("/workouts/new")) || !(await pages.match("/nutrition/foods"))) return false;
  const count = (store) => new Promise((ok) => {
    const req = indexedDB.open("ironheart");
    req.onsuccess = () => { try { const c = req.result.transaction(store).objectStore(store).count(); c.onsuccess = () => ok(c.result); } catch { ok(0); } };
    req.onerror = () => ok(0);
  });
  return (await count("exercises")) > 50 && (await count("foods")) > 100;
});
let warmed = false;
for (let i = 0; i < 60 && !(warmed = await isWarm()); i++) await page.waitForTimeout(500);
check(warmed, "core screens + exercises + foods pre-cached after sign-in");

// ---- truly offline cold launch: no network for the page AND the app server is down ----
// (Playwright's setOffline doesn't reach service-worker fetches, so also stop the server.)
const down = () => execSync("fuser -k 3000/tcp || true");
const up = () => execSync("(nohup npx next start -p 3000 > /tmp/next.log 2>&1 &) && sleep 4", {
  env: { ...process.env, OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: "http://localhost:4010/v1" },
}); // same mock-AI settings the suite expects (see e2e/README.md)
// Log one workout online first. Network-first re-caches /workouts/new, so the cached HTML now
// carries this saved workout's id: the exact setup where a reused id would drop the next offline log.
await page.goto(`${BASE}/workouts/new`);
await page.fill('input[aria-label="Workout name"]', "Online session");
await page.click("text=Add exercise");
await page.fill('input[aria-label="Search exercises"]', "squat");
await page.click("button:has-text('Back Squat') >> nth=0");
await page.click('button[aria-label="Complete set 1"]');
await page.click("text=/Finish workout/");
await page.waitForURL("**/workouts?saved=*");
await page.close();
await ctx.setOffline(true);
down();
const cold = await ctx.newPage();
await cold.goto(`${BASE}/workouts/new`);
check(await seen(cold, 'input[aria-label="Workout name"]'), "never-visited logger opens offline (cold launch)");
await cold.fill('input[aria-label="Workout name"]', "Cold start session");
await cold.click("text=Add exercise");
await cold.fill('input[aria-label="Search exercises"]', "deadlift");
await cold.click("button:has-text('Deadlift') >> nth=0");
await cold.fill('input[aria-label="Set 1 weight"]', "140");
await cold.fill('input[aria-label="Set 1 reps"]', "5");
await cold.click('button[aria-label="Complete set 1"]');
await cold.click("text=/Finish workout/");
check(await seen(cold, "text=Saved on this device"), "workout logged fully offline");
// Same cached page again.
await cold.goto(`${BASE}/workouts/new`);
await cold.fill('input[aria-label="Workout name"]', "Cold start session 2");
await cold.click("text=Add exercise");
await cold.fill('input[aria-label="Search exercises"]', "plank");
await cold.click("button:has-text('Plank') >> nth=0");
await cold.click('button[aria-label="Complete set 1"]');
await cold.click("text=/Finish workout/");
check(await seen(cold, "text=Saved on this device"), "second offline workout from the same cached page");
await cold.goto(`${BASE}/nutrition/foods`);
await cold.fill('input[aria-label="Search foods"]', "banana");
check(await seen(cold, "button:has-text('Banana')"), "food search works offline (IndexedDB)");
await cold.goto(`${BASE}/workouts/generate/bot`);
check(await seen(cold, "text=This page isn't saved"), "non-core screen shows offline fallback");

await ctx.setOffline(false);
up();
await cold.goto(`${BASE}/workouts`);
check(await seen(cold, "a:has-text('Cold start session')"), "offline workout syncs once back online");
const uid = sql(`select id from profiles where handle = 'pwa_${s}'`);
await seen(cold, "a:has-text('Cold start session 2')");
check(sql(`select count(*) from workouts where user_id = '${uid}' and name like 'Cold start session%'`) === "2", "both offline workouts synced (cached page never reuses a saved workout's id)");

// ---- storage full: upload rejected → photo kept on device, not retried ----
const wid = sql(`select id from workouts where user_id = '${uid}' and name = 'Cold start session'`);
await cold.route("**/storage/v1/object/media/**", (r) => r.fulfill({ status: 413, contentType: "application/json",
  body: JSON.stringify({ statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" }) }));
await cold.goto(`${BASE}/camera?checkin=${wid}`);
await cold.waitForSelector('button[aria-label="Take photo"]:not([disabled])', { timeout: 15000 });
await cold.click('button[aria-label="Take photo"]');
await cold.click("button:has-text('Save')");
await cold.waitForURL(`**/workouts/${wid}`);
check(await seen(cold, "text=Stored on this device"), "quota failure → photo kept on device with badge");
check(sql(`select storage_path like 'local:%' from media where workout_id = '${wid}'`) === "t", "media row points at the device copy");
await cold.unroute("**/storage/v1/object/media/**");
await cold.reload();
await cold.waitForTimeout(3000);
check(sql(`select storage_path like 'local:%' from media where workout_id = '${wid}'`) === "t", "quota failures aren't retried automatically");
check(await seen(cold, "text=Verified"), "local check-in still marks the day verified");
const page2 = cold;

const res = await page2.request.get(`${BASE}/home`);
check(res.headers()["x-frame-options"] === "DENY", "security headers set");
await b.close();
