// Sign-in features: email code, return-to-page, two-step verification, sign out everywhere.
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { BASE, browser, check, seen, signIn, sql } from "./lib.mjs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAIL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const s = Date.now().toString(36);

/** RFC 6238 code for a base32 secret (what an authenticator app shows). */
function totp(secret, at = Date.now()) {
  let bits = "";
  for (const c of secret.replace(/=+$/, "")) bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac("sha1", key).update(msg).digest();
  return String((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1e6).padStart(6, "0");
}

/** Newest 6-digit code mailed to `email` (local Mailpit). */
async function mailedCode(email) {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAIL}/api/v1/message/${list.messages[0].ID}`)).json();
      return msg.HTML.match(/>\s*(\d{6})\s*</)?.[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function codeSignIn(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.click("text=Email me a sign-in code");
  await page.waitForSelector('input[name="code"]');
  const code = await mailedCode(email);
  check(/^\d{6}$/.test(code ?? ""), "sign-in email contains a 6-digit code");
  await page.fill('input[name="code"]', code);
  await page.click('button:has-text("Sign in")');
}

const b = await browser();

// ---- email code + return to the page you were headed to ----
const email = `code_${s}@test.dev`;
const { data: u } = await admin.auth.admin.createUser({ email, email_confirm: true });
sql(`update profiles set onboarded = true, handle = 'code_${s}', name = 'Cody' where id = '${u.user.id}'`);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/nutrition?from=test`);
check(page.url().endsWith("/login"), "signed-out deep link → /login");
await codeSignIn(page, email);
await page.waitForURL("**/nutrition?from=test");
check(true, "email code signs in and returns to the deep link");
await page.screenshot({ path: new URL("./out/auth-code-landed.png", import.meta.url).pathname });

// ---- turn on two-step verification from Profile ----
await page.goto(`${BASE}/profile`);
await page.click("text=Set up");
const secret = (await page.textContent("text=/Enter this key:/")).split("Enter this key:")[1].trim();
await page.screenshot({ path: new URL("./out/auth-mfa-enroll.png", import.meta.url).pathname });
await page.fill('input[autocomplete="one-time-code"]', totp(secret));
await page.click("text=Turn on");
check(await seen(page, "text=Signing in also needs a code"), "2FA turns on with a valid authenticator code");

// ---- next sign-in stops at the 2FA prompt ----
const page2 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await codeSignIn(page2, email);
await page2.waitForURL("**/login/mfa");
check(true, "2FA user is sent to /login/mfa after the email code");
await page2.screenshot({ path: new URL("./out/auth-mfa-prompt.png", import.meta.url).pathname });
await page2.goto(`${BASE}/home`);
check(page2.url().endsWith("/login/mfa"), "app pages stay locked until the second factor");
const ai = await page2.request.post(`${BASE}/api/ai`, { data: { mode: "chat", message: "hi" } });
check(ai.status() === 401, `AI route refuses aal1 session (${ai.status()})`);

// The database refuses an aal1 token directly too (no UI to bypass).
const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
const raw = createClient(URL_, ANON, { auth: { persistSession: false } });
await raw.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
const direct = await raw.from("profiles").select("id");
check(Boolean(direct.error), `REST API rejects aal1 token for a 2FA user (${direct.error?.code})`);
const rpc = await raw.rpc("mfa_satisfied");
check(Boolean(rpc.error), "RPCs are gated too");

await page2.fill('input[autocomplete="one-time-code"]', "000000");
await page2.click("text=Verify");
check(await seen(page2, "text=That code didn't work"), "wrong authenticator code is rejected");
await page2.fill('input[autocomplete="one-time-code"]', totp(secret));
await page2.click("text=Verify");
await page2.waitForURL("**/home");
check(true, "correct authenticator code finishes sign-in");

// A failed Google/GitHub connect lands back on Profile with a message.
await page2.goto(`${BASE}/auth/callback?error=server_error&error_description=Identity+is+already+linked`);
check(await seen(page2, "text=Couldn't connect that account"), "failed account connect shows on Profile");
await page2.screenshot({ path: new URL("./out/auth-security-panel.png", import.meta.url).pathname, fullPage: true });

// ---- sign out of all devices ----
await page2.goto(`${BASE}/profile`);
await page2.click("text=Sign out of all devices");
await page2.waitForURL("**/login");
await page.goto(`${BASE}/home`);
check(page.url().endsWith("/login"), "other device is signed out too");

// ---- headers ----
const res = await (await b.newContext()).request.get(`${BASE}/login`);
const csp = res.headers()["content-security-policy"] ?? "";
check(csp.includes("frame-ancestors 'none'") && Boolean(res.headers()["strict-transport-security"]), "security headers set");

// Users without 2FA are unaffected.
const plain = await signIn(b, `plain_${s}@test.dev`);
await plain.waitForURL("**/onboarding");
check(true, "new user without 2FA goes straight to onboarding");
await b.close();
