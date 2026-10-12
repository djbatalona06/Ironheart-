-- Two-step verification is enforced by the database, not just the UI.
begin;
\ir _helpers.psql

create or replace function pg_temp.login_aal(uid uuid, aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
  execute 'set local role authenticated';
end $$;

select pg_temp.mk_user('mfa_plain') as plain \gset
select pg_temp.mk_user('mfa_on') as secure \gset
insert into public.workouts (user_id, name) values (:'plain', 'Plain'), (:'secure', 'Secure');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), :'secure', 'Phone', 'totp', 'verified', now(), now(), 'x');

-- No authenticator: aal1 is enough.
select pg_temp.login_aal(:'plain', 'aal1');
select pg_temp.check(public.mfa_satisfied(), 'user without 2FA passes at aal1');
select pg_temp.check((select count(*) from public.workouts) = 1, 'user without 2FA reads own workouts at aal1');
reset role;

-- Authenticator on, session still aal1: every path is closed.
select pg_temp.login_aal(:'secure', 'aal1');
select pg_temp.check(not public.mfa_satisfied(), '2FA user at aal1 is not satisfied');
select pg_temp.check((select count(*) from public.workouts) = 0, 'restrictive policy hides rows (Realtime path) at aal1');
do $$ begin
  perform public.enforce_mfa();
  raise exception 'FAIL: enforce_mfa allowed an aal1 session';
exception when insufficient_privilege then raise notice 'ok - PostgREST pre-request rejects aal1 (tables + RPCs)';
end $$;
reset role;

-- Same user after entering the code (aal2): allowed.
select pg_temp.login_aal(:'secure', 'aal2');
select pg_temp.check(public.mfa_satisfied(), '2FA user at aal2 passes');
select public.enforce_mfa();
select pg_temp.check((select count(*) from public.workouts) = 1, '2FA user reads own workouts at aal2');
reset role;

select pg_temp.check(
  (select rolconfig::text like '%pgrst.db_pre_request=public.enforce_mfa%' from pg_roles where rolname = 'authenticator'),
  'PostgREST is wired to run enforce_mfa before every request'
);

rollback;
