# Architecture

## Folder Structure (Next.js App Router)
```
/app
  manifest.ts
  /(auth)
    /login/page.tsx
    /onboarding/page.tsx
  /auth/callback/route.ts        # Supabase OAuth + magic-link code exchange
  /(app)
    layout.tsx                   # session guard + header + bottom nav
    /home/page.tsx               # pact weekly calendar(s) — the hero
    /pacts
      /new/page.tsx              # invite partner, set goal + stake
      /[id]/page.tsx             # pact detail: history weeks, ledger, settings
    /workouts
      /page.tsx                  # list
      /new/page.tsx              # logger
      /[id]/page.tsx             # detail
      /generate/page.tsx         # template browser
      /generate/bot/page.tsx     # OpenAI format/export bot
    /camera/page.tsx
    /nutrition
      /page.tsx                  # daily log + macro rings
      /foods/page.tsx            # food search + custom foods
    /wagers
      /page.tsx                  # tabs: Pacts ledger | Challenges
      /challenges/new/page.tsx
      /challenges/[id]/page.tsx  # progress + chat + gifts
    /notifications/page.tsx
    /profile/page.tsx
  /api
    /ai/route.ts                 # OpenAI (rate-limited)
    /health/route.ts             # cron keepalive (real DB query)
/components
  /ui /layout /pact /workout /camera /nutrition /wager /generator
/lib
  /supabase                      # browser + server clients (@supabase/ssr)
  /db                            # Dexie schema, offline queue, local media
  /camera                        # media helpers + compression
  /ai                            # OpenAI client, prompts, rate limiter
  /export                        # docx / exceljs builders
  /pacts                         # week math (timezone), calendar cell state
  /nutrition                     # Mifflin-St Jeor, macro helpers
/hooks
  useCamera.ts  useOfflineQueue.ts  useRealtime.ts  useLocalMedia.ts  usePactWeek.ts
/supabase
  /migrations                    # SQL from 04_DATA_MODEL.md
  seed.sql                       # exercises, foods, templates, gifts
middleware.ts                    # refresh Supabase session, guard /(app)
vercel.json                      # cron
```

## Data Flow
1. **Auth**: login → Supabase Auth (magic link / Google / GitHub) →
   `/auth/callback` exchanges code → cookie session → middleware guards `/(app)`
   → first login → `/onboarding`
2. **Workout log**: form → optimistic UI → Supabase insert. If offline: Dexie
   queue → flushed on `online` event and on app focus (`visibilitychange`).
   Background Sync API is not used (unsupported on iOS Safari).
3. **Pact calendar**: query workouts for both partners in the pact's current
   week (pact timezone) → compute cell state per day → realtime subscription on
   `workouts` inserts for the partner → cell updates live
4. **Weekly close**: `pg_cron` hourly → `close_weeks()` SQL function → results,
   ledger rows, streak, points, notifications
5. **Camera**: getUserMedia → photo/clip → compress → Supabase Storage → on quota
   error, Dexie blob with `storage_path = 'local:{key}'`
6. **Challenges**: create → invite → realtime notification → accept → daily
   `pg_cron` recompute of `current_value`
7. **AI bot**: prompt → `/api/ai` (Zod + caps) → OpenAI → streamed reply →
   export built client-side

## Offline Scope
- Queued offline: **workouts, workout_sets, nutrition_logs, media (local)**
- Online only: pacts, challenges, gifts, AI. These need server validation.
- Conflict rule: last-write-wins on `updated_at`

## Keepalive
`vercel.json` cron hits `/api/health` daily; the route runs a real query so
Supabase sees activity.
