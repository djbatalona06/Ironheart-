-- Challenges (metric wagers), gifts, chat notifications. docs/08 Parts 2–4.

-- ---------- metrics ----------
create function public.challenge_value(uid uuid, metric text, t0 timestamptz, t1 timestamptz) returns numeric
language sql stable security definer set search_path = '' as $$
  select case metric
    when 'workouts_count' then (select count(*) from public.workouts
      where user_id = uid and status = 'done' and started_at >= t0 and started_at < t1)
    when 'total_volume' then (select coalesce(sum(s.reps * s.weight_kg), 0) from public.workout_sets s
      join public.workouts w on w.id = s.workout_id
      where w.user_id = uid and w.status = 'done' and s.completed and w.started_at >= t0 and w.started_at < t1)
    when 'streak' then (select coalesce(max(len), 0) from (
      -- gaps-and-islands: consecutive training days share (day - row_number)
      select count(*) as len from (
        select d, d - (row_number() over (order by d))::int as grp
        from (select distinct (started_at at time zone 'UTC')::date as d from public.workouts
              where user_id = uid and status = 'done' and started_at >= t0 and started_at < t1) days) g
      group by grp) islands)
    when 'macro_hit' then (select count(*) from (
      select logged_at::date from public.nutrition_logs n
      where n.user_id = uid and n.logged_at >= t0 and n.logged_at < t1
      group by logged_at::date
      having sum(protein_g) >= (select protein_g_goal from public.profiles where id = uid)) hits)
  end
$$;

-- ---------- RPCs ----------
create function public.create_challenge(title text, description text, metric text,
  starts_at timestamptz, ends_at timestamptz, invitee_handle text, target numeric default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitee uuid; wid uuid;
begin
  select id into invitee from public.profiles where handle = lower(trim(invitee_handle));
  if invitee is null then raise exception 'no user @%', invitee_handle using errcode = 'P0002'; end if;
  if invitee = auth.uid() then raise exception 'challenge someone else' using errcode = '22023'; end if;
  if ends_at <= greatest(starts_at, now()) then raise exception 'end must be in the future' using errcode = '22023'; end if;
  insert into public.wagers (creator_id, title, description, metric, target, starts_at, ends_at)
  values (auth.uid(), trim(title), nullif(trim(description), ''), metric, target, starts_at, ends_at) returning id into wid;
  insert into public.wager_participants (wager_id, user_id, accepted) values (wid, auth.uid(), true), (wid, invitee, false);
  perform public.notify(invitee, 'wager_invite', public.me_card() || jsonb_build_object('wager_id', wid, 'title', trim(title)));
  return wid;
end $$;

create function public.respond_challenge(w uuid, accept bool) returns void
language plpgsql security definer set search_path = '' as $$
declare wg public.wagers;
begin
  select * into wg from public.wagers where id = w and status = 'pending';
  if not found or not exists (select 1 from public.wager_participants
      where wager_id = w and user_id = auth.uid() and not accepted) then
    raise exception 'no pending invite' using errcode = 'P0002';
  end if;
  if accept then
    update public.wager_participants set accepted = true where wager_id = w and user_id = auth.uid();
    update public.wagers set status = 'active' where id = w
      and not exists (select 1 from public.wager_participants where wager_id = w and not accepted);
    perform public.notify(wg.creator_id, 'wager_accepted', public.me_card() || jsonb_build_object('wager_id', w, 'title', wg.title));
  else
    update public.wagers set status = 'declined' where id = w;
    perform public.notify(wg.creator_id, 'wager_result', public.me_card() || jsonb_build_object('wager_id', w, 'title', wg.title, 'declined', true));
  end if;
end $$;

-- Refresh one challenge's progress (called when its page is opened).
create function public.refresh_challenge(w uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_wager_participant(w) then raise exception 'not a participant' using errcode = '42501'; end if;
  update public.wager_participants p set current_value = public.challenge_value(p.user_id, wg.metric, wg.starts_at, least(wg.ends_at, now()))
  from public.wagers wg where wg.id = w and p.wager_id = w and wg.status = 'active';
end $$;

-- Hourly: refresh active challenges, close finished ones, expire stale invites.
create function public.recompute_challenges() returns int
language plpgsql security definer set search_path = '' as $$
declare wg record; top numeric; winners uuid[]; closed int := 0;
begin
  update public.wagers set status = 'declined' where status = 'pending' and ends_at <= now();

  update public.wager_participants p set current_value = public.challenge_value(p.user_id, w.metric, w.starts_at, least(w.ends_at, now()))
  from public.wagers w where w.id = p.wager_id and w.status = 'active';

  for wg in select * from public.wagers where status = 'active' and ends_at <= now() for update loop
    select max(current_value) into top from public.wager_participants where wager_id = wg.id;
    select array_agg(user_id) into winners from public.wager_participants where wager_id = wg.id and current_value = top;
    update public.wagers set status = 'completed',
      winner_id = case when cardinality(winners) = 1 and top > 0 then winners[1] end where id = wg.id;
    if cardinality(winners) = 1 and top > 0 then perform public.award_points(winners[1], 50, 'challenge_win', wg.id); end if;
    perform public.notify(p.user_id, 'wager_result', jsonb_build_object('wager_id', wg.id, 'title', wg.title,
      'winner_id', case when cardinality(winners) = 1 and top > 0 then winners[1] end))
    from public.wager_participants p where p.wager_id = wg.id;
    closed := closed + 1;
  end loop;
  return closed;
end $$;

-- ---------- gifts ----------
-- Spend points on a gift for a partner or challenge opponent. Atomic: balance check + deduct + insert.
create function public.send_gift(to_user uuid, gift uuid, wager uuid default null, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare price int; balance int;
begin
  if to_user = auth.uid() then raise exception 'you cannot gift yourself' using errcode = '22023'; end if;
  if not public.is_partner(auth.uid(), to_user) and not exists (
      select 1 from public.wager_participants a join public.wager_participants b on a.wager_id = b.wager_id
      where a.user_id = auth.uid() and b.user_id = to_user) then
    raise exception 'you can only gift partners and challenge opponents' using errcode = '42501';
  end if;
  select cost into price from public.gifts where id = gift;
  if price is null then raise exception 'unknown gift' using errcode = 'P0002'; end if;
  select points into balance from public.profiles where id = auth.uid() for update;
  if balance < price then raise exception 'not enough points (% of %)', balance, price using errcode = '22023'; end if;

  perform public.award_points(auth.uid(), -price, 'gift_sent', gift);
  insert into public.user_gifts (from_user_id, to_user_id, gift_id, wager_id, message)
  values (auth.uid(), to_user, gift, wager, nullif(left(trim(note), 140), ''));
  perform public.notify(to_user, 'gift_received', public.me_card() ||
    jsonb_build_object('gift', (select name from public.gifts where id = gift), 'message', nullif(left(trim(note), 140), '')));
end $$;

-- ---------- chat → notification (one unread per challenge per person) ----------
create function public.on_wager_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.user_id, 'partner_message', public.me_card() || jsonb_build_object('wager_id', new.wager_id, 'text', left(new.text, 80))
  from public.wager_participants p
  where p.wager_id = new.wager_id and p.user_id <> new.user_id
    and not exists (select 1 from public.notifications n where n.user_id = p.user_id and not n.read
      and n.type = 'partner_message' and n.payload->>'wager_id' = new.wager_id::text);
  return new;
end $$;
create trigger wager_message_notify after insert on public.wager_messages
  for each row execute function public.on_wager_message();

-- Mark-all-read without a round trip per row.
create function public.mark_all_read() returns void
language sql security invoker set search_path = '' as $$
  update public.notifications set read = true where user_id = auth.uid() and not read
$$;

revoke execute on function public.challenge_value(uuid, text, timestamptz, timestamptz), public.recompute_challenges(),
  public.on_wager_message() from public, anon, authenticated;
grant execute on function public.create_challenge(text, text, text, timestamptz, timestamptz, text, numeric),
  public.respond_challenge(uuid, bool), public.refresh_challenge(uuid), public.send_gift(uuid, uuid, uuid, text),
  public.mark_all_read() to authenticated;

select cron.schedule('recompute-challenges', '10 * * * *', $$select public.recompute_challenges()$$);

-- New functions default to EXECUTE for PUBLIC/anon; nothing here is for signed-out users.
revoke execute on all functions in schema public from public, anon;
