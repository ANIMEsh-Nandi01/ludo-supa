-- ============================================================
-- Migration 003: Allow Room Players to Insert & Update Games
-- and expand status constraint to accept both waiting/lobby/playing
-- ============================================================

-- 1. Expand rooms status check constraint so both 'waiting' and 'lobby' are valid
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check 
  check (status in ('waiting', 'lobby', 'playing', 'in_game', 'finished'));

-- 2. Allow room players to create and update games directly
drop policy if exists "games: service role can insert" on public.games;
drop policy if exists "games: service role can update" on public.games;
drop policy if exists "games: room players can insert" on public.games;
drop policy if exists "games: room players can update" on public.games;

create policy "games: room players can insert"
  on public.games for insert
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.room_players
      where room_id = games.room_id and user_id = auth.uid()
    )
  );

create policy "games: room players can update"
  on public.games for update
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.room_players
      where room_id = games.room_id and user_id = auth.uid()
    )
  );
