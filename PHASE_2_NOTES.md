# Phase 2: Core loop

## Built
- **SQL** (`supabase/migrations/…_pacts.sql`): week math, `credit_date()` (late-sync rule), `pact_week_days()` calendar RPC, `create_pact` / `respond_pact` / `set_goal` / `end_pact` / `settle_stake` RPCs, `close_weeks()` + hourly `pg_cron`, workout-done trigger (partner check-in notification, +5 points/day)
- **Home**: one `WeekCalendar` per pact (gold/white/blue/gray cells, initials, verified + late markers, today ring), swipe or arrows for past weeks, day sheet listing both partners' workouts, last-week result banner, `PactRulesBanner`, incoming invite cards, live refresh over Supabase Realtime (30s polling fallback)
- **Pacts**: `/pacts/new` (handle autocomplete, goal, stake chips, browser timezone), `/pacts/[id]` (calendar, ledger with creditor-only Settle, history, next-week goal edit, end pact)
- **Workouts**: logger (exercise picker cached in IndexedDB, sets/reps/kg/RPE, 90s rest timer, draft survives reloads), list with "Syncing / Offline" rows, detail with grouped sets + delete
- **Offline queue** (`lib/db/queue.ts`): Dexie-backed, client UUIDs + `ON CONFLICT DO NOTHING` so replays are safe; flushes on load, `online`, and app focus
- Generated DB types (`npm run gen:types`), so every query is type-checked

## Tests
- SQL: 29 pact checks, including late sync 1 second and several days after close, same-day dedupe, both-miss ledger, idempotent close, creditor-only settle, outsider can't read the calendar
- Vitest: week math (DST, year boundary), calendar cell states
- E2E `npm run e2e`: two browsers pair → rules banner → partner cell turns blue → offline workout queued → reconnect syncs → cell turns gold → ledger settle

## Deviations
- **TanStack Query removed.** Server Components fetch on navigation; realtime calls `router.refresh()`. Simpler, one less cache to reason about. Add it back if a screen needs client-side caching.
- **Photo check-in moved to the workout detail page** (needs the workout to exist first). Docs updated.
- Points for workouts use a rolling 20h window instead of a calendar day (timezone-agnostic).

## Free-tier notes
- One realtime channel per open Home page (partners' workouts + my notifications).
- `close_weeks()` is a single hourly query loop, so cost is negligible.

## Read this to learn
1. `credit_date()` and `close_weeks()` in `…_pacts.sql`, then `supabase/tests/02_pacts.sql`. Predict each `check` before reading it.
2. `lib/db/queue.ts`: why client-generated UUIDs make offline retries safe (idempotency).
