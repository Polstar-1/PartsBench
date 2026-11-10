-- Parts Bench: who has Premium.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- People can READ their own row (so the app knows to show Premium) but can never write one.
-- Only you can add or remove rows: here in the dashboard, or later from the payment webhook.

create table if not exists public.premium (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  active     boolean not null default true,
  until      timestamptz,                       -- empty = no end date. Later, a subscription sets this.
  note       text,                              -- your own reminder (e.g. "founder", "gift")
  created_at timestamptz not null default now()
);

alter table public.premium enable row level security;

drop policy if exists "premium read own" on public.premium;
create policy "premium read own" on public.premium
  for select to authenticated using ((select auth.uid()) = user_id);

-- Deliberately no insert / update / delete policies: the app itself can't grant Premium.
