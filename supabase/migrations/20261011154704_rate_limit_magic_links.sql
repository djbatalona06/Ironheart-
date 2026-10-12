-- Magic-link rate limit: max 5 sign-in emails per hashed address per 10 minutes.
-- Stored in a private schema that only the service role can reach.
-- Saved from the remote migration history (version 20261011154704) so local files match.
CREATE SCHEMA if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.magic_link_attempts (
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  attempted_at timestamptz not null default now()
);

create index magic_link_attempts_email_time_idx on private.magic_link_attempts (email_hash, attempted_at);

alter table private.magic_link_attempts enable row level security;
revoke all on private.magic_link_attempts from public, anon, authenticated;
grant all on private.magic_link_attempts to service_role;

create function public.take_magic_link_slot(p_email_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
  oldest_attempt timestamptz;
begin
  if p_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid email hash';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('magic-link:' || p_email_hash, 0)
  );

  delete from private.magic_link_attempts
  where magic_link_attempts.email_hash = p_email_hash
    and magic_link_attempts.attempted_at <= pg_catalog.now() - interval '10 minutes';

  select count(*)::integer, min(attempted_at)
    into attempt_count, oldest_attempt
  from private.magic_link_attempts
  where magic_link_attempts.email_hash = p_email_hash;

  if attempt_count >= 5 then
    return greatest(
      1,
      ceil(extract(epoch from (oldest_attempt + interval '10 minutes' - pg_catalog.now())))::integer
    );
  end if;

  insert into private.magic_link_attempts (email_hash) values (p_email_hash);
  return 0;
end
$$;

revoke all on function public.take_magic_link_slot(text) from public, anon, authenticated;
grant execute on function public.take_magic_link_slot(text) to service_role;
