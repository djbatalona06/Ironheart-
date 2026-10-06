begin;
\ir _helpers.psql
select pg_temp.mk_user('alice') as a \gset
select pg_temp.mk_user('bob') as b \gset
select pg_temp.mk_user('eve') as e \gset

-- ===== create / accept =====
select pg_temp.login(:'a');
select public.create_challenge('30-day count', '', 'workouts_count', now() - interval '10 days', now() + interval '1 day', 'bob', 10) as w \gset
reset role;
select pg_temp.login(:'e');
select pg_temp.check((select count(*) = 0 from public.wagers), 'outsider cannot see challenge');
do $$ begin perform public.respond_challenge((select id from public.wagers limit 1), true);
  raise exception 'FAIL: outsider accepted';
exception when no_data_found then raise notice 'ok - outsider cannot respond'; end $$;
reset role;
select pg_temp.login(:'b');
select public.respond_challenge(:'w', true);
select pg_temp.check((select status = 'active' from public.wagers where id = :'w'), 'active once all accept');
reset role;

-- ===== metrics =====
insert into public.workouts (user_id, name, started_at) values
  (:'a', 'a1', now() - interval '3 days'), (:'a', 'a2', now() - interval '2 days'), (:'a', 'a3', now() - interval '1 day'),
  (:'a', 'old', now() - interval '20 days'),
  (:'b', 'b1', now() - interval '5 days'), (:'b', 'b2', now() - interval '3 days');
insert into public.workout_sets (workout_id, exercise_id, set_index, reps, weight_kg, completed)
select w.id, (select id from public.exercises limit 1), 0, 5, 100, true from public.workouts w where w.name in ('a1', 'b1');
insert into public.workout_sets (workout_id, exercise_id, set_index, reps, weight_kg, completed)
select w.id, (select id from public.exercises limit 1), 1, 5, 100, false from public.workouts w where w.name = 'a1';
select pg_temp.check(public.challenge_value(:'a', 'workouts_count', now() - interval '10 days', now()) = 3, 'count ignores workouts before start');
select pg_temp.check(public.challenge_value(:'a', 'total_volume', now() - interval '10 days', now()) = 500, 'volume counts completed sets only');
select pg_temp.check(public.challenge_value(:'a', 'streak', now() - interval '10 days', now()) = 3, 'streak = 3 consecutive days');
select pg_temp.check(public.challenge_value(:'b', 'streak', now() - interval '10 days', now()) = 1, 'gap breaks streak');
update public.profiles set protein_g_goal = 100 where id = :'a';
insert into public.nutrition_logs (user_id, food_name, calories, protein_g, meal_type, logged_at) values
  (:'a', 'shake', 400, 60, 'snack', now() - interval '2 days'), (:'a', 'chicken', 300, 50, 'lunch', now() - interval '2 days'),
  (:'a', 'snack', 100, 10, 'snack', now() - interval '1 day');
select pg_temp.check(public.challenge_value(:'a', 'macro_hit', now() - interval '10 days', now()) = 1, 'macro_hit counts days at protein goal');

-- ===== close: winner, points, notifications =====
update public.wagers set ends_at = now() - interval '1 minute' where id = :'w';
select pg_temp.check(public.recompute_challenges() = 1, 'recompute closes ended challenge');
select pg_temp.check((select status = 'completed' and winner_id = :'a' from public.wagers where id = :'w'), 'alice wins 3–2');
select pg_temp.check((select count(*) = 1 from public.points_ledger where user_id = :'a' and reason = 'challenge_win'), '+50 to winner');
select pg_temp.check((select count(*) = 2 from public.notifications where type = 'wager_result' and payload->>'wager_id' = :'w'), 'both notified');

-- tie → no winner
select pg_temp.login(:'b');
select public.create_challenge('tie', null, 'workouts_count', now() - interval '30 days', now() + interval '1 day', 'alice') as t \gset
reset role;
update public.wager_participants set accepted = true where wager_id = :'t';
update public.wagers set status = 'active', starts_at = now() - interval '6 days', ends_at = now() - interval '1 minute' where id = :'t';
delete from public.workouts where name in ('a3', 'old');  -- 2–2 in window
select public.recompute_challenges();
select pg_temp.check((select status = 'completed' and winner_id is null from public.wagers where id = :'t'), 'tie → no winner');

-- ===== gifts =====
update public.profiles set points = 30 where id = :'a';
select pg_temp.login(:'a');
do $$ begin perform public.send_gift((select id from public.public_profiles where handle = 'bob'), (select id from public.gifts where name = 'Iron Trophy'));
  raise exception 'FAIL: gift sent without enough points';
exception when invalid_parameter_value then raise notice 'ok - not enough points for a 50-pt gift'; end $$;
select public.send_gift(:'b', (select id from public.gifts where name = 'Shaker Bottle'), :'w', 'nice work');
select pg_temp.check((select points = 5 from public.profiles where id = :'a'), 'gift cost deducted (30 - 25)');
do $$ begin perform public.send_gift((select id from public.public_profiles where handle = 'eve'), (select id from public.gifts where name = 'Gold Star'));
  raise exception 'FAIL: gifted a stranger';
exception when insufficient_privilege then raise notice 'ok - cannot gift strangers'; end $$;
reset role;
select pg_temp.check((select count(*) = 1 from public.notifications where user_id = :'b' and type = 'gift_received'), 'recipient notified');

-- ===== chat notifications dedupe =====
select pg_temp.login(:'a');
insert into public.wager_messages (wager_id, user_id, text) values (:'w', :'a', 'gg'), (:'w', :'a', 'rematch?');
reset role;
select pg_temp.check((select count(*) = 1 from public.notifications where user_id = :'b' and type = 'partner_message'), 'one unread chat notification per challenge');
select pg_temp.login(:'b');
select public.mark_all_read();
select pg_temp.check((select bool_and(read) from public.notifications), 'mark_all_read');
rollback;
