begin;
\ir _helpers.psql
select pg_temp.mk_user('alice') as a \gset
select pg_temp.check(public.ai_take(:'a', false) is null, 'first call allowed');
select pg_temp.check((select calls = 1 from public.ai_usage where user_id = :'a'), 'counted');
select public.ai_take(:'a', true) from generate_series(1, 5);
select pg_temp.check(public.ai_take(:'a', true) like '%food estimates%', '6th food estimate refused');
select public.ai_take(:'a', false) from generate_series(1, 4);  -- 1 + 5 food + 4 = 10
select pg_temp.check(public.ai_take(:'a', false) like '%10 AI requests%', '11th call refused');
insert into public.ai_usage (user_id, calls) select pg_temp.mk_user('user' || i), 10 from generate_series(1, 19) i;
select pg_temp.mk_user('bob') as b \gset
select pg_temp.check(public.ai_take(:'b', false) like 'AI quota reached%', 'global cap of 200 enforced');
select pg_temp.login(:'a');
do $$ begin perform public.ai_take(auth.uid(), false); raise exception 'FAIL: client called ai_take';
exception when insufficient_privilege then raise notice 'ok - clients cannot call ai_take'; end $$;
rollback;
