-- Display names. One row per account, created the first time someone saves.
-- Anyone signed in can read a profile so project members can see each other.
-- A person can only write their own row.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  display_name text not null default '',
  updated_at timestamptz not null default now(),
  constraint nickname_length check (char_length(nickname) <= 40),
  constraint display_name_length check (char_length(display_name) <= 80)
);

alter table public.profiles enable row level security;

drop policy if exists "signed in users read profiles" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "signed in users read profiles"
on public.profiles
for select
using (auth.uid() is not null);

create policy "users insert own profile"
on public.profiles
for insert
with check (user_id = auth.uid());

create policy "users update own profile"
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
