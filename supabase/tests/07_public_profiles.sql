-- Partner search card: everyone's handle/name, nobody else's body stats,
-- and no view that silently bypasses RLS (Supabase "Security Definer View").
begin;
\ir _helpers.psql

select pg_temp.check(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v' and n.nspname = 'public'
      and not coalesce(c.reloptions @> array['security_invoker=on'], false)
  ),
  'every public view runs as the caller (security_invoker)'
);

select pg_temp.mk_user('card_a') as a \gset
select pg_temp.mk_user('card_b') as b \gset
update public.profiles set weight_kg = 90 where id = :'b';

select pg_temp.login(:'a');
select pg_temp.check((select count(*) from public.public_profiles where handle = 'card_b') = 1, 'search finds another user by handle');
select pg_temp.check((select count(*) from public.profiles where id = :'b') = 0, 'their profile row (body stats) stays hidden');
reset role;

set local role anon;
do $$ begin
  perform 1 from public.public_profiles;
  raise exception 'FAIL: anon read public_profiles';
exception when insufficient_privilege then raise notice 'ok - signed-out visitors cannot list profiles';
end $$;
reset role;

rollback;
