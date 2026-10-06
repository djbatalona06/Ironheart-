begin;
\ir _helpers.psql
select pg_temp.mk_user('alice') as a \gset
select pg_temp.mk_user('bob') as b \gset
select pg_temp.mk_user('eve') as e \gset
insert into public.workouts (user_id, name) values (:'b', 'Bob legs');

select pg_temp.login(:'a');
select pg_temp.check((select count(*) from public.workouts) = 0, 'non-partner cannot read workouts');
select pg_temp.check((select count(*) from public.profiles) = 1, 'profiles: only own row');
select pg_temp.check((select count(*) from public.public_profiles) = 3, 'public_profiles lists handles');
select pg_temp.check((select count(*) from public.exercises) > 50, 'seed exercises readable');

-- Column grants: points and server-owned columns are not client-writable.
do $$ begin
  update public.profiles set points = 9999;
  raise exception 'FAIL: points should not be updatable';
exception when insufficient_privilege then raise notice 'ok - points not client-writable';
end $$;
do $$ begin
  insert into public.stake_ledger (partnership_id, debtor_id, creditor_id, stake, week_start)
    values (gen_random_uuid(), auth.uid(), auth.uid(), 'x', '2026-10-05');
  raise exception 'FAIL: ledger insert should be denied';
exception when insufficient_privilege then raise notice 'ok - ledger not client-writable';
end $$;
do $$ begin
  insert into public.workouts (user_id, name) values ((select id from public.public_profiles where handle = 'bob'), 'forged');
  raise exception 'FAIL: inserting a workout for another user should fail';
exception when insufficient_privilege then raise notice 'ok - cannot insert workout for someone else';
end $$;

-- created_at / done_at are server-owned
insert into public.workouts (user_id, name) values (:'a', 'Alice push');
select pg_temp.check((select done_at is not null from public.workouts where name = 'Alice push'), 'done_at set by server');
do $$ begin
  insert into public.workouts (user_id, name, created_at) values (auth.uid(), 'x', '2000-01-01');
  raise exception 'FAIL: created_at should not be client-settable';
exception when insufficient_privilege then raise notice 'ok - created_at not client-settable';
end $$;

reset role;
-- Make alice + bob active partners: alice now sees bob's workout, eve still doesn't.
insert into public.partnerships (user_a, user_b, status, timezone, invite_goal_days, invite_stake)
  values (:'a', :'b', 'active', 'UTC', 3, 'Buy dinner');
select pg_temp.login(:'a');
select pg_temp.check((select count(*) from public.workouts where user_id = :'b') = 1, 'active partner can read workouts');
reset role;
select pg_temp.login(:'e');
select pg_temp.check((select count(*) from public.workouts) = 0, 'outsider still sees nothing');
rollback;
