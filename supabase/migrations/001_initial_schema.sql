-- ============================================================
-- Migration 001: Initial Schema
-- ============================================================

-- ----------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ----------------------------------------------------------------
-- Helper: generate a random alphanumeric string of given length
-- ----------------------------------------------------------------
create or replace function generate_room_code(len int default 6)
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..len loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ----------------------------------------------------------------
-- Table: profiles
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default 'Player',
  avatar_url      text,
  games_played    int not null default 0,
  wins            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: anyone can view"
  on public.profiles for select
  using (true);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: owner can insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ----------------------------------------------------------------
-- Table: rooms
-- ----------------------------------------------------------------
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  host_id     uuid not null references public.profiles(id) on delete cascade,
  max_players int not null default 4 check (max_players between 2 and 4),
  type        text not null default 'public' check (type in ('public', 'private')),
  status      text not null default 'waiting' check (status in ('waiting', 'lobby', 'playing', 'in_game', 'finished')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "rooms: anyone can view"
  on public.rooms for select
  using (true);

create policy "rooms: authenticated can insert"
  on public.rooms for insert
  with check (auth.uid() = host_id);

create policy "rooms: host can update"
  on public.rooms for update
  using (auth.uid() = host_id);

create policy "rooms: host can delete"
  on public.rooms for delete
  using (auth.uid() = host_id);

-- ----------------------------------------------------------------
-- Table: room_players
-- ----------------------------------------------------------------
create table if not exists public.room_players (
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  color       text check (color in ('red', 'green', 'yellow', 'blue')),
  is_ready    boolean not null default false,
  seat_order  int not null,
  joined_at   timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_players enable row level security;

create policy "room_players: anyone can view"
  on public.room_players for select
  using (true);

create policy "room_players: authenticated can join"
  on public.room_players for insert
  with check (auth.uid() = user_id);

create policy "room_players: player can update own row"
  on public.room_players for update
  using (auth.uid() = user_id);

create policy "room_players: player or host can delete"
  on public.room_players for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select host_id from public.rooms where id = room_id)
  );

-- ----------------------------------------------------------------
-- Table: games
-- ----------------------------------------------------------------
create table if not exists public.games (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid not null references public.rooms(id) on delete cascade,
  state               jsonb not null default '{}',
  status              text not null default 'active' check (status in ('active', 'timeout_pending', 'finished')),
  consecutive_sixes   int not null default 0,
  turn_deadline       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games: anyone can view"
  on public.games for select
  using (true);

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

-- ----------------------------------------------------------------
-- Table: game_moves
-- ----------------------------------------------------------------
create table if not exists public.game_moves (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.games(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  move_type     text not null check (move_type in ('roll', 'move', 'capture', 'win', 'timeout', 'skip')),
  roll_value    int check (roll_value between 1 and 6),
  token_index   int check (token_index between 0 and 3),
  from_step     int,
  to_step       int,
  captures      jsonb default '[]',
  state_snapshot jsonb,
  created_at    timestamptz not null default now()
);

alter table public.game_moves enable row level security;

create policy "game_moves: anyone can view"
  on public.game_moves for select
  using (true);

create policy "game_moves: service role can insert"
  on public.game_moves for insert
  with check (auth.role() = 'service_role');

-- ----------------------------------------------------------------
-- Table: messages
-- ----------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Rate limit: max 5 messages per 5 seconds per user per room
create or replace function public.check_message_rate(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select count(*) < 5
  from public.messages
  where room_id = p_room_id
    and user_id = p_user_id
    and created_at > now() - interval '5 seconds';
$$;

create policy "messages: room members can view"
  on public.messages for select
  using (
    exists (
      select 1 from public.room_players
      where room_id = messages.room_id
        and user_id = auth.uid()
    )
  );

create policy "messages: room members can insert with rate limit"
  on public.messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_players
      where room_id = messages.room_id
        and user_id = auth.uid()
    )
    and public.check_message_rate(room_id, auth.uid())
  );

create policy "messages: owner can delete"
  on public.messages for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Table: matchmaking_queue
-- ----------------------------------------------------------------
create table if not exists public.matchmaking_queue (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  player_count  int not null check (player_count between 2 and 4),
  voice_on      boolean not null default false,
  joined_at     timestamptz not null default now()
);

alter table public.matchmaking_queue enable row level security;

create policy "matchmaking_queue: service role full access"
  on public.matchmaking_queue for all
  using (auth.role() = 'service_role');

create policy "matchmaking_queue: user can view own entry"
  on public.matchmaking_queue for select
  using (auth.uid() = user_id);

create policy "matchmaking_queue: user can upsert own entry"
  on public.matchmaking_queue for insert
  with check (auth.uid() = user_id);

create policy "matchmaking_queue: user can delete own entry"
  on public.matchmaking_queue for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Table: reports
-- ----------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  reported_id   uuid not null references public.profiles(id) on delete cascade,
  room_id       uuid references public.rooms(id) on delete set null,
  reason        text not null check (char_length(reason) between 1 and 1000),
  created_at    timestamptz not null default now(),
  constraint no_self_report check (reporter_id <> reported_id)
);

alter table public.reports enable row level security;

create policy "reports: authenticated can insert"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports: reporter can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ----------------------------------------------------------------
-- Table: blocks
-- ----------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks: user can view own blocks"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "blocks: user can insert own blocks"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "blocks: user can delete own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- ----------------------------------------------------------------
-- Trigger: auto-create profile on new user sign-up
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
begin
  -- Use user's email prefix, or metadata name, or fallback to 'Player'
  display := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'Player'
  );
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    display,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
create index if not exists idx_messages_room_created
  on public.messages (room_id, created_at desc);

create index if not exists idx_games_room_id
  on public.games (room_id);

create index if not exists idx_room_players_room_id
  on public.room_players (room_id);

create index if not exists idx_game_moves_game_id
  on public.game_moves (game_id);

create index if not exists idx_matchmaking_queue_player_count
  on public.matchmaking_queue (player_count, joined_at);

create index if not exists idx_rooms_code
  on public.rooms (code);

create index if not exists idx_rooms_status
  on public.rooms (status, created_at);

-- ----------------------------------------------------------------
-- Updated-at trigger helper
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_rooms_updated_at
  before update on public.rooms
  for each row execute procedure public.set_updated_at();

create or replace trigger set_games_updated_at
  before update on public.games
  for each row execute procedure public.set_updated_at();

create or replace trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------
-- Realtime: Enable postgres_changes broadcasting
-- ----------------------------------------------------------------
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.messages;

