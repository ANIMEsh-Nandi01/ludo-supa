-- ============================================================
-- Migration 002: pg_cron scheduled jobs
-- ============================================================
-- Note: pg_cron runs in the postgres database; jobs are defined here
-- and reference the public schema tables.

-- Ensure pg_cron extension is enabled (may already be from migration 001)
create extension if not exists pg_cron;

-- Grant usage on cron schema to postgres role (required by pg_cron)
grant usage on schema cron to postgres;

-- ----------------------------------------------------------------
-- Job 1: turn-timeout-check — every minute
-- Mark games as timeout_pending when turn_deadline has passed
-- ----------------------------------------------------------------
select cron.schedule(
  'turn-timeout-check',
  '* * * * *',
  $$
    update public.games
    set
      status = 'timeout_pending',
      updated_at = now()
    where
      status = 'active'
      and turn_deadline is not null
      and turn_deadline < now() - interval '5 seconds';
  $$
);

-- ----------------------------------------------------------------
-- Job 2: cleanup-old-rooms — daily at 3am
-- Delete finished rooms older than 30 days (cascades to game_moves,
-- games, room_players, messages via foreign-key on delete cascade)
-- ----------------------------------------------------------------
select cron.schedule(
  'cleanup-old-rooms',
  '0 3 * * *',
  $$
    delete from public.rooms
    where
      status = 'finished'
      and updated_at < now() - interval '30 days';
  $$
);

-- ----------------------------------------------------------------
-- Job 3: cleanup-old-messages — daily at 4am
-- Delete messages in rooms that have been finished and older than 30 days
-- (belt-and-suspenders in case cascade didn't fire for some reason)
-- ----------------------------------------------------------------
select cron.schedule(
  'cleanup-old-messages',
  '0 4 * * *',
  $$
    delete from public.messages
    where room_id in (
      select id from public.rooms
      where
        status = 'finished'
        and updated_at < now() - interval '30 days'
    );
  $$
);
