-- Parts Bench: email maintenance reminders.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- Who has reminders switched on. People can read and change their own row.
create table if not exists public.reminder_prefs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.reminder_prefs enable row level security;

drop policy if exists "reminder prefs read own"   on public.reminder_prefs;
drop policy if exists "reminder prefs insert own" on public.reminder_prefs;
drop policy if exists "reminder prefs update own" on public.reminder_prefs;

create policy "reminder prefs read own" on public.reminder_prefs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "reminder prefs insert own" on public.reminder_prefs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reminder prefs update own" on public.reminder_prefs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- What has already been emailed, so nobody gets the same reminder twice.
-- No policies at all: only the server (with the secret key) can touch it.
create table if not exists public.reminder_log (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  sent      jsonb not null default '{}'::jsonb,
  last_test timestamptz
);

alter table public.reminder_log enable row level security;
