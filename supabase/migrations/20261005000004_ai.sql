-- AI budget caps (docs/10): 200 calls/day globally, 10/user/day, ≤5 of them food estimates.
-- Called by /api/ai with the service role; not exposed to clients.
create function public.ai_take(uid uuid, food bool) returns text
language plpgsql security definer set search_path = '' as $$
declare u public.ai_usage;
begin
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || current_date));  -- serialize the global check
  if (select coalesce(sum(calls), 0) from public.ai_usage where day = current_date) >= 200 then
    return 'AI quota reached for today. Try again tomorrow.';
  end if;
  insert into public.ai_usage (user_id, day) values (uid, current_date) on conflict do nothing;
  select * into u from public.ai_usage where user_id = uid and day = current_date for update;
  if u.calls >= 10 then return 'You''ve used your 10 AI requests today. Try again tomorrow.'; end if;
  if food and u.food_calls >= 5 then return 'You''ve used your 5 food estimates today. Enter it manually.'; end if;
  update public.ai_usage set calls = calls + 1, food_calls = food_calls + food::int
  where user_id = uid and day = current_date;
  return null;
end $$;

create function public.ai_record(uid uuid, used int) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage set tokens = tokens + used where user_id = uid and day = current_date
$$;

revoke execute on function public.ai_take(uuid, bool), public.ai_record(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_take(uuid, bool), public.ai_record(uuid, int) to service_role;
