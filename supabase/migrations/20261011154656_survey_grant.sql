-- Onboarding writes profiles.survey, but the column-level UPDATE grant in the schema
-- predates that column, so every onboarding submit failed with "permission denied".
grant update (survey) on public.profiles to authenticated;
