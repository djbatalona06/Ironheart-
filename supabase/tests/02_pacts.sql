begin;
\ir _helpers.psql
select pg_temp.mk_user('alice') as a \gset
select pg_temp.mk_user('bob') as b \gset
select pg_temp.mk_user('eve') as e \gset
\set tz 'America/New_York'

-- credit_date: same-week sync counts on the real day; post-close sync counts on sync day.
select pg_temp.check(public.credit_date('2026-09-30 15:00Z', '2026-10-01 12:00Z', :'tz') = '2026-09-30', 'synced same week → workout day');
select pg_temp.check(public.credit_date('2026-10-04 15:00Z', '2026-10-05 04:00Z', :'tz') = '2026-10-04', 'synced Sun 11:59pm local → still Sunday');
select pg_temp.check(public.credit_date('2026-10-04 15:00Z', '2026-10-05 04:00:01Z', :'tz') = '2026-10-05', 'synced 1s after close → open week (Monday)');
select pg_temp.check(public.credit_date('2026-09-25 15:00Z', '2026-10-07 15:00Z', :'tz') = '2026-10-07', 'synced days late → credited on sync day');
select pg_temp.check(public.week_start_of('2026-10-05 03:00Z', :'tz') = '2026-09-28', 'Sun night local is still last week');

-- ===== invite / accept via RPC =====
select pg_temp.login(:'a');
select public.create_pact('BOB', 2, 'Buy dinner', :'tz') as pid \gset
reset role;
select pg_temp.check((select count(*) from public.notifications where user_id = :'b' and type = 'pact_invite') = 1, 'bob got pact_invite');
select pg_temp.login(:'e');
do $$ begin perform public.respond_pact((select id from public.partnerships limit 1), true, 3, 'x');
  raise exception 'FAIL: eve accepted bob''s invite';
exception when no_data_found then raise notice 'ok - only the invitee can respond'; end $$;
reset role;
select pg_temp.login(:'b');
select public.respond_pact(:'pid', true, 3, 'Do dishes');
select pg_temp.check((select status = 'active' from public.partnerships where id = :'pid'), 'pact active after accept');
select pg_temp.check((select count(*) = 2 from public.weekly_goals where partnership_id = :'pid'), 'both first-week goals created');
select pg_temp.check((select started_week = case when extract(isodow from now() at time zone :'tz') <= 3
  then public.week_start_of(now(), :'tz') else public.week_start_of(now(), :'tz') + 7 end
  from public.partnerships where id = :'pid'), 'Mon–Wed counts this week, Thu–Sun → warm-up');
select pg_temp.check(public.set_goal(:'pid', 4, 'Cook') > public.week_start_of(now(), :'tz'), 'set_goal targets a future week');
reset role;

-- ===== weekly close over two past weeks =====
-- Rewind the pact two weeks (W) and plant workouts with explicit sync times.
select public.week_start_of(now(), :'tz') - 14 as w \gset
delete from public.weekly_goals where partnership_id = :'pid';
update public.partnerships set started_week = :'w' where id = :'pid';
insert into public.weekly_goals (partnership_id, user_id, week_start, goal_days, stake) values
  (:'pid', :'a', :'w', 2, 'Buy dinner'), (:'pid', :'b', :'w', 3, 'Do dishes');

set local session_replication_role = replica;  -- bypass triggers to backdate done_at
insert into public.workouts (user_id, name, started_at, done_at) values
  (:'a', 'a1', (:'w'::date + 0) + time '18:00', (:'w'::date + 0) + time '19:00'),
  (:'a', 'a1b', (:'w'::date + 0) + time '07:00', (:'w'::date + 0) + time '08:00'),   -- same day: counts once
  (:'a', 'a2', (:'w'::date + 2) + time '18:00', (:'w'::date + 2) + time '19:00'),
  (:'b', 'b1', (:'w'::date + 1) + time '18:00', (:'w'::date + 1) + time '19:00'),
  (:'b', 'b-late', (:'w'::date + 5) + time '18:00', (:'w'::date + 8) + time '12:00'), -- synced after W closed
  (:'b', 'b2', (:'w'::date + 9) + time '18:00', (:'w'::date + 9) + time '19:00'),
  (:'b', 'b3', (:'w'::date + 10) + time '18:00', (:'w'::date + 10) + time '19:00');
update public.workouts set started_at = (started_at::timestamp at time zone :'tz'),
  done_at = (done_at::timestamp at time zone :'tz'), status = 'done' where user_id in (:'a', :'b');
set local session_replication_role = origin;

select public.close_weeks();
select pg_temp.check((select count(distinct week_start) = 2 from public.weekly_goals where partnership_id = :'pid' and result <> 'pending'), 'close_weeks closed W and W+7');
select pg_temp.check(public.close_weeks() = 0, 'idempotent: second run closes nothing');

select pg_temp.check((select result = 'hit' and days_done = 2 from public.weekly_goals where user_id = :'a' and week_start = :'w'), 'W: alice 2/2 hit (same-day workouts count once)');
select pg_temp.check((select result = 'missed' and days_done = 1 from public.weekly_goals where user_id = :'b' and week_start = :'w'), 'W: bob 1/3 missed (late sync not re-scored)');
select pg_temp.check((select result = 'missed' from public.weekly_goals where user_id = :'a' and week_start = :'w'::date + 7), 'W+7: alice missed (carried goal)');
select pg_temp.check((select result = 'hit' and days_done = 3 from public.weekly_goals where user_id = :'b' and week_start = :'w'::date + 7), 'W+7: bob 3/3 hit incl. late-synced workout');
select pg_temp.check((select count(*) = 2 from public.weekly_goals where partnership_id = :'pid' and week_start = :'w'::date + 14 and result = 'pending'), 'current week carried forward');
select pg_temp.check((select string_agg(stake, ',' order by week_start) from public.stake_ledger where partnership_id = :'pid') = 'Do dishes,Buy dinner', 'ledger: bob owes dishes, alice owes dinner');
select pg_temp.check((select streak = 0 from public.partnerships where id = :'pid'), 'streak resets when someone misses');
select pg_temp.check((select count(*) = 2 from public.points_ledger where reason = 'goal_hit' and ref_id = :'pid'), '+20 per goal hit');
select pg_temp.check((select count(*) = 4 from public.notifications where type = 'week_result' and payload->>'partnership_id' = :'pid'), 'week_result sent to both, each week');

-- ===== calendar + settle as users =====
select pg_temp.login(:'a');
select pg_temp.check((select count(*) = 3 from public.pact_week_days(:'pid', :'w')), 'calendar W: alice Mon+Wed, bob Tue');
select pg_temp.check((select bool_and(late) from public.pact_week_days(:'pid', :'w'::date + 7) where day = :'w'::date + 8), 'late-synced cell flagged');
reset role;
select pg_temp.login(:'e');
do $$ begin perform public.pact_week_days((select id from public.partnerships limit 1), current_date);
  raise exception 'FAIL: outsider read calendar';
exception when insufficient_privilege then raise notice 'ok - outsider cannot read calendar'; end $$;
reset role;

select id as bob_debt from public.stake_ledger where debtor_id = :'b' \gset
select pg_temp.login(:'b');
do $$ begin perform public.settle_stake((select id from public.stake_ledger where debtor_id = auth.uid()));
  raise exception 'FAIL: debtor settled own debt';
exception when insufficient_privilege then raise notice 'ok - debtor cannot settle'; end $$;
reset role;
select pg_temp.login(:'a');
select public.settle_stake(:'bob_debt');
select pg_temp.check((select settled from public.stake_ledger where id = :'bob_debt'), 'creditor settles');
select public.end_pact(:'pid');
select pg_temp.check((select status = 'ended' from public.partnerships where id = :'pid'), 'pact ended');
reset role;
select pg_temp.check((select count(*) = 0 from public.weekly_goals where partnership_id = :'pid' and result = 'pending'), 'unscored week dropped on end');
rollback;
