-- Somehow I Manage · sync schema for Supabase. Paste into the SQL editor and run once.
-- Every account gets its own rows; the app reads rows with seq > its cursor and pushes its
-- outbox through sync_push(), which keeps the newest version of each record.

create sequence if not exists public.sync_seq;

create table if not exists public.sync_records (
  user_id    uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id         text   not null,
  kind       text   not null check (kind in ('person', 'item', 'project')),
  data       jsonb,                 -- the record as JSON; JSON null for a tombstone
  updated_at bigint not null,       -- version: the device's clock (ms) when it made the change
  deleted_at bigint,                -- set = tombstone
  seq        bigint not null default nextval('public.sync_seq'),
  primary key (user_id, id)
);
create index if not exists sync_records_user_seq on public.sync_records (user_id, seq);

-- The kinds grow with the app (projects arrived 2026-10-03); an older table gets the new list.
alter table public.sync_records drop constraint if exists sync_records_kind_check;
alter table public.sync_records
  add constraint sync_records_kind_check check (kind in ('person', 'item', 'project'));

alter table public.sync_records enable row level security;
drop policy if exists "own rows" on public.sync_records;
create policy "own rows" on public.sync_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Last write wins, decided here so a device with stale data cannot overwrite newer data.
create or replace function public.sync_push(changes jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.sync_records as r (user_id, id, kind, data, updated_at, deleted_at)
  select auth.uid(),
         c->>'id',
         c->>'kind',
         c->'data',
         (c->>'updated_at')::bigint,
         (c->>'deleted_at')::bigint
  from jsonb_array_elements(changes) as c
  on conflict (user_id, id) do update
    set data       = excluded.data,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        seq        = nextval('public.sync_seq')
    where excluded.updated_at >= r.updated_at;
$$;
-- Postgres grants EXECUTE to PUBLIC by default; take it back so only signed-in users can call it.
revoke execute on function public.sync_push(jsonb) from public, anon;
grant  execute on function public.sync_push(jsonb) to authenticated;

-- Realtime: other devices learn about a change the moment it lands.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sync_records'
  ) then
    alter publication supabase_realtime add table public.sync_records;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Finding out what works (docs/LAUNCH.md). Two write-only tables the app fills and only the
-- dashboard reads: answers people give ("where did you hear about us", the week-one survey)
-- and a first-party count of landing-page visits by day and campaign tag. No cookies, no IP
-- addresses, no user agents: nothing about a visitor, only that a page was seen.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('source', 'survey')),
  value      text not null default '',
  note       text not null default '',
  referral   jsonb,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "own feedback goes in" on public.feedback;
create policy "own feedback goes in" on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());
-- no select policy: clients write, the maker reads in the dashboard
revoke select, update, delete on public.feedback from anon, authenticated;

create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  path       text not null default '/',
  source     text,
  campaign   text,
  day        date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.page_views enable row level security;
drop policy if exists "anyone may count a view" on public.page_views;
create policy "anyone may count a view" on public.page_views
  for insert to anon, authenticated
  with check (true);
revoke select, update, delete on public.page_views from anon, authenticated;

create or replace view public.page_views_daily
with (security_invoker = false) as
  select day, source, campaign, path, count(*) as views
  from public.page_views
  group by day, source, campaign, path
  order by day desc, views desc;
revoke all on public.page_views_daily from anon, authenticated;

-- Account deletion from inside the app: the signed-in user removes themself; their rows go with
-- them (sync_records cascades from auth.users). Runs as the function owner, so it may touch auth.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
