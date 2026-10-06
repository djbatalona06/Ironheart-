// Auth + authorization regression checks (the trust boundary). See SECURITY.md.
import { createClient } from "@supabase/supabase-js";
import { BASE, browser, check, onboard, seen, signIn, sql } from "./lib.mjs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const b = await browser();
const anon = await b.newContext();
const raw = (path) => anon.request.get(`${BASE}${path}`, { maxRedirects: 0 });
const loc = (r) => r.headers()["location"] ?? "";
const setsSession = (r) => r.headersArray().some((h) => h.name === "set-cookie" && /sb-.*-auth-token=base64/.test(h.value));

// ---- /auth/callback rejects bad input and never redirects off-site ----
for (const q of ["?token_hash=forged&type=email", "?token_hash=&type=email", "", "?code=not-a-real-code"]) {
  const r = await raw(`/auth/callback${q}`);
  check(r.status() === 307 && loc(r).endsWith("/login?error=1") && !setsSession(r), `callback rejects "${q || "(no params)"}"`);
}
const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: `sec_${Date.now().toString(36)}@test.dev` });
const ok = await raw(`/auth/callback?token_hash=${link.properties.hashed_token}&type=email&next=https://evil.example/steal`);
check(ok.status() === 307 && new URL(loc(ok)).host === new URL(BASE).host && setsSession(ok), "valid link signs in and ignores ?next= (no open redirect)");
const reuse = await raw(`/auth/callback?token_hash=${link.properties.hashed_token}&type=email`);
check(loc(reuse).endsWith("/login?error=1"), "magic link is single-use");

// ---- signed-out access (fresh context: the valid-link check above stored a session) ----
const out = await b.newContext();
for (const p of ["/home", "/workouts", "/workouts/new", "/workouts/generate", "/nutrition", "/camera", "/wagers", "/notifications", "/profile", "/pacts/new"]) {
  const r = await out.request.get(`${BASE}${p}`, { maxRedirects: 0 });
  check(r.status() === 307 && loc(r).endsWith("/login"), `signed-out ${p} → /login`);
}
const ai = await out.request.post(`${BASE}/api/ai`, { data: { mode: "chat", message: "hi" }, maxRedirects: 0 });
check([307, 401].includes(ai.status()), `signed-out /api/ai refused (${ai.status()})`);
check((await out.request.get(`${BASE}/api/health`)).status() === 401, "/api/health needs CRON_SECRET");

// ---- signed-in user can't reach other users' data or privileged functions ----
const s = Date.now().toString(36);
const page = await signIn(b, `eve_${s}@test.dev`);
await onboard(page, { name: "Eve", handle: `eve_${s}` });
const { data: v } = await admin.auth.admin.createUser({ email: `victim_${s}@test.dev`, email_confirm: true });
const victim = v.user.id;
sql(`update profiles set weight_kg = 80 where id = '${victim}'`);
const wid = sql(`insert into workouts (user_id, name) values ('${victim}', 'Private session') returning id`).split("\n")[0];
await page.goto(`${BASE}/workouts/${wid}`);
check(await seen(page, "text=404"), "another user's workout URL → 404");

const { data: otp } = await admin.auth.admin.generateLink({ type: "magiclink", email: `eve_${s}@test.dev` });
const eve = createClient(URL_, ANON, { auth: { persistSession: false } });
await eve.auth.verifyOtp({ token_hash: otp.properties.hashed_token, type: "email" });
const me = (await eve.auth.getUser()).data.user.id;
const denied = (r) => Boolean(r.error) || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;
check(denied(await eve.rpc("ai_take", { uid: me, food: false })), "client can't call ai_take (service-only)");
check(denied(await eve.rpc("close_weeks")), "client can't trigger close_weeks");
check(denied(await eve.from("profiles").update({ points: 99999 }).eq("id", me)), "client can't set own points");
check(denied(await eve.from("notifications").insert({ user_id: victim, type: "gift_received" })), "client can't forge notifications");
check(denied(await eve.from("stake_ledger").insert({ partnership_id: me, debtor_id: victim, creditor_id: me, stake: "x", week_start: "2026-10-05" })), "client can't write ledger rows");
const peek = await eve.from("workouts").select("id").eq("user_id", victim);
check(!peek.error && peek.data.length === 0, "RLS hides non-partner workouts");
const prof = await eve.from("profiles").select("weight_kg").eq("id", victim);
check(!prof.error && prof.data.length === 0, "RLS hides other users' body stats");
await b.close();
