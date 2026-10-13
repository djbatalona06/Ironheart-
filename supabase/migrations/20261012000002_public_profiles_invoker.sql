-- Fix Supabase advisor "Security Definer View" on public.public_profiles.
-- The view must show every user's handle/name/avatar (partner search) but no
-- body stats, which profiles RLS (own row only) would otherwise hide. Make that
-- bypass explicit: a security definer function returns only the safe columns,
-- and the view runs as the caller (security_invoker). The function lives in the
-- private schema, which the API doesn't expose, so it isn't a callable RPC.

create function private.profile_cards()
returns table (id uuid, handle text, name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.handle, p.name, p.avatar_url from public.profiles p where p.handle is not null;
$$;
revoke all on function private.profile_cards() from public, anon;
grant usage on schema private to authenticated;          -- only this function is granted inside it
grant execute on function private.profile_cards() to authenticated;

create or replace view public.public_profiles with (security_invoker = on) as
  select id, handle, name, avatar_url from private.profile_cards();
-- ponytail: filters run after the function returns every card; fine at this scale,
-- switch to a search RPC with a handle argument if profiles reach ~100k.
