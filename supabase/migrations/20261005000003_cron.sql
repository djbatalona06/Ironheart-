-- Scheduled jobs (pg_cron). On hosted Supabase, enable the pg_cron extension
-- first (Database → Extensions) if this migration errors.
create extension if not exists pg_cron;

select cron.schedule('close-weeks', '5 * * * *', $$select public.close_weeks()$$);
