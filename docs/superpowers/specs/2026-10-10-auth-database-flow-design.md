# Auth, Database, and App-Flow Checkpoints

**Date:** 2026-10-10  
**Status:** Approved design; awaiting written-spec review

## Context

IRONHEART already has login controls for email magic links, Google, and GitHub,
and an auth callback that routes new users to onboarding. Local development is
currently blocked before that flow: `.env.local` is absent, the application
redirects to `/setup` when Supabase URL/key are missing, and the local Docker
Supabase engine is unavailable. The observed blocker is therefore local
database setup, not evidence of a defective migration.

The local Supabase configuration currently allows only two email sends per
hour. That upstream limit would reject requests before an application-level
limit of five per ten minutes could be useful.

## Goals

- Make the local Supabase database and auth setup usable for development.
- Enforce a rolling maximum of five magic-link send attempts per normalized
  email address in ten minutes, across clients and devices.
- Preserve the existing Google/GitHub OAuth callback and onboarding flow.
- Verify app navigation with the existing real-database Playwright suite and
  add useful visual checkpoints.
- Report blockers honestly if local database services or provider credentials
  cannot be made available in this environment.

## Design

### Database and local development

Use the existing Supabase migrations and seed workflow as the database source
of truth. Start the local Supabase stack, populate the ignored `.env.local`
with that stack's local URL and public/service keys, then run the migration,
database-test, typecheck, lint, and browser-test paths appropriate to the
changes. Do not substitute mock storage or bypass authentication to make
development appear functional.

If Docker remains unavailable, retain the `/setup` guard and report the exact
startup failure. Do not claim schema or authenticated-flow validation passed
without a running database.

### Magic-link rate limit

Route magic-link sends through a server endpoint. Normalize email by trimming
and lowercasing it, derive a keyed hash on the server, and call an atomic
Postgres function that serializes concurrent attempts for that key. The
function permits the first five attempts in a rolling ten-minute window,
rejects the sixth with the remaining retry time, and removes expired attempt
records. Only the server/service role may invoke it; no client may read or
write limiter records.

Once the database grants a send slot, the endpoint calls Supabase Auth's
existing OTP flow. The login form shows pending state, sends provider errors
to the user, and reports rate-limit retry timing instead of looking frozen.
The provider send cap must not be lower than the application cap: set the
local Supabase hourly email limit to at least 30 and document the equivalent
hosted Supabase and SMTP setup. The five-per-ten-minute cap applies per email,
not per IP.

### OAuth and callback

Keep Google and GitHub sign-in through Supabase OAuth and keep the existing
callback's code exchange and onboarding decision. Enable the providers in
local Supabase configuration using environment-supplied client credentials.
Document the provider redirect URI and hosted dashboard setup. The developer
will supply the Google/GitHub credentials; no credentials are committed or
invented. Until those values are supplied, verify redirect wiring rather than
claiming a real provider login passed.

### App-flow and visual verification

Use the existing E2E scripts as the primary flow checklist rather than
creating a parallel test framework. Validate the signed-out login route,
magic-link/callback-to-onboarding route, onboarding-to-Home route, and the
existing pact, workout, generator, camera/nutrition, challenge, security, and
PWA flows. Add screenshots at login, onboarding, Home, pact, workout,
nutrition, and profile checkpoints for mobile and desktop viewports where
those routes support them. Keep generated captures in the repository's
existing ignored `e2e/out/` directory.

Test SQL atomicity and the exact rate-limit boundary: attempts one through
five succeed, attempt six is rejected with retry timing, and an attempt after
the window expires succeeds. Real Google/GitHub provider authentication is
conditional on supplied credentials.

## Error handling

- Missing Supabase configuration continues to show the explicit setup page.
- Database/RPC errors fail visibly; they do not fall through to sending an
  unrestricted magic link.
- Auth provider failures appear in the login UI.
- A limit response is HTTP 429 and includes a retry duration for the UI.
- Browser test failures and screenshots are retained for diagnosis; tests do
  not report success when required services are unavailable.

## Out of scope

- Creating or obtaining external Google/GitHub OAuth credentials.
- Changing hosted Supabase settings directly.
- Changing AI request quotas, application features, or product flows unrelated
  to sign-in and the approved checkpoints.
- Replacing Supabase, adding demo-mode persistence, or bypassing RLS.

## Acceptance criteria

1. With local Supabase configured, the app reaches the login form rather than
   stopping at setup.
2. Magic-link requests are limited atomically to five per normalized email in
   each rolling ten-minute window, with a useful retry message.
3. Google and GitHub buttons initiate Supabase OAuth and callback handling
   preserves first-login onboarding and returning-user Home routing.
4. Database tests verify rate-limit boundaries and database schema/RLS checks
   relevant to the changes pass.
5. Playwright verifies the agreed flow checkpoints and produces screenshots;
   any blocked external provider test is clearly identified.
