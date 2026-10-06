-- Nutrition: unique seed food names (idempotent seeding) + protein-goal points.
create unique index foods_seed_name on public.foods(name) where created_by is null;

-- +3 points the first time each day a user's logs reach their protein goal (docs/08 Part 3).
-- ponytail: "day" is the UTC date of logged_at; use the user's timezone if it ever matters.
create function public.on_nutrition_logged() returns trigger
language plpgsql security definer set search_path = '' as $$
declare goal int; total numeric;
begin
  select protein_g_goal into goal from public.profiles where id = new.user_id;
  if goal is null then return new; end if;
  select coalesce(sum(protein_g), 0) into total from public.nutrition_logs
  where user_id = new.user_id and logged_at::date = new.logged_at::date;
  if total >= goal and not exists (select 1 from public.points_ledger
      where user_id = new.user_id and reason = 'macro_hit' and created_at::date = new.logged_at::date) then
    perform public.award_points(new.user_id, 3, 'macro_hit', new.id);
  end if;
  return new;
end $$;
create trigger nutrition_points after insert on public.nutrition_logs
  for each row execute function public.on_nutrition_logged();
revoke execute on function public.on_nutrition_logged() from public, anon, authenticated;
