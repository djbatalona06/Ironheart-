-- Weekly partner pacts: week math, credit dates, RPCs, weekly close.
-- docs/04_DATA_MODEL.md (Partner Pacts) and docs/08_WAGER_AND_NOTIFICATIONS.md (Part 1)

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'pact_invite','pact_accepted','pact_declined','pact_ended','partner_checkin','week_result','stake_settled',
  'wager_invite','wager_accepted','wager_result','partner_message','gift_received'));

create index on public.workouts(user_id, done_at) where status = 'done';

-- ---------- week math (Monday weeks, in the pact's timezone) ----------
create function public.week_start_of(t timestamptz, tz text) returns date
language sql immutable as $$ select date_trunc('week', t at time zone tz)::date $$;

create function public.week_close(ws date, tz text) returns timestamptz
language sql immutable as $$ select (ws + 7)::timestamp at time zone tz $$;

-- The day a workout counts for. Synced before its week closed → the day it
-- happened. Synced after → the day it synced (closed weeks are never re-scored).
create function public.credit_date(started_at timestamptz, done_at timestamptz, tz text) returns date
language sql immutable as $$
  select case when done_at <= public.week_close(public.week_start_of(started_at, tz), tz)
              then (started_at at time zone tz)::date
              else (done_at at time zone tz)::date end
$$;

create function public.days_done(uid uuid, ws date, tz text) returns int
language sql stable security definer set search_path = '' as $$
  select count(distinct public.credit_date(w.started_at, w.done_at, tz))::int
  from public.workouts w
  where w.user_id = uid and w.status = 'done'
    and w.done_at >= ws::timestamp at time zone tz
    and public.credit_date(w.started_at, w.done_at, tz) between ws and ws + 6
$$;

-- Calendar cells for one pact week. Members only (works for ended pacts too).
create function public.pact_week_days(p uuid, ws date)
returns table (day date, user_id uuid, verified bool, late bool, workout_ids uuid[])
language plpgsql stable security definer set search_path = '' as $$
declare pr public.partnerships;
begin
  select * into pr from public.partnerships where id = p and auth.uid() in (user_a, user_b);
  if not found then raise exception 'not a member' using errcode = '42501'; end if;
  return query
    select c.d, w.user_id,
           bool_or(exists (select 1 from public.media m where m.workout_id = w.id and m.is_checkin)),
           bool_or(c.d <> (w.started_at at time zone pr.timezone)::date),
           array_agg(w.id order by w.started_at)
    from public.workouts w
    cross join lateral (select public.credit_date(w.started_at, w.done_at, pr.timezone) as d) c
    where w.user_id in (pr.user_a, pr.user_b) and w.status = 'done'
      and w.done_at >= ws::timestamp at time zone pr.timezone
      and c.d between ws and ws + 6
    group by c.d, w.user_id;
end $$;

-- ---------- internal helpers ----------
create function public.notify(uid uuid, kind text, body jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload) values (uid, kind, body)
$$;

create function public.award_points(uid uuid, delta int, why text, ref uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.points_ledger (user_id, delta, reason, ref_id) values (uid, delta, why, ref);
  update public.profiles set points = points + delta where id = uid;
$$;

create function public.me_card() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'handle', handle, 'name', name) from public.profiles where id = auth.uid()
$$;

-- ---------- RPCs ----------
create function public.create_pact(partner_handle text, goal_days int, stake text, tz text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare partner uuid; pid uuid;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    raise exception 'unknown timezone %', tz using errcode = '22023';
  end if;
  select id into partner from public.profiles where handle = lower(trim(partner_handle));
  if partner is null then raise exception 'no user @%', partner_handle using errcode = 'P0002'; end if;
  if partner = auth.uid() then raise exception 'you cannot pact with yourself' using errcode = '22023'; end if;

  insert into public.partnerships (user_a, user_b, timezone, invite_goal_days, invite_stake)
  values (auth.uid(), partner, tz, goal_days, trim(stake)) returning id into pid;

  perform public.notify(partner, 'pact_invite', public.me_card() ||
    jsonb_build_object('partnership_id', pid, 'goal_days', goal_days, 'stake', trim(stake)));
  return pid;
end $$;

create function public.respond_pact(p uuid, accept bool, goal_days int default null, stake text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare pr public.partnerships; ws date; first_week date;
begin
  select * into pr from public.partnerships where id = p and user_b = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'no pending invite' using errcode = 'P0002'; end if;

  if not accept then
    update public.partnerships set status = 'declined', ended_at = now() where id = p;
    perform public.notify(pr.user_a, 'pact_declined', public.me_card() || jsonb_build_object('partnership_id', p));
    return;
  end if;
  if goal_days is null or stake is null then raise exception 'goal and stake required' using errcode = '22023'; end if;

  -- Accepted Mon–Wed: this week counts. Thu–Sun: warm-up, first scored week is next Monday.
  ws := public.week_start_of(now(), pr.timezone);
  first_week := case when extract(isodow from now() at time zone pr.timezone) <= 3 then ws else ws + 7 end;

  update public.partnerships set status = 'active', accepted_at = now(), started_week = first_week where id = p;
  insert into public.weekly_goals (partnership_id, user_id, week_start, goal_days, stake) values
    (p, pr.user_a, first_week, pr.invite_goal_days, pr.invite_stake),
    (p, pr.user_b, first_week, goal_days, trim(stake));
  perform public.notify(pr.user_a, 'pact_accepted', public.me_card() ||
    jsonb_build_object('partnership_id', p, 'warmup', first_week > ws));
end $$;

-- Goal/stake edits apply from next scored week, never the current one.
create function public.set_goal(p uuid, goal_days int, stake text) returns date
language plpgsql security definer set search_path = '' as $$
declare pr public.partnerships; target date;
begin
  select * into pr from public.partnerships where id = p and status = 'active' and auth.uid() in (user_a, user_b);
  if not found then raise exception 'not an active member' using errcode = '42501'; end if;
  target := greatest(public.week_start_of(now(), pr.timezone) + 7, pr.started_week);
  insert into public.weekly_goals (partnership_id, user_id, week_start, goal_days, stake)
  values (p, auth.uid(), target, goal_days, trim(stake))
  on conflict (partnership_id, user_id, week_start)
    do update set goal_days = excluded.goal_days, stake = excluded.stake;
  return target;
end $$;

create function public.end_pact(p uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare pr public.partnerships;
begin
  update public.partnerships set status = 'ended', ended_at = now()
  where id = p and status in ('pending','active') and auth.uid() in (user_a, user_b)
  returning * into pr;
  if not found then raise exception 'no open pact' using errcode = 'P0002'; end if;
  -- Unscored current week is dropped; the ledger stays as history.
  delete from public.weekly_goals where partnership_id = p and result = 'pending';
  perform public.notify(case when pr.user_a = auth.uid() then pr.user_b else pr.user_a end,
    'pact_ended', public.me_card() || jsonb_build_object('partnership_id', p));
end $$;

create function public.settle_stake(ledger_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.stake_ledger;
begin
  update public.stake_ledger set settled = true, settled_at = now()
  where id = ledger_id and creditor_id = auth.uid() and not settled
  returning * into l;
  if not found then raise exception 'only the person owed can settle' using errcode = '42501'; end if;
  perform public.notify(l.debtor_id, 'stake_settled', public.me_card() ||
    jsonb_build_object('ledger_id', l.id, 'stake', l.stake, 'partnership_id', l.partnership_id));
end $$;

-- ---------- weekly close (pg_cron, hourly) ----------
create function public.close_weeks() returns int
language plpgsql security definer set search_path = '' as $$
declare
  due record; g record; closed int := 0; both_hit bool; results jsonb;
begin
  loop
    select p.id, p.user_a, p.user_b, p.timezone, gw.week_start into due
    from public.weekly_goals gw join public.partnerships p on p.id = gw.partnership_id
    where gw.result = 'pending' and p.status = 'active'
      and public.week_close(gw.week_start, p.timezone) <= now()
    order by gw.week_start limit 1;
    exit when not found;

    both_hit := true; results := '[]';
    for g in select * from public.weekly_goals
             where partnership_id = due.id and week_start = due.week_start for update loop
      g.days_done := public.days_done(g.user_id, due.week_start, due.timezone);
      g.result := case when g.days_done >= g.goal_days then 'hit' else 'missed' end;
      update public.weekly_goals set days_done = g.days_done, result = g.result
      where partnership_id = g.partnership_id and user_id = g.user_id and week_start = g.week_start;

      if g.result = 'hit' then
        perform public.award_points(g.user_id, 20, 'goal_hit', due.id);
      else
        both_hit := false;
        insert into public.stake_ledger (partnership_id, debtor_id, creditor_id, stake, week_start)
        values (due.id, g.user_id, case when g.user_id = due.user_a then due.user_b else due.user_a end,
                g.stake, due.week_start);
      end if;

      -- Carry the goal forward unless the user already set next week's.
      insert into public.weekly_goals (partnership_id, user_id, week_start, goal_days, stake)
      values (due.id, g.user_id, due.week_start + 7, g.goal_days, g.stake)
      on conflict do nothing;

      results := results || jsonb_build_object('user_id', g.user_id, 'days_done', g.days_done,
        'goal_days', g.goal_days, 'result', g.result, 'stake', g.stake);
    end loop;

    update public.partnerships set streak = case when both_hit then streak + 1 else 0 end where id = due.id;
    perform public.notify(u, 'week_result', jsonb_build_object(
      'partnership_id', due.id, 'week_start', due.week_start, 'results', results))
    from unnest(array[due.user_a, due.user_b]) u;
    closed := closed + 1;
  end loop;
  return closed;
end $$;

-- ---------- workout done → partner check-in + daily points ----------
create function public.on_workout_done() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.done_at is null or (tg_op = 'UPDATE' and old.done_at is not null) then return new; end if;

  insert into public.notifications (user_id, type, payload)
  select partner, 'partner_checkin', public.me_card() || jsonb_build_object('partnership_id', p.id, 'workout_id', new.id)
  from public.partnerships p
  cross join lateral (select case when p.user_a = new.user_id then p.user_b else p.user_a end as partner) x
  where p.status = 'active' and new.user_id in (p.user_a, p.user_b)
    and not exists (select 1 from public.notifications n
      where n.user_id = x.partner and n.type = 'partner_checkin'
        and n.payload->>'id' = new.user_id::text and n.created_at > now() - interval '20 hours');

  if not exists (select 1 from public.points_ledger
                 where user_id = new.user_id and reason = 'workout' and created_at > now() - interval '20 hours') then
    perform public.award_points(new.user_id, 5, 'workout', new.id);
  end if;
  return new;
end $$;
create trigger workouts_done_effects after insert or update of status on public.workouts
  for each row execute function public.on_workout_done();

-- ---------- privileges ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_partner(uuid, uuid), public.is_wager_participant(uuid),
  public.week_start_of(timestamptz, text), public.week_close(date, text), public.credit_date(timestamptz, timestamptz, text),
  public.pact_week_days(uuid, date),
  public.create_pact(text, int, text, text), public.respond_pact(uuid, bool, int, text),
  public.set_goal(uuid, int, text), public.end_pact(uuid), public.settle_stake(uuid)
to authenticated;
