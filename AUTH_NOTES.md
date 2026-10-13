# Auth upgrade notes

## Built
- **Email code sign-in**: the email now carries a 6-digit code plus a link. Typing the code works inside the installed iPhone app.
- **Two-step verification (TOTP)**: Profile → Security → set up with any authenticator app; backup authenticator supported. Sign-in stops at `/login/mfa` until the code is entered.
- **Enforced in the database**, not just the UI: `public.enforce_mfa()` runs before every REST/RPC call; restrictive `mfa_gate` policies cover Realtime and Storage. `/api/ai` (service role) checks it in code.
- **Return to the page you wanted** after sign-in (`ih_next` cookie + `safeNext()`), without an open redirect.
- **Sign out of all devices**; normal sign-out is now this device only.
- **Connect / disconnect Google and GitHub** on an existing account.
- **Headers**: HSTS + a non-breaking CSP (`frame-ancestors`, `base-uri`, `object-src`, `form-action`). Sign-in pages are never cached by the service worker.

## Fixed along the way
- Fresh databases failed to migrate: two rate-limit migrations both created the same table. The later copy is now idempotent.
- `npm run test:db` couldn't run any test (JS `replace()` turned `$$` into `$`, and the Supabase CLI can't run psql scripts). It now uses `psql`, or the one in the Docker DB container.
- Test 05 checked a row count in the same statement as the function call, so Postgres counted first. Split into two checks.
- Local email sending pointed at the old mail-catcher port (2500 → 1025).
- The E2E onboarding helper missed the "Quick start" survey step, so every browser suite failed at sign-up.

## Follow-up fixes (mock login test)
- Supabase advisor "Security Definer View" on `public_profiles`: now `security_invoker`, backed by `private.profile_cards()`.
- Signing out from Profile and back in returned you to Profile: a background refresh after sign-out was saved as the "return to" page. Only real page loads are remembered now.
- `currentUser()` is memoized per render (`cache()`): 2 auth-server calls per page load instead of 3+.

## Account audit (2026-10-12)
- **Delete account failed for anyone who had uploaded a photo or clip.** Supabase refuses to delete a user who still owns Storage objects. The old order also ended their pacts and signed them out *before* the delete, so it failed with the account intact. Now: end pacts → remove the user's files (`media`, `avatars`) → delete the user → sign out. Covered by `e2e/camera-nutrition.mjs` (there was no test before).
- Delete account now also clears what only the device held (offline queue, local photos, pending share), so the next person on that device doesn't see it.
- **Return-to-page never worked once the service worker was active** (see `PHASE_7_NOTES.md`): fixed in `proxy.ts`.
- There is no "deactivate" (pause) state: an account is active from first sign-in (profile row via `handle_new_user`, then onboarding sets `onboarded`) until it is deleted. Sign-out is per device or everywhere.
- Sign-out keeps the device's offline queue and local photos (so unsynced logs survive signing back in). On a shared device the next account can see the local photo count and export them. Not changed here: it needs a product decision.

## Not built (and when to add)
- **CAPTCHA** (Turnstile/hCaptcha) on email sends: add when bot sign-ups appear; Supabase supports `captchaToken`.
- **Passkeys**: add when Supabase WebAuthn factors are GA.
- **Change email**: `updateUser({ email })` with double confirm; add when users ask.
- **Recovery codes**: Supabase has none; a backup authenticator is the recovery path.
- **Fewer auth calls on link prefetch**: each background prefetch still runs one auth check in `proxy.ts`. Skipping it risks a stale "signed out" prefetch after an idle hour; revisit with `getClaims()` (local JWT check) once the hosted project uses asymmetric signing keys.

## Hosted setup needed
See SETUP.md steps 9–11 (email template, TOTP on, manual linking on), then `supabase db push`.

## Free-tier risks
None new: one indexed lookup per API call for aal1 sessions only (`auth.mfa_factors.user_id`).
