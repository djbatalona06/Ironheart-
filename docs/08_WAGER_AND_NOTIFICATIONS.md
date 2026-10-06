# Pacts, Challenges, Gifts + Notifications

Two kinds of stakes, both non-monetary:
- **Pacts** (core): 1:1 weekly goal + stake, auto-closed every Monday
- **Challenges** (secondary): metric competitions over a custom date range

## Part 1: Weekly Partner Pacts

### Rules
- A pact is exactly 2 people. A user can be in several active pacts (partner,
  friend, buddy), but only one open pact per pair.
- Each person sets their own `goal_days` (1–7) and `stake` (free text, 60 chars).
- A **workout day** is any local date (pact timezone) with ≥1 logged workout.
  A photo check-in on that workout marks it **verified**. Optional, cosmetic + trust.
- Week = Monday 00:00 → Sunday 23:59:59 in the pact's timezone.
- At close: `days_done ≥ goal_days` → hit, else missed → owes their stake to
  the partner (one ledger row).
- Streak = consecutive weeks where both hit.

### Create / Accept
1. `/pacts/new` → pick @handle → my goal + stake → `partnerships` (pending) +
   my `weekly_goals` row for the current week → `pact_invite` notification
2. Partner accepts → sets their goal + stake → status active →
   `pact_accepted` to the inviter
3. **First week**: if accepted Mon–Wed, the current week counts; if Thu–Sun,
   the first counted week is next Monday (the current week shows as a "warm-up",
   no stakes)

### Live Updates
- Logging a workout → `partner_checkin` notification to each active partner
  (max 1 per partner per day)
- Calendar subscribes to realtime inserts on `workouts` for partner ids;
  falls back to 30s polling

### Close (`close_weeks()`, hourly `pg_cron`)
See `04_DATA_MODEL.md`. Writes results, ledger rows, streak, +20 points per
hit, carries goals forward, sends `week_result` to both. Idempotent.

### Settling
- Ledger shows unsettled rows grouped by stake: "You owe Alex 2 × Buy dinner"
- Only the **creditor** taps Settle (one row at a time, or "Settle all")
- `stake_settled` notification to the debtor

### Edge Cases
| Case | Behavior |
|---|---|
| Goal/stake edited mid-week | Applies from next Monday; current week unchanged |
| Both miss | Each owes their own stake to the other (2 rows) |
| Partner ends pact mid-week | Current week not scored; existing ledger stays visible read-only |
| Account deleted | Pacts end; partner notified; ledger rows deleted with the account |
| Workout logged offline | Counts by `started_at`, so late sync still counts if it lands before close. If it arrives after close, the closed week isn't re-scored (shown as a "late" dot) |
| Backdated workout | Allowed only within the current open week |
| Travel / timezone change | Pact timezone is fixed; editable in pact settings (applies next week) |

## Part 2: Challenges (metric wagers)

### Metrics
1. `workouts_count`: most workouts in the window
2. `total_volume`: most kg lifted (sets × reps × weight)
3. `streak`: longest consecutive-day streak
4. `macro_hit`: most days hitting the protein goal

### Flow
1. Wagers → Challenges → "+" → title, metric, target, dates, invite @handle
2. Invitee gets `wager_invite` → Accept/Decline
3. Active: progress bars, recomputed daily by `pg_cron` and on detail view
4. After `ends_at`: winner set (tie → `winner_id = null`) → `wager_result` to all
   → winner +50 points, confetti
5. Chat: text only (`wager_messages`), realtime per challenge

## Part 3: Points + Gifts
**Earn** (written only by server functions → `points_ledger`):
workout logged +5 (max 1/day), weekly goal hit +20, challenge win +50, protein
goal hit +3/day, 7-day logging streak +25

**Catalog** (seeded): Gold Star (10), Shaker Bottle (25), Iron Trophy (50),
Gold Dumbbell (100), Champion Belt (200), each with a Lucide icon

**Send**: from challenge detail or a partner's profile → choose gift →
optional message → RPC `send_gift()` (checks balance, deducts atomically)
→ `gift_received` notification + gold particle burst for the recipient

## Part 4: Notifications
- Table `notifications`, inserted only by server functions/triggers
- Realtime channel filtered by `user_id=eq.{id}` → toast + header bell badge
- `/notifications` page: list, deep links, mark all read
- Fallback: 30s polling if the realtime subscription errors

| Type | Payload | UI |
|---|---|---|
| `pact_invite` | `{ partnership_id, from }` | Toast + Accept/Decline sheet |
| `pact_accepted` | `{ partnership_id }` | Toast |
| `partner_checkin` | `{ partnership_id, workout_id, verified }` | Toast, calendar cell animates |
| `week_result` | `{ partnership_id, week_start, results }` | Banner on Home; confetti if both hit |
| `stake_settled` | `{ ledger_id }` | Toast |
| `wager_invite` | `{ wager_id, from }` | Toast + Accept/Decline |
| `wager_accepted` | `{ wager_id }` | Toast |
| `wager_result` | `{ wager_id, winner_id }` | Full-screen gold confetti for the winner |
| `partner_message` | `{ wager_id, text }` | Toast |
| `gift_received` | `{ gift_id, from }` | Gold particle burst + toast |
