-- Auralyx social foundation: profiles, friendships, and "Listening to..." status.
-- Run this in Supabase SQL Editor before using the friend activity panel.

create extension if not exists pgcrypto;

create table if not exists public.app_profiles (
  id text primary key,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_profiles(id) on delete cascade,
  friend_id text not null references public.app_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.app_profiles(id) on delete cascade,
  receiver_id text not null references public.app_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (sender_id <> receiver_id),
  constraint friend_requests_unique_pair unique (sender_id, receiver_id)
);

create table if not exists public.listening_status (
  user_id text primary key references public.app_profiles(id) on delete cascade,
  track_id text,
  title text,
  artist text,
  album text,
  cover_url text,
  is_playing boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;
alter table public.listening_status enable row level security;

drop policy if exists "Profiles are readable" on public.app_profiles;
create policy "Profiles are readable"
  on public.app_profiles for select
  to anon
  using (true);

drop policy if exists "Friendships are readable" on public.friendships;
create policy "Friendships are readable"
  on public.friendships for select
  to anon
  using (true);

drop policy if exists "Friend requests are readable" on public.friend_requests;
create policy "Friend requests are readable"
  on public.friend_requests for select
  to anon
  using (true);

drop policy if exists "Listening status is readable" on public.listening_status;
create policy "Listening status is readable"
  on public.listening_status for select
  to anon
  using (true);

-- These write policies are intentionally permissive for the current custom JWT auth prototype.
-- Move writes behind the Express API with a Supabase service-role key before relying on this in production.
drop policy if exists "App can upsert profiles" on public.app_profiles;
create policy "App can upsert profiles"
  on public.app_profiles for all
  to anon
  using (true)
  with check (true);

drop policy if exists "App can write friendships" on public.friendships;
create policy "App can write friendships"
  on public.friendships for all
  to anon
  using (true)
  with check (true);

drop policy if exists "App can write friend requests" on public.friend_requests;
create policy "App can write friend requests"
  on public.friend_requests for all
  to anon
  using (true)
  with check (true);

drop policy if exists "App can write listening status" on public.listening_status;
create policy "App can write listening status"
  on public.listening_status for all
  to anon
  using (true)
  with check (true);

create index if not exists friendships_user_id_idx on public.friendships(user_id);
create index if not exists friendships_friend_id_idx on public.friendships(friend_id);
create index if not exists listening_status_updated_at_idx on public.listening_status(updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'listening_status'
  ) then
    alter publication supabase_realtime add table public.listening_status;
  end if;
end
$$;
