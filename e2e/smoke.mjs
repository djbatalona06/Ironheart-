import { BASE, browser, check, onboard, signIn, seen } from "./lib.mjs";

const b = await browser();
const anon = await b.newPage();
await anon.goto(`${BASE}/home`);
check(anon.url().endsWith("/login"), "signed-out /home redirects to /login");
await anon.screenshot({ path: "e2e/out/login-mobile.png", fullPage: true });
await anon.setViewportSize({ width: 1440, height: 900 });
await anon.screenshot({ path: "e2e/out/login-desktop.png", fullPage: true });
await anon.setViewportSize({ width: 390, height: 844 });
await anon.close();

const stamp = Date.now().toString(36);
const page = await signIn(b, `smoke_${stamp}@test.dev`);
await page.screenshot({ path: "e2e/out/onboarding-mobile.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });
await page.screenshot({ path: "e2e/out/onboarding-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await onboard(page, { name: "Smoke", handle: `smoke_${stamp}` });
check(await seen(page, "text=This week"), "onboarding lands on Home");
check(await seen(page, 'nav[aria-label="Main"]'), "bottom nav renders");
await page.screenshot({ path: "e2e/out/home.png" });
await page.setViewportSize({ width: 1440, height: 900 });
await page.screenshot({ path: "e2e/out/home-desktop.png", fullPage: true });
await b.close();
