import { BASE, browser, check, onboard, signIn, seen } from "./lib.mjs";

const b = await browser();
const anon = await b.newPage();
await anon.goto(`${BASE}/home`);
check(anon.url().endsWith("/login"), "signed-out /home redirects to /login");

const stamp = Date.now().toString(36);
const page = await signIn(b, `smoke_${stamp}@test.dev`);
await onboard(page, { name: "Smoke", handle: `smoke_${stamp}` });
check(await seen(page, "text=This week"), "onboarding lands on Home");
check(await seen(page, 'nav[aria-label="Main"]'), "bottom nav renders");
await page.screenshot({ path: "e2e/out/home.png" });
await b.close();
