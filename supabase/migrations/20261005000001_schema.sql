-- IRONHEART schema: tables, RLS, grants. Source of truth: docs/04_DATA_MODEL.md
-- Rule of thumb: clients get SELECT + narrow column grants; anything that moves
-- points, results, ledgers or notifications goes through security definer RPCs.

-- ============ Identity ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  name text check (length(name) <= 60),
  avatar_url text,
  goal text check (goal in ('muscle','fat_loss','strength','endurance')),
  weight_kg numeric check (weight_kg between 25 and 400),
  height_cm numeric check (height_cm between 100 and 250),
  birth_year int check (birth_year between 1900 and 2020),
  sex text check (sex in ('male','female')),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  kcal_goal int, protein_g_goal int, carbs_g_goal int, fat_g_goal int,
  nutrition_enabled bool not null default true,
  points int not null default 0 check (points >= 0),
  onboarded bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 60),
          new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Public card for handle search / partner display (no body stats).
create view public.public_profiles as
  select id, handle, name, avatar_url from public.profiles where handle is not null;

-- ============ Partnerships (core loop) ============
create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','declined','ended')),
  timezone text not null,
  invite_goal_days int not null check (invite_goal_days between 1 and 7),
  invite_stake text not null check (length(invite_stake) between 1 and 60),
  streak int not null default 0,
  started_week date,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check (user_a <> user_b)
);
create unique index one_open_pact_per_pair on public.partnerships
  (least(user_a, user_b), greatest(user_a, user_b)) where status in ('pending','active');
create index on public.partnerships(user_a) where status = 'active';
create index on public.partnerships(user_b) where status = 'active';

create function public.is_partner(me uuid, other uuid) returns bool
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.partnerships p
    where p.status = 'active'
      and ((p.user_a = me and p.user_b = other) or (p.user_b = me and p.user_a = other)));
$$;

create table public.weekly_goals (
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  goal_days int not null check (goal_days between 1 and 7),
  stake text not null check (length(stake) between 1 and 60),
  days_done int,
  result text not null default 'pending' check (result in ('pending','hit','missed')),
  primary key (partnership_id, user_id, week_start)
);

create table public.stake_ledger (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  debtor_id uuid not null references public.profiles(id) on delete cascade,
  creditor_id uuid not null references public.profiles(id) on delete cascade,
  stake text not null,
  week_start date not null,
  settled bool not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.stake_ledger(partnership_id) where not settled;

-- ============ Training ============
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  muscle_group text not null,
  equipment text,
  is_custom bool not null default false,
  created_by uuid references public.profiles(id) on delete cascade
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),       -- client may supply (offline idempotency)
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  status text not null default 'done' check (status in ('planned','done')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text check (length(notes) <= 1000),
  generated_from text,
  done_at timestamptz,                                  -- server time it became 'done' (= sync time)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.workouts(user_id, started_at desc);

-- done_at is server-owned: it is what the late-sync rule keys on.
create function public.workouts_set_done_at() returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.done_at = now();
  elsif tg_op = 'UPDATE' then
    new.done_at = old.done_at;
  else
    new.done_at = null;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger workouts_done_at before insert or update on public.workouts
  for each row execute function public.workouts_set_done_at();

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_index int not null check (set_index >= 0),
  reps int check (reps between 0 and 1000),
  weight_kg numeric check (weight_kg between 0 and 1000),
  rpe numeric check (rpe between 1 and 10),
  completed bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.workout_sets(workout_id);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  days_per_week int not null,
  description text,
  source_note text,
  days jsonb not null
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  type text not null check (type in ('photo','video')),
  storage_path text not null,
  duration_seconds int check (duration_seconds between 0 and 15),
  caption text check (length(caption) <= 300),
  is_checkin bool not null default false,
  created_at timestamptz not null default now()
);
create index on public.media(workout_id) where is_checkin;

-- ============ Challenges + gifts + points ============
create table public.wagers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  description text check (length(description) <= 500),
  metric text not null check (metric in ('workouts_count','total_volume','streak','macro_hit')),
  target numeric,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'pending' check (status in ('pending','active','completed','declined')),
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.wager_participants (
  wager_id uuid not null references public.wagers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  accepted bool not null default false,
  current_value numeric not null default 0,
  primary key (wager_id, user_id)
);

create function public.is_wager_participant(w uuid) returns bool
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wager_participants
                 where wager_id = w and user_id = auth.uid());
$$;

create table public.wager_messages (
  id uuid primary key default gen_random_uuid(),
  wager_id uuid not null references public.wagers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null, icon text not null, cost int not null check (cost > 0)
);

create table public.user_gifts (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  gift_id uuid not null references public.gifts(id),
  wager_id uuid references public.wagers(id) on delete set null,
  message text check (length(message) <= 140),
  created_at timestamptz not null default now()
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('workout','goal_hit','challenge_win','macro_hit','streak_7','gift_sent')),
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- ============ Nutrition ============
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  serving_size text not null,
  calories numeric not null check (calories >= 0),
  protein_g numeric not null default 0, carbs_g numeric not null default 0, fat_g numeric not null default 0,
  created_by uuid references public.profiles(id) on delete cascade
);
create index on public.foods using gin (to_tsvector('simple', name));

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),       -- client may supply (offline)
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name text not null,
  calories numeric not null check (calories >= 0),
  protein_g numeric not null default 0, carbs_g numeric not null default 0, fat_g numeric not null default 0,
  serving_size text,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.nutrition_logs(user_id, logged_at desc);
create trigger nutrition_touch before update on public.nutrition_logs
  for each row execute function public.touch_updated_at();

-- ============ System ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'pact_invite','pact_accepted','partner_checkin','week_result','stake_settled',
    'wager_invite','wager_accepted','wager_result','partner_message','gift_received')),
  payload jsonb not null default '{}',
  read bool not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, read);

create table public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  food_calls int not null default 0,
  tokens int not null default 0,
  primary key (user_id, day)
);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.partnerships enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.stake_ledger enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_templates enable row level security;
alter table public.media enable row level security;
alter table public.wagers enable row level security;
alter table public.wager_participants enable row level security;
alter table public.wager_messages enable row level security;
alter table public.gifts enable row level security;
alter table public.user_gifts enable row level security;
alter table public.points_ledger enable row level security;
alter table public.foods enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_usage enable row level security;

-- Start from zero for API roles, then grant exactly what each table needs.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.public_profiles to authenticated;

-- profiles: own row; points/created_at not client-writable
create policy own_profile_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (handle, name, avatar_url, goal, weight_kg, height_cm, birth_year, sex, activity_level,
  kcal_goal, protein_g_goal, carbs_g_goal, fat_g_goal, nutrition_enabled, onboarded) on public.profiles to authenticated;

-- pacts: members read; all writes via RPC
create policy member_select on public.partnerships for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy member_select on public.weekly_goals for select to authenticated
  using (exists (select 1 from public.partnerships p where p.id = partnership_id and (select auth.uid()) in (p.user_a, p.user_b)));
create policy member_select on public.stake_ledger for select to authenticated
  using ((select auth.uid()) in (debtor_id, creditor_id));
grant select on public.partnerships, public.weekly_goals, public.stake_ledger to authenticated;

-- exercises: seed + own custom
create policy read_exercises on public.exercises for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));
create policy add_custom on public.exercises for insert to authenticated
  with check (created_by = (select auth.uid()) and is_custom);
grant select on public.exercises to authenticated;
grant insert (name, muscle_group, equipment, is_custom, created_by) on public.exercises to authenticated;

-- workouts: own CRUD, active partners read
create policy read_workouts on public.workouts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_partner((select auth.uid()), user_id));
create policy own_insert on public.workouts for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_update on public.workouts for update to authenticated using (user_id = (select auth.uid()));
create policy own_delete on public.workouts for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.workouts to authenticated;
grant insert (id, user_id, name, status, started_at, ended_at, notes, generated_from) on public.workouts to authenticated;
grant update (name, status, started_at, ended_at, notes) on public.workouts to authenticated;

create policy read_sets on public.workout_sets for select to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id
    and (w.user_id = (select auth.uid()) or public.is_partner((select auth.uid()), w.user_id))));
create policy own_write_sets on public.workout_sets for all to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())));
grant select, insert, update, delete on public.workout_sets to authenticated;

create policy read_all on public.workout_templates for select to authenticated using (true);
create policy read_all on public.gifts for select to authenticated using (true);
grant select on public.workout_templates, public.gifts to authenticated;

-- media: own; partners see check-ins
create policy read_media on public.media for select to authenticated
  using (user_id = (select auth.uid()) or (is_checkin and public.is_partner((select auth.uid()), user_id)));
create policy own_write_media on public.media for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.media to authenticated;

-- challenges: participants read; writes via RPC except chat
create policy participant_select on public.wagers for select to authenticated using (public.is_wager_participant(id));
create policy participant_select on public.wager_participants for select to authenticated using (public.is_wager_participant(wager_id));
create policy participant_select on public.wager_messages for select to authenticated using (public.is_wager_participant(wager_id));
create policy participant_post on public.wager_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_wager_participant(wager_id));
grant select on public.wagers, public.wager_participants, public.wager_messages to authenticated;
grant insert (wager_id, user_id, text) on public.wager_messages to authenticated;

create policy sender_or_recipient on public.user_gifts for select to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id));
create policy own_points on public.points_ledger for select to authenticated using (user_id = (select auth.uid()));
grant select on public.user_gifts, public.points_ledger to authenticated;

-- nutrition
create policy read_foods on public.foods for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));
create policy own_foods on public.foods for insert to authenticated with check (created_by = (select auth.uid()));
grant select on public.foods to authenticated;
grant insert (name, serving_size, calories, protein_g, carbs_g, fat_g, created_by) on public.foods to authenticated;

create policy own_logs on public.nutrition_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, delete on public.nutrition_logs to authenticated;
grant insert (id, user_id, food_id, food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, logged_at)
  on public.nutrition_logs to authenticated;
grant update (food_name, calories, protein_g, carbs_g, fat_g, serving_size, meal_type, logged_at)
  on public.nutrition_logs to authenticated;

-- notifications: read + mark read only
create policy own_notifications on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy own_mark_read on public.notifications for update to authenticated using (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

create policy own_usage on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
grant select on public.ai_usage to authenticated;

-- Realtime: calendar + notifications (RLS applies to change events)
alter publication supabase_realtime add table public.workouts, public.notifications, public.wager_messages;

-- ============ Storage ============
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800), ('avatars', 'avatars', true, 2097152)
on conflict (id) do nothing;

create policy media_own on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Partners may read files backing a check-in media row.
create policy media_partner_checkin on storage.objects for select to authenticated
  using (bucket_id = 'media' and exists (
    select 1 from public.media m where m.storage_path = name and m.is_checkin
      and public.is_partner((select auth.uid()), m.user_id)));
create policy avatars_own on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
