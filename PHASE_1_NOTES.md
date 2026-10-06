# Phase 1: Foundation

## Built
- Next.js 16.3 (App Router, Turbopack, React 19.2), TypeScript strict, Tailwind v4 tokens from `docs/03`
- Supabase Auth: magic link + Google + GitHub (`app/(auth)/login`), `/auth/callback` (PKCE `code` and `token_hash`)
- `proxy.ts` (Next 16 renamed `middleware` → `proxy`): refreshes the session, redirects signed-out users, sends everything to `/setup` when env vars are missing
- Onboarding (5 steps, one form, server action + Zod) with Mifflin-St Jeor macro goals (`lib/nutrition/goals.ts`)
- App shell: header (notifications badge, avatar) + 5-tab bottom nav, safe-area aware
- Full schema + RLS for every table (`supabase/migrations/…_schema.sql`), seed (exercises, gifts), storage buckets
- `/api/health` keepalive (real query, `CRON_SECRET`), `vercel.json` daily cron

## Tests
- `npm test`: Vitest (macro math)
- `npm run test:db`: SQL tests run as real `authenticated` users through RLS (11 checks: isolation, partner visibility, column grants, server-owned timestamps)
- `npm run e2e`: Playwright smoke (signed-out redirect → sign in → onboarding → Home)

## Deviations from the docs (ponytail)
- **No shadcn/ui yet.** Buttons and fields are 4 Tailwind utilities in `globals.css` (`btn-gold`, `btn-ghost`, `field`, `card`). Add shadcn when a complex primitive (combobox, sheet with focus trap) is needed.
- **No Zustand / React Hook Form.** Server Components + server actions + native forms cover it so far.
- `done_at` replaces `created_at` in the late-sync rule. It's set by a trigger when a workout becomes `done`, so a *planned* workout completed offline is credited correctly. (Docs to update in Phase 2.)

## Free-tier notes
- Nothing new; the keepalive cron is in place.

## Read this to learn
1. `supabase/migrations/…_schema.sql`, the **RLS + grants** section. See how "who can read/write what" lives in the database, not the app. Then open `supabase/tests/01_rls.sql` and see how each rule is proven.
2. `proxy.ts`: the whole auth gate is about 30 lines.
