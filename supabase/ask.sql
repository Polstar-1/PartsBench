-- Ask tab: counts questions per person per day (and overall) so the AI bill can't run away.
-- Safe to run more than once. Only the server (service role key) can touch these.
create table if not exists public.ask_usage (
  scope text not null,          -- a person's id, or 'global'
  day   date not null,
  count integer not null default 0,
  primary key (scope, day)
);
alter table public.ask_usage enable row level security;   -- no policies: the browser can't read or write it

-- Adds one to today's count unless that would pass the limit. Returns the new count, or -1 when over the limit.
create or replace function public.ask_bump(p_scope text, p_day date, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.ask_usage (scope, day, count) values (p_scope, p_day, 1)
  on conflict (scope, day) do update set count = public.ask_usage.count + 1
  where public.ask_usage.count < p_limit
  returning count into n;
  if n is null then return -1; end if;
  return n;
end $$;

-- Gives a question back (used when the AI service fails, so the person isn't charged a question for nothing).
create or replace function public.ask_refund(p_scope text, p_day date)
returns void language sql security definer set search_path = public as $$
  update public.ask_usage set count = greatest(count - 1, 0) where scope = p_scope and day = p_day;
$$;

revoke all on function public.ask_bump(text, date, integer) from public, anon, authenticated;
revoke all on function public.ask_refund(text, date) from public, anon, authenticated;
grant execute on function public.ask_bump(text, date, integer) to service_role;
grant execute on function public.ask_refund(text, date) to service_role;
