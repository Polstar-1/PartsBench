-- Parts Bench: Ideas board (public) + support messages (private).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- How you manage it afterwards (Supabase > Table Editor, no code needed):
--   ideas            set "status" to planned / done / hidden, or type a "reply" people will see
--   support_messages read what people sent, set "status" to answered / closed

-- ---------------------------------------------------------------- ideas
create table if not exists public.ideas (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  category    text not null default 'feature' check (category in ('feature', 'parts', 'maintenance', 'bug', 'other')),
  title       text not null check (char_length(title) between 3 and 80),
  body        text not null default '' check (char_length(body) <= 1000),
  status      text not null default 'open' check (status in ('open', 'planned', 'done', 'hidden')),
  reply       text check (reply is null or char_length(reply) <= 500),
  votes       integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint ideas_author_len check (char_length(author_name) <= 30)
);
create index if not exists ideas_top_idx on public.ideas (votes desc, created_at desc);

create table if not exists public.idea_votes (
  idea_id    bigint not null references public.ideas (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

-- ------------------------------------------------------ support messages
create table if not exists public.support_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email      text not null default coalesce(auth.jwt() ->> 'email', ''),
  topic      text not null default 'question' check (topic in ('question', 'problem', 'account', 'other')),
  body       text not null check (char_length(body) between 5 and 2000),
  status     text not null default 'new' check (status in ('new', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- rules
alter table public.ideas            enable row level security;
alter table public.idea_votes       enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "ideas read"          on public.ideas;
drop policy if exists "ideas insert own"    on public.ideas;
drop policy if exists "ideas delete own"    on public.ideas;
drop policy if exists "votes read own"      on public.idea_votes;
drop policy if exists "votes insert own"    on public.idea_votes;
drop policy if exists "votes delete own"    on public.idea_votes;
drop policy if exists "support insert own"  on public.support_messages;
drop policy if exists "support read own"    on public.support_messages;

-- Anyone can read the board (hidden ideas stay visible only to whoever posted them).
create policy "ideas read" on public.ideas
  for select to anon, authenticated
  using (status <> 'hidden' or user_id = (select auth.uid()));

-- Signed-in people post as themselves. They can't set their own status, reply or vote count.
create policy "ideas insert own" on public.ideas
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'open' and votes = 0 and reply is null);

create policy "ideas delete own" on public.ideas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- One vote per person per idea (the primary key enforces it). Votes are private.
create policy "votes read own" on public.idea_votes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "votes insert own" on public.idea_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "votes delete own" on public.idea_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Support messages: you can send one and see your own. Only you (in the dashboard) see everyone's.
create policy "support insert own" on public.support_messages
  for insert to authenticated with check ((select auth.uid()) = user_id and status = 'new');
create policy "support read own" on public.support_messages
  for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.ideas to anon, authenticated;
grant insert, delete on public.ideas to authenticated;
grant select, insert, delete on public.idea_votes to authenticated;
grant select, insert on public.support_messages to authenticated;

-- --------------------------------------------------------------- helpers
-- Keeps the vote count on each idea correct. Runs with its own permission,
-- because people are not allowed to edit the count themselves.
create or replace function public.bump_idea_votes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.ideas set votes = votes + 1 where id = new.idea_id;
  elsif tg_op = 'DELETE' then
    update public.ideas set votes = greatest(votes - 1, 0) where id = old.idea_id;
  end if;
  return null;
end;
$$;

drop trigger if exists idea_votes_count on public.idea_votes;
create trigger idea_votes_count
  after insert or delete on public.idea_votes
  for each row execute function public.bump_idea_votes();

-- At most 5 ideas and 5 support messages per person per day, so one person can't flood the board.
create or replace function public.limit_daily_posts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''24 hours''', tg_table_name)
    into n using new.user_id;
  if n >= 5 then
    raise exception 'daily limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists ideas_daily_limit on public.ideas;
create trigger ideas_daily_limit
  before insert on public.ideas
  for each row execute function public.limit_daily_posts();

drop trigger if exists support_daily_limit on public.support_messages;
create trigger support_daily_limit
  before insert on public.support_messages
  for each row execute function public.limit_daily_posts();
