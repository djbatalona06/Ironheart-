import { BASE, browser, check, logWorkout, onboard, realtimeReady, signIn, sql } from "./lib.mjs";

const b = await browser();
const s = Date.now().toString(36);
const alice = await signIn(b, `ca_${s}@test.dev`);
await onboard(alice, { name: "Ana", handle: `ca_${s}` });
const bobCtx = await b.newContext({ viewport: { width: 390, height: 844 } });
const bob = await signIn(bobCtx, `cb_${s}@test.dev`);
const bobLive = realtimeReady(bob, "notify:");
await onboard(bob, { name: "Ben", handle: `cb_${s}` });
await bobLive;

// Alice challenges Bob → Bob gets a live toast
await alice.goto(`${BASE}/wagers/challenges/new`);
await alice.fill('input[name="title"]', "Week warrior");
await alice.fill('input[name="days"]', "7");
await alice.fill('input[name="handle"]', `cb_${s}`);
await alice.click("text=Send challenge");
await alice.waitForURL(/challenges\/[0-9a-f-]{36}$/);
const wid = alice.url().split("/").pop();
await bob.waitForSelector("text=/challenged you: Week warrior/", { timeout: 10000 });
check(true, "bob gets a realtime toast");
check(await bob.waitForSelector('a[aria-label="Notifications, 1 unread"]', { timeout: 5000 }).then(() => true, () => false), "badge shows 1 unread");

// Bob accepts
await bob.goto(`${BASE}/wagers/challenges/${wid}`);
await bob.click("text=Accept challenge");
await bob.waitForSelector("text=/days? left/");
check(sql(`select status from wagers where id = '${wid}'`) === "active", "challenge active");

// Alice trains → progress
await logWorkout(alice, "Challenge push");
await alice.goto(`${BASE}/wagers/challenges/${wid}`);
check(await alice.locator('section[aria-label="Progress"] >> text=1 workouts').count() === 1, "alice progress = 1 workout");

// Live chat
await bob.goto(`${BASE}/wagers/challenges/${wid}`);
await bob.waitForTimeout(1000);
await alice.fill('input[aria-label="Chat message"]', "you're going down");
await alice.click('button[aria-label="Send message"]');
await bob.waitForSelector("li:has-text(\"you're going down\")", { timeout: 10000 });
check(true, "chat arrives live");

// Gift with points
sql(`update profiles set points = 30 where handle = 'ca_${s}'`);
await alice.reload();
await alice.click("text=/Send Ben a gift/");
check(await alice.isDisabled('input[name="gift"] >> nth=2'), "unaffordable gifts disabled (Iron Trophy 50 > 30)");
await alice.click("dialog label:has-text('Gold Star')");
await alice.fill('input[aria-label="Gift message"]', "keep going");
await alice.click("text=Send gift");
await alice.waitForSelector("text=Gift sent.");
check(sql(`select points from profiles where handle = 'ca_${s}'`) === "20", "10 points deducted");
await bob.waitForSelector("text=/sent you a Gold Star/", { timeout: 10000 });
check(true, "bob gets gift toast");
await bob.goto(`${BASE}/profile`);
check(await bob.isVisible("li:has-text('Gold Star')"), "gift shows on bob's profile");

// Close: Alice wins 1–0
sql(`update wagers set starts_at = now() - interval '1 day', ends_at = now() - interval '1 second' where id = '${wid}'`);
sql(`select recompute_challenges()`);
await alice.goto(`${BASE}/wagers?tab=challenges`);
check(await alice.isVisible("text=WON"), "alice sees WON");
await bob.goto(`${BASE}/wagers?tab=challenges`);
check(await bob.isVisible("text=LOST"), "bob sees LOST");
check(sql(`select points from profiles where handle = 'ca_${s}'`) === "70", "winner +50 (30 set − 10 gift + 50 win)");

await alice.goto(`${BASE}/notifications`);
check(await alice.isVisible("text=/You won “Week warrior”/"), "win notification text");
await alice.click("text=Mark all read");
await alice.waitForSelector("text=Mark all read", { state: "detached" });
check(await alice.isVisible('a[aria-label="Notifications, 0 unread"]'), "badge cleared");
await alice.screenshot({ path: "e2e/out/notifications.png" });
await bob.goto(`${BASE}/wagers/challenges/${wid}`);
await bob.screenshot({ path: "e2e/out/challenge.png", fullPage: true });
await b.close();
