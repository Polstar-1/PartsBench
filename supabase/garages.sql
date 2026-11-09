-- Parts Bench: one Garage per account.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.garages (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{"vehicles":[],"activeId":null}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint garages_size check (pg_column_size(data) < 1000000)
);

-- Each person can only ever see and change their own row.
alter table public.garages enable row level security;

drop policy if exists "garage read own"   on public.garages;
drop policy if exists "garage insert own" on public.garages;
drop policy if exists "garage update own" on public.garages;
drop policy if exists "garage delete own" on public.garages;

create policy "garage read own" on public.garages
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "garage insert own" on public.garages
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "garage update own" on public.garages
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "garage delete own" on public.garages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The server stamps the time, so devices with wrong clocks can't confuse the sync.
create or replace function public.touch_garage()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists garages_touch on public.garages;
create trigger garages_touch
  before insert or update on public.garages
  for each row execute function public.touch_garage();
