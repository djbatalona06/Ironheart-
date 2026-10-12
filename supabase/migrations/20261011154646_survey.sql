-- Onboarding quick-start survey: optional answers kept in one jsonb object so
-- adding a question later needs no migration. Validated by zod in the server action.
alter table public.profiles
  add column survey jsonb check (survey is null or jsonb_typeof(survey) = 'object');
