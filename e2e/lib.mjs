// Shared E2E helpers. Run against `next start` + local Supabase.
// Browser: CHROME_PATH or the container default.
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function browser() {
  return chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
}

/** Signs a fresh page in as `email` via an admin-generated magic link (no mail server needed). */
export async function signIn(b, email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.goto(`${BASE}/auth/callback?token_hash=${data.properties.hashed_token}&type=email`);
  return page;
}

export async function onboard(page, { name, handle }) {
  await page.waitForURL("**/onboarding");
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="handle"]', handle);
  await page.click("text=Next");
  await page.click("text=Next");                 // goal (default)
  await page.fill('input[name="weight_kg"]', "80");
  await page.fill('input[name="height_cm"]', "180");
  await page.fill('input[name="birth_year"]', "1995");
  await page.selectOption('select[name="sex"]', "male");
  await page.selectOption('select[name="activity_level"]', "moderate");
  await page.click("text=Next (or skip)");
  await page.click("text=Next");                 // nutrition yes
  await page.click("text=Later");
  await page.waitForURL("**/home");
}

export function check(ok, msg) {
  if (!ok) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok -", msg);
}

import { execFileSync } from "node:child_process";
/** Run SQL as postgres against the local stack (test setup only). */
export function sql(q) {
  return execFileSync("psql", [process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", "-tAc", q]).toString().trim();
}

/** Add one exercise with a completed set and finish the workout. */
export async function logWorkout(page, name, beforeFinish) {
  await page.goto(`${BASE}/workouts/new`);
  await page.fill('input[aria-label="Workout name"]', name);
  await page.click("text=Add exercise");
  await page.fill('input[aria-label="Search exercises"]', "bench");
  await page.click("text=Barbell Bench Press");
  await page.fill('input[aria-label="Set 1 weight"]', "100");
  await page.fill('input[aria-label="Set 1 reps"]', "5");
  await page.click('button[aria-label="Complete set 1"]');
  if (beforeFinish) return beforeFinish().then(() => page.click("text=/Finish workout/"));
  await page.click("text=/Finish workout/");
  await page.waitForURL("**/workouts?saved=*");
}
