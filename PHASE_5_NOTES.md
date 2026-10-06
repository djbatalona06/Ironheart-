# Phase 5: Challenges, gifts, notifications

## Built
- **SQL** (`…_challenges.sql`): `create_challenge` / `respond_challenge` / `refresh_challenge` RPCs, `challenge_value()` for all 4 metrics (count, volume of completed sets, longest daily streak via gaps-and-islands, protein-goal days), hourly `recompute_challenges()` (refresh, close with winner/tie, +50 points, notify, expire stale invites), `send_gift()` (partners or opponents only, atomic balance check + deduct), chat → one unread notification per challenge, `mark_all_read()`
- **Wagers tab**: Pacts (every pact's ledger with Settle) | Challenges (Active / Invites / Finished with WON/LOST/TIE)
- **Challenge page**: progress bars (gold = you, blue = opponent), accept/decline, live chat, gift sheet (unaffordable gifts disabled, shows your points), confetti once on a win
- **Notifications**: global realtime `Toaster` (toast + header badge refresh + confetti for wins/gifts/both-hit weeks, 30s polling fallback), `/notifications` with deep links and mark-all-read; `lib/notifications/format.ts` writes every notification's text once
- **Realtime fix** (`subscribeAuthed` in `lib/supabase/client.ts`): channels wait for the cookie session before joining. Otherwise they join as `anon` and RLS drops every event silently. This also fixes the pact calendar's live updates from Phase 2.

## Tests
- SQL `04_challenges.sql`: visibility, accept flow, all 4 metrics, close/winner/+50/notify, tie, gift cost/permissions, chat dedupe, mark all read
- E2E `e2e/challenges.mjs` (two live browsers): invite toast in real time, badge, accept, progress, live chat, gift with points + toast + profile, win/loss, notifications cleared
- Full suite run: 14 unit · 70 SQL checks · 63 E2E checks, all green

## Bugs found by tests (and fixed)
- Optional challenge target made the RPC call fail; the parameter now defaults to null
- SQL tests used global counts; now scoped to their own rows so they pass on a used database

## Free-tier notes
- 3 realtime channels per open session max (notifications, pact calendar, open chat), well under 200 concurrent connections for an MVP.

## Read this to learn
1. `challenge_value()` → the `streak` branch: the classic "gaps and islands" SQL trick.
2. `subscribeAuthed()`: a bug that never throws an error (RLS just returns nothing). Debugging it took watching the WebSocket frames.
