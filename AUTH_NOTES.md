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

## Not built (and when to add)
- **CAPTCHA** (Turnstile/hCaptcha) on email sends: add when bot sign-ups appear; Supabase supports `captchaToken`.
- **Passkeys**: add when Supabase WebAuthn factors are GA.
- **Change email**: `updateUser({ email })` with double confirm; add when users ask.
- **Recovery codes**: Supabase has none; a backup authenticator is the recovery path.

## Hosted setup needed
See SETUP.md steps 9–11 (email template, TOTP on, manual linking on), then `supabase db push`.

## Free-tier risks
None new: one indexed lookup per API call for aal1 sessions only (`auth.mfa_factors.user_id`).
