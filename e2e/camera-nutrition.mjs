import { BASE, browser, check, logWorkout, onboard, signIn, sql, seen } from "./lib.mjs";
import { startMockOpenAI } from "./mock-openai.mjs";

const mock = await startMockOpenAI();
const b = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
const s = Date.now().toString(36);
const page = await signIn(ctx, `cam_${s}@test.dev`);
await onboard(page, { name: "Cam", handle: `cam_${s}` });
const uid = sql(`select id from profiles where handle = 'cam_${s}'`);

// ---- photo check-in ----
await logWorkout(page, "Check-in day");
await page.click("a:has-text('Check-in day')");
await page.click("text=Add photo check-in");
await page.waitForURL("**/camera?checkin=*");
await page.waitForSelector('button[aria-label="Take photo"]:not([disabled])', { timeout: 15000 });
check(true, "fake camera goes live");
await page.click('button[aria-label="Take photo"]');
await page.click("button:has-text('Save')");
await page.waitForURL("**/workouts/*-*");
await page.waitForSelector("text=Verified");
const m = sql(`select is_checkin || '|' || storage_path from media where user_id = '${uid}'`);
check(m.startsWith("true|" + uid + "/") && m.endsWith(".jpg"), "check-in media row → Storage path");
const size = Number(sql(`select (metadata->>'size')::int from storage.objects where name = '${m.split("|")[1]}'`));
check(size > 0 && size < 500 * 1024, `photo compressed under 500 KB (${size} B)`);
check(await page.locator("figure img").count() === 1, "photo renders from signed URL");

// ---- 2s video clip with caption → profile ----
await page.goto(`${BASE}/camera`);
await page.click("role=tab[name='video']");
await page.waitForSelector('button[aria-label="Start recording"]:not([disabled])', { timeout: 15000 });
await page.click('button[aria-label="Start recording"]');
await page.waitForTimeout(2200);
await page.click('button[aria-label="Stop recording"]');
await page.waitForSelector("video[controls]");
await page.fill('input[aria-label="Caption"]', "Squat depth check");
await page.selectOption("select", "");
await page.click("button:has-text('Save')");
await page.waitForURL("**/profile");
check(await seen(page, "text=Squat depth check"), "clip + caption on profile");
check(await page.locator("figure video[src^='http']").count() === 1, "clip plays from signed URL");
check(sql(`select duration_seconds between 1 and 15 from media where user_id = '${uid}' and type = 'video'`) === "t", "clip duration recorded");

// ---- offline photo → stored locally → uploads on reconnect ----
await page.goto(`${BASE}/camera`);
await page.waitForSelector('button[aria-label="Take photo"]:not([disabled])', { timeout: 15000 });
await page.click('button[aria-label="Take photo"]');
await ctx.setOffline(true);
await page.click("button:has-text('Save')");
await page.waitForSelector("text=Saved on this device");
check(true, "offline capture saved on device");
await ctx.setOffline(false);
await page.waitForFunction(() => !document.querySelector('[role="status"]')?.textContent?.includes("Syncing"), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(3000);
const paths = sql(`select string_agg(storage_path, ',') from media where user_id = '${uid}' and type = 'photo'`);
check(paths.split(",").length === 2 && !paths.includes("local:"), `offline photo uploaded after reconnect (${paths.split(",").length} photos)`);

// ---- nutrition ----
await page.goto(`${BASE}/nutrition`);
check(await seen(page, "text=/\\/ 160g/"), "protein goal from onboarding (2 g/kg)");
await page.click('a[aria-label="Add to breakfast"]');
await page.fill('input[aria-label="Search foods"]', "egg, wh");
await page.click("text=Egg, whole");
await page.click("button:has-text('2×')");
await page.click("text=Log to breakfast");
await page.waitForURL(/\/nutrition$/);
await page.waitForSelector("text=Egg, whole");
check(await seen(page, "text=144"), "2 eggs = 144 kcal logged");

// AI estimate (mock) → log
await page.click('a[aria-label="Add to lunch"]');
await page.click("text=Describe it");
await page.fill('textarea[aria-label="Describe what you ate"]', "2 eggs");
await page.click("button:has-text('Estimate')");
await page.click("text=Log 1 item");
await page.waitForURL(/\/nutrition$/);
check(await page.locator("text=Egg").count() >= 2, "AI estimate logged to lunch");

// Offline food log
await page.click('a[aria-label="Add to snack"]');
await page.fill('input[aria-label="Search foods"]', "banana");
await page.click("text=Banana");
await ctx.setOffline(true);
await page.click("text=Log to snack");
await page.waitForSelector("text=/Saved offline/");
await ctx.setOffline(false);
await page.waitForTimeout(3000);
check(sql(`select count(*) from nutrition_logs where user_id = '${uid}' and food_name = 'Banana'`) === "1", "offline food log synced");

// Custom food that hits the protein goal → +3 points
await page.click("text=Create food");
await page.fill('input[name="name"]', "Test Mega Shake");
await page.fill('input[name="calories"]', "900");
await page.fill('input[name="protein_g"]', "200");
await page.click("text=Save food");
await page.click("text=Log to snack");
await page.waitForURL(/\/nutrition$/);
check(sql(`select count(*) from points_ledger where user_id = '${uid}' and reason = 'macro_hit'`) === "1", "protein goal hit → +3 points once");

// Edit + delete
await page.click("button:has-text('Test Mega Shake')");
await page.fill('input[aria-label="Food name"]', "Mega Shake");
await page.click("dialog button:has-text('Save')");
await page.waitForFunction(() => !document.body.innerText.includes("Test Mega Shake"));
await page.click("button:has-text('Mega Shake')");
await page.click("dialog button:has-text('Delete')");
await page.waitForFunction(() => !document.body.innerText.includes("Mega Shake"));
check(true, "edit + delete entry");
await page.screenshot({ path: "e2e/out/nutrition.png", fullPage: true });

// Turn nutrition off
await page.goto(`${BASE}/profile`);
await page.uncheck('input[name="nutrition_enabled"]');
await page.click("form button:has-text('Save')");
await page.waitForSelector("text=Saved.");
await page.goto(`${BASE}/nutrition`);
check(await seen(page, "text=Nutrition is off"), "nutrition can be turned off");
await b.close();
mock.close();
