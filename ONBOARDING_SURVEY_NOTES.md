# Onboarding quick-start survey

**Built:** new optional "Quick start" step (step 3 of 6) in `app/(auth)/onboarding`: days per week, experience, main obstacle. Answers save to `profiles.survey` (jsonb) via migration `20261006000001_survey.sql`.

**Decisions:** one jsonb column (add a question without a migration); shared option list in `survey.ts` so form and zod can't drift; every answer optional, bad values dropped, empty survey stored as null; step logic uses `STEPS.length` instead of hard-coded 4.

**Stubbed / next:** nothing reads `survey` yet (e.g. suggest a template from `days_per_week`). No visual mockups existed in `/docs`; the layout reuses the existing radio cards.

**Free-tier risk:** none (a few bytes per profile).

## Fix: onboarding failed for every user
- **Cause:** the survey column was added without the matching column-level `UPDATE` grant (`profiles` grants are per column). Every onboarding submit was rejected by Postgres.
- **Fix:** migration `20261011000001_survey_grant.sql`; SQL regression check added to `supabase/tests/01_rls.sql`.
- **Also:** the profile update now uses `.select("id")`, so a missing profile row shows an error instead of silently redirecting to `/home` and bouncing back to `/onboarding`.
- **Verified:** all migrations applied on a local Postgres 16 with Supabase shims (auth, storage, pg_cron, realtime). SQL suites 01–04 pass; with the grant revoked, the new check fails. `typecheck`, `lint`, and `npm test` pass.
- **Not verified:** the full browser flow (magic link / Google / GitHub) needs a real Supabase project and was not run here.
