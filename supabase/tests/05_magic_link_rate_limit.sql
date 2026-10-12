begin;
\ir _helpers.psql

select pg_temp.check(
  (select bool_and(public.take_magic_link_slot(repeat('a', 64)) = 0)
   from generate_series(1, 5)),
  'first five magic-link attempts are allowed'
);

select pg_temp.check(
  public.take_magic_link_slot(repeat('a', 64)) = 600,
  'sixth magic-link attempt returns the ten-minute retry interval'
);

update private.magic_link_attempts
set attempted_at = now() - interval '11 minutes'
where email_hash = repeat('a', 64);

-- Separate statements: in one, Postgres runs the count subquery before the call.
select pg_temp.check(
  public.take_magic_link_slot(repeat('a', 64)) = 0,
  'a new attempt is allowed after the window expires'
);
select pg_temp.check(
  (select count(*) = 1 from private.magic_link_attempts where email_hash = repeat('a', 64)),
  'expired attempts are removed'
);

rollback;
