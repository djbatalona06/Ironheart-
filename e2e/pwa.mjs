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

// ---- shortcuts + launch handler (docs/13 Phase A) ----
check(manifest.shortcuts?.length === 3, "manifest has 3 shortcuts");
for (const sc of manifest.shortcuts ?? []) {
  const r = await page.request.get(`${BASE}${sc.url}`, { maxRedirects: 0 });
  check(r.status() === 200, `shortcut "${sc.name}" → ${sc.url} is 200 when signed in (${r.status()})`);
  const icon = await page.request.get(`${BASE}${sc.icons[0].src}`);
  const png = await icon.body();
  check(icon.ok() && icon.headers()["content-type"] === "image/png" && png.readUInt32BE(16) === 96 && png.readUInt32BE(20) === 96,
    `shortcut icon ${sc.icons[0].src} is a 96×96 PNG`);
}
check(manifest.launch_handler?.client_mode === "focus-existing", "launch_handler focuses the existing window");
check(manifest.share_target?.action === "/share-target" && manifest.share_target.method === "POST"
  && manifest.share_target.params.files?.[0]?.accept?.[0] === "image/*", "share_target accepts images by POST");

// Signed out, a shortcut lands on /login and sign-in returns to the shortcut's page.
const guest = await b.newContext({ viewport: { width: 390, height: 844 } });
const knock = await guest.newPage();
await knock.goto(`${BASE}/workouts`);
check(knock.url().endsWith("/login"), "signed-out shortcut → /login");
const back = await signIn(guest, `pwa_${s}@test.dev`);
await back.waitForURL("**/workouts");
check(true, "after sign-in the shortcut target opens");
await guest.close();

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

// ---- share target (docs/13 Phase B): the service worker keeps the share on the device ----
// Submits the same multipart POST the Android share sheet sends, from a worker-controlled page.
const shareTo = (p, text) => p.evaluate(async (text) => {
  const png = await (await fetch("/icons/192.png")).blob();
  const form = Object.assign(document.createElement("form"), { method: "post", action: "/share-target", enctype: "multipart/form-data" });
  const file = Object.assign(document.createElement("input"), { type: "file", name: "image" });
  const dt = new DataTransfer();
  dt.items.add(new File([png], "label.png", { type: "image/png" }));
  file.files = dt.files;
  form.append(file, Object.assign(document.createElement("input"), { type: "hidden", name: "text", value: text }));
  document.body.append(form);
  setTimeout(() => form.submit()); // after evaluate returns: the navigation tears this context down
}, text);
const pendingShares = (p) => p.evaluate(() => new Promise((ok) => {
  const open = indexedDB.open("ironheart-share");
  open.onsuccess = () => { try { const c = open.result.transaction("shares").objectStore("shares").count(); c.onsuccess = () => ok(c.result); } catch { ok(0); } };
  open.onerror = () => ok(-1);
}));
// Who answered each share POST: the service worker (on the device) or the server.
const shareAnswers = { worker: 0, server: 0 };
const watchShares = (p) => p.on("response", (r) => {
  if (r.request().method() === "POST" && r.url().endsWith("/share-target")) shareAnswers[r.fromServiceWorker() ? "worker" : "server"]++;
});
watchShares(page);

await shareTo(page, "Oat bar 200 kcal");
await page.waitForURL("**/nutrition?shared=1");
check(await seen(page, "text=Shared to IRONHEART") && await seen(page, 'img[alt="Shared photo"]'), "shared photo opens Nutrition with the logger");
check(await page.inputValue('textarea[aria-label="Describe what you ate"]') === "Oat bar 200 kcal", "logger is prefilled with the shared text");
check(await pendingShares(page) === 1, "share is parked in IndexedDB");
// Saving a log entry clears the pending share.
await page.click("button:has-text('Search')");
await page.fill('input[aria-label="Search foods"]', "banana");
await page.click("button:has-text('Banana') >> nth=0");
await page.click("text=/Log to/");
await page.waitForURL(/\/nutrition$/);
check(await pendingShares(page) === 0, "pending share cleared once it is logged");

// Signed out: the share waits on the device through sign-in.
const guest2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const out = await guest2.newPage();
watchShares(out);
await out.goto(`${BASE}/offline`); // public page; not /login, so the wait below sees a real navigation
await out.waitForFunction(() => navigator.serviceWorker?.ready.then(() => true), null, { timeout: 15000 });
await out.reload();
await out.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
await shareTo(out, "Granola 180 kcal");
await out.waitForURL("**/login");
check(await pendingShares(out) === 1, "signed-out share → /login, kept on the device");
const back2 = await signIn(guest2, `pwa_${s}@test.dev`);
await back2.waitForURL("**/nutrition?shared=1");
check(await back2.inputValue('textarea[aria-label="Describe what you ate"]') === "Granola 180 kcal", "after sign-in the shared item is still there");
await back2.click("text=Dismiss");
await back2.waitForURL(/\/nutrition$/);
check(await pendingShares(back2) === 0, "dismissing clears the pending share");
check(shareAnswers.worker === 2 && shareAnswers.server === 0, "shared content never left the device (service worker answered both shares)");
await guest2.close();

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
