# Onboarding quick-start survey

**Built:** new optional "Quick start" step (step 3 of 6) in `app/(auth)/onboarding`: days per week, experience, main obstacle. Answers save to `profiles.survey` (jsonb) via migration `20261006000001_survey.sql`.

**Decisions:** one jsonb column (add a question without a migration); shared option list in `survey.ts` so form and zod can't drift; every answer optional, bad values dropped, empty survey stored as null; step logic uses `STEPS.length` instead of hard-coded 4.

**Stubbed / next:** nothing reads `survey` yet (e.g. suggest a template from `days_per_week`). No visual mockups existed in `/docs`; the layout reuses the existing radio cards.

**Free-tier risk:** none (a few bytes per profile).
