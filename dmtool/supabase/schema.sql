-- Supabase schema for the DM tool MVP
-- Uses user-scoped campaign/session/note/tag tables and a many-to-many note_tags join

create extension if not exists pgcrypto;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  description text,
  ingame_day integer,
  ingame_month integer,
  ingame_year integer,
  ingame_hour integer,
  ingame_minute integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  in_game_date date,
  in_game_time time,
  in_game_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  title text not null,
  content text,
  ingame_day integer,
  ingame_hour integer,
  ingame_minute integer,
  ingame_end_day integer,
  ingame_end_hour integer,
  ingame_end_minute integer,
  in_game_date date,
  in_game_time time,
  in_game_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes
  add column if not exists ingame_day integer,
  add column if not exists ingame_hour integer,
  add column if not exists ingame_minute integer,
  add column if not exists ingame_end_day integer,
  add column if not exists ingame_end_hour integer,
  add column if not exists ingame_end_minute integer;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  created_at timestamptz not null default now(),
  constraint tags_user_name_unique unique (user_id, name)
);

create table if not exists note_tags (
  note_id uuid not null references notes(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

-- Recommended Supabase RLS policies
-- Enable RLS for all user-owned tables:
alter table campaigns enable row level security;
alter table sessions enable row level security;
alter table notes enable row level security;
alter table tags enable row level security;
alter table note_tags enable row level security;

-- Core policy pattern: allow each authenticated user to access only their own records.
-- For campaigns:
create policy "Users can manage own campaigns" on campaigns
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- For sessions:
create policy "Users can manage own sessions" on sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- For notes:
create policy "Users can manage own notes" on notes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- For tags:
create policy "Users can manage own tags" on tags
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- For note_tags:
create policy "Users can manage own note_tags" on note_tags
  for all
  using (
    exists (
      select 1
      from notes n
      where n.id = note_tags.note_id
      and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from notes n
      where n.id = note_tags.note_id
      and n.user_id = auth.uid()
    )
  );
--       where n.id = note_tags.note_id
--         and t.id = note_tags.tag_id
--         and n.user_id = auth.uid()
--         and t.user_id = auth.uid()
--     )
--   )
--   with check (
--     exists (
--       select 1
--       from notes n
--       join tags t on t.id = note_tags.tag_id
--       where n.id = note_tags.note_id
--         and t.id = note_tags.tag_id
--         and n.user_id = auth.uid()
--         and t.user_id = auth.uid()
--     )
--   );

-- Note: note_tags does not need its own user_id if the RLS policy enforces that joined notes and tags belong to auth.uid().
