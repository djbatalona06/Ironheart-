-- Two-factor (TOTP) enforcement in the database, not just the UI.
-- Once a user has a verified authenticator, every API call needs an aal2 session.
-- Users without one (and anon/service role) are unaffected.

create function public.mfa_satisfied() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is null
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;
revoke all on function public.mfa_satisfied() from public;
grant execute on function public.mfa_satisfied() to anon, authenticated, service_role;

-- PostgREST runs this before every REST and RPC request, which covers tables
-- and the security definer functions (RLS alone wouldn't stop those).
create function public.enforce_mfa() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.mfa_satisfied() then
    raise exception 'Two-factor verification required' using errcode = '42501', hint = 'aal2';
  end if;
end
$$;
revoke all on function public.enforce_mfa() from public;
grant execute on function public.enforce_mfa() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.enforce_mfa';
notify pgrst, 'reload config';

-- Realtime and Storage don't go through PostgREST: gate them with restrictive policies.
create policy mfa_gate on public.workouts as restrictive for select to authenticated
  using ((select public.mfa_satisfied()));
create policy mfa_gate on public.notifications as restrictive for select to authenticated
  using ((select public.mfa_satisfied()));
create policy mfa_gate on public.wager_messages as restrictive for select to authenticated
  using ((select public.mfa_satisfied()));
create policy mfa_gate on storage.objects as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
