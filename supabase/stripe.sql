-- Parts Bench: paid Premium (Stripe).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. (Run supabase/premium.sql first.)
-- These columns are filled in by the payment webhook. People can't edit them (the premium table has no write rules).

alter table public.premium add column if not exists stripe_customer     text;
alter table public.premium add column if not exists stripe_subscription text;
alter table public.premium add column if not exists stripe_updated      bigint not null default 0;

create index if not exists premium_stripe_customer_idx on public.premium (stripe_customer);
