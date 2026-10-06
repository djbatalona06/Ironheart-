# Data Model (Supabase / Postgres)

All tables: RLS enabled. `uuid` defaults `gen_random_uuid()`, timestamps default `now()`.
Enums are `text` + `check` constraints (easier to migrate on free tier).

## Identity

### profiles (1:1 with `auth.users`, created by trigger on signup)
```sql
id uuid pk references auth.users(id) on delete cascade
handle text unique            -- @handle, lowercase, 3–20 chars
name text
avatar_url text
goal text check (goal in ('muscle','fat_loss','strength','endurance'))
weight_kg numeric, height_cm numeric, birth_year int
sex text check (sex in ('male','female'))
activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active'))
kcal_goal int, protein_g_goal int, carbs_g_goal int, fat_g_goal int
nutrition_enabled bool default true
points int default 0 check (points >= 0)
onboarded bool default false
created_at timestamptz, updated_at timestamptz
```

## Training

### exercises
```sql
id uuid pk, name text, muscle_group text, equipment text,
is_custom bool default false, created_by uuid null references profiles(id)
```

### workouts
```sql
id uuid pk
user_id uuid references profiles(id) on delete cascade
name text
started_at timestamptz, ended_at timestamptz
notes text
generated_from text            -- 'manual' | 'template:<slug>' | 'bot'
created_at timestamptz, updated_at timestamptz
```

### workout_sets
```sql
id uuid pk
workout_id uuid references workouts(id) on delete cascade
exercise_id uuid references exercises(id)
set_index int, reps int, weight_kg numeric, rpe numeric, completed bool
created_at timestamptz, updated_at timestamptz
```

### workout_templates (seeded, read-only)
```sql
id uuid pk
slug text unique               -- 'ppl-6', 'linear-5x5', ...
name text, days_per_week int, description text, source_note text
days jsonb                     -- [{ name, exercises: [{ name, sets, reps, pct_1rm? }] }]
```

### media
```sql
id uuid pk
user_id uuid references profiles(id) on delete cascade
workout_id uuid null references workouts(id) on delete set null
type text check (type in ('photo','video'))
storage_path text              -- bucket path, or 'local:{dexie_key}'
duration_seconds int null
caption text null              -- manual
is_checkin bool default false  -- marks a workout day as "verified" on the pact calendar
created_at timestamptz
```

## Partner Pacts (core loop)

### partnerships
```sql
id uuid pk
user_a uuid references profiles(id)   -- inviter
user_b uuid references profiles(id)   -- invitee
status text check (status in ('pending','active','declined','ended')) default 'pending'
timezone text not null                -- IANA, from inviter; defines week boundaries
streak int default 0                  -- consecutive weeks both hit
started_week date null                -- Monday of first active week
created_at timestamptz, ended_at timestamptz null
check (user_a <> user_b)
```
```sql
-- one open pact per pair (partial unique index, not a table constraint)
create unique index one_open_pact_per_pair on partnerships
  (least(user_a, user_b), greatest(user_a, user_b))
  where status in ('pending', 'active');
```

### weekly_goals
```sql
partnership_id uuid references partnerships(id) on delete cascade
user_id uuid references profiles(id)
week_start date                        -- Monday, in partnership timezone
goal_days int check (goal_days between 1 and 7)
stake text check (length(stake) between 1 and 60)
days_done int null                     -- filled at close
result text check (result in ('pending','hit','missed')) default 'pending'
primary key (partnership_id, user_id, week_start)
```
- Next week's row is copied from the current one at close. Edits made
  mid-week write to next week's row only.

### stake_ledger
```sql
id uuid pk
partnership_id uuid references partnerships(id) on delete cascade
debtor_id uuid references profiles(id)
creditor_id uuid references profiles(id)
stake text
week_start date
settled bool default false, settled_at timestamptz null
created_at timestamptz
```
- Balance UI: unsettled rows grouped by `(debtor_id, stake)`, e.g. "You owe Alex 2 × Buy dinner"
- Both missed → each owes the other their own stake (two rows)

### Calendar computation (no table)
A day counts for a user when they have ≥1 workout whose `started_at`, converted
to the partnership timezone, falls on that date. A day is verified when that
workout has a `media` row with `is_checkin = true`. SQL view:
`pact_week_days(partnership_id, week_start)` → `(day date, user_id, trained bool, verified bool)`.

### close_weeks() — `pg_cron` hourly, `security definer`
For each active partnership where now() in its timezone ≥ next Monday 00:00 and the
previous week is still `pending`:
1. Count distinct trained days per user → `days_done`, `result`
2. Each `missed` user → `stake_ledger` row (debtor = them, creditor = partner)
3. Both hit → `streak + 1`, else `streak = 0`
4. Each `hit` user → +20 points (`points_ledger`)
5. Insert next week's `weekly_goals` rows (carry forward)
6. `week_result` notification to both
Idempotent: skips weeks already closed.

## Challenges + Gifts

### wagers (shown in UI as "Challenges")
```sql
id uuid pk, creator_id uuid references profiles(id)
title text, description text
metric text check (metric in ('workouts_count','total_volume','streak','macro_hit'))
target numeric, starts_at timestamptz, ends_at timestamptz
status text check (status in ('pending','active','completed','declined')) default 'pending'
winner_id uuid null, created_at timestamptz
```

### wager_participants
```sql
wager_id uuid references wagers(id) on delete cascade
user_id uuid references profiles(id)
accepted bool default false, current_value numeric default 0
primary key (wager_id, user_id)
```

### wager_messages
```sql
id uuid pk, wager_id uuid references wagers(id) on delete cascade,
user_id uuid references profiles(id), text text, created_at timestamptz
```

### gifts (seeded)
```sql
id uuid pk, name text, icon text, cost int
```

### user_gifts
```sql
id uuid pk, from_user_id uuid, to_user_id uuid, gift_id uuid references gifts(id),
wager_id uuid null, message text null, created_at timestamptz
```
Insert only through RPC `send_gift(to_user, gift_id, wager_id, message)`:
checks the sender's points ≥ cost, deducts atomically, writes `points_ledger`,
inserts the notification. No direct insert policy.

### points_ledger
```sql
id uuid pk, user_id uuid references profiles(id),
delta int, reason text   -- 'workout' | 'goal_hit' | 'challenge_win' | 'macro_hit' | 'streak_7' | 'gift_sent'
ref_id uuid null, created_at timestamptz
```
`profiles.points` is updated only by `security definer` functions/triggers.

## Nutrition

### foods
```sql
id uuid pk, name text, serving_size text,
calories numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
created_by uuid null references profiles(id)   -- null = seed
```

### nutrition_logs
```sql
id uuid pk, user_id uuid references profiles(id) on delete cascade,
food_id uuid null references foods(id), food_name text,
calories numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
serving_size text,
meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
logged_at timestamptz, created_at timestamptz, updated_at timestamptz
```

## System

### notifications
```sql
id uuid pk, user_id uuid references profiles(id) on delete cascade,
type text check (type in (
  'pact_invite','pact_accepted','partner_checkin','week_result','stake_settled',
  'wager_invite','wager_accepted','wager_result','partner_message','gift_received')),
payload jsonb, read bool default false, created_at timestamptz
```

### ai_usage
```sql
user_id uuid references profiles(id), day date, calls int default 0, tokens int default 0,
primary key (user_id, day)
```
Global cap = `sum(calls) where day = current_date`.

## Row-Level Security
| Table | Select | Insert/Update/Delete |
|---|---|---|
| profiles | any authenticated (handle, name, avatar only via view `public_profiles`); full row own | own (points/onboarded via functions only) |
| exercises | seed + own custom | own custom |
| workouts, workout_sets | own **or** active partner's (via partnership) | own |
| workout_templates, gifts | all authenticated | none |
| media | own; partner can see `is_checkin` rows | own |
| partnerships | either member | insert as `user_a`; update: `user_b` accepts/declines, either ends |
| weekly_goals | members | own row, `week_start` > current week only; result columns by `close_weeks()` only |
| stake_ledger | members | update `settled` by creditor only; insert by function only |
| wagers | participants | insert as creator; status via functions |
| wager_participants, wager_messages | participants | own row / own messages |
| user_gifts | sender or recipient | RPC only |
| points_ledger | own | functions only |
| foods | seed + own | own |
| nutrition_logs | own | own |
| notifications | own | update `read` own; insert by functions |
| ai_usage | own | server (service role) only |

## Indexes
```sql
create index on workouts(user_id, started_at desc);
create index on workout_sets(workout_id);
create index on media(workout_id) where is_checkin;
create index on partnerships(user_a) where status = 'active';
create index on partnerships(user_b) where status = 'active';
create index on stake_ledger(partnership_id) where not settled;
create index on nutrition_logs(user_id, logged_at desc);
create index on notifications(user_id, read);
```

## Storage Buckets
- `media`: private; policy `auth.uid()::text = (storage.foldername(name))[1]`;
  partners get signed URLs for check-in photos via a server route
- `avatars`: public read, own write
- 1 GB total / 50 MB per file: compress client-side first (see 06)
