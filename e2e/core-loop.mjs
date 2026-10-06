import { BASE, browser, check, logWorkout, onboard, signIn, sql } from "./lib.mjs";

const b = await browser();
const s = Date.now().toString(36);
const alice = await signIn(b, `alice_${s}@test.dev`);
await onboard(alice, { name: "Alice", handle: `alice_${s}` });
const bobCtx = await b.newContext({ viewport: { width: 390, height: 844 } });
const bob = await signIn(bobCtx, `bob_${s}@test.dev`);
await onboard(bob, { name: "Bob", handle: `bob_${s}` });

// Alice invites Bob
await alice.goto(`${BASE}/pacts/new`);
await alice.fill('input[name="handle"]', `bob_${s}`);
await alice.fill('input[name="goal"]', "3");
await alice.click("text=Send invite");
await alice.waitForURL("**/home?invited=1");
check(await alice.isVisible("text=/Waiting for .* to accept/"), "alice sees pending invite");

// Bob accepts from Home
await bob.goto(`${BASE}/home`);
check(await bob.isVisible("text=/challenged you/"), "bob sees invite card");
await bob.fill('form input[name="stake"]', "Do the dishes");
await bob.click("button:has-text('Accept')");
await bob.waitForSelector('section[aria-label="Pact with Alice"]');
check(await bob.isVisible("text=/This week counts|Warm-up week/"), "rules banner after accept");
await bob.click("text=Got it");
await bob.reload();
check(!(await bob.isVisible("text=/This week counts|Warm-up week/")), "banner stays dismissed");
check(await bob.isVisible('section[aria-label="Pact with Alice"]'), "bob's calendar renders");

// Alice logs a workout → Bob's calendar shows a partner cell (blue) today
await logWorkout(alice, "Push day");
await alice.goto(`${BASE}/workouts`);
await alice.waitForSelector("text=Push day");
check(true, "alice workout synced to list");
await bob.goto(`${BASE}/home`);
const todayBtn = bob.locator('section[aria-label="Pact with Alice"] li button.ring-2');
check(/Alice trained/.test(await todayBtn.getAttribute("aria-label")), "bob sees alice's day (partner cell)");
check((await todayBtn.getAttribute("class")).includes("bg-partner"), "partner cell is blue");

// Bob logs offline → queued → back online → synced, cell turns gold (both)
await logWorkout(bob, "Offline legs", async () => bobCtx.setOffline(true));
await bob.waitForSelector("text=Saved on this device");
check(true, "offline finish saves locally");
await bobCtx.setOffline(false);
await bob.goto(`${BASE}/workouts`);
await bob.waitForSelector("a:has-text('Offline legs')", { timeout: 15000 });
check(true, "queued workout synced after reconnect");
await bob.goto(`${BASE}/home`);
check((await bob.locator('li button.ring-2').getAttribute("class")).includes("bg-gold"), "both trained → gold cell");
check(await bob.isVisible("text=/You 1\\//"), "bob's pill counts the synced day");

// Notifications: alice got pact_accepted + partner_checkin
const n = sql(`select string_agg(type, ',' order by type) from notifications n join profiles p on p.id = n.user_id where p.handle = 'alice_${s}'`);
check(n.includes("pact_accepted") && n.includes("partner_checkin"), `alice notifications: ${n}`);

// Ledger: plant a missed week for Bob → Alice settles from the pact page
const pid = sql(`select p.id from partnerships p join profiles a on a.id = p.user_a where a.handle = 'alice_${s}'`);
sql(`insert into stake_ledger (partnership_id, debtor_id, creditor_id, stake, week_start)
     select id, user_b, user_a, 'Do the dishes', '2026-09-28' from partnerships where id = '${pid}'`);
await bob.goto(`${BASE}/pacts/${pid}`);
check(await bob.isVisible("text=/You owe/") && !(await bob.isVisible("text=Settle 1")), "debtor sees debt, no settle button");
await alice.goto(`${BASE}/pacts/${pid}`);
await alice.click("text=Settle 1");
await alice.waitForSelector("text=All square");
check(true, "creditor settles → all square");
await bob.screenshot({ path: "e2e/out/pact.png", fullPage: true });
await alice.goto(`${BASE}/home`);
await alice.screenshot({ path: "e2e/out/home-pact.png" });
await b.close();
