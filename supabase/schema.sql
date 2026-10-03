-- Somehow I Manage · sync schema for Supabase. Paste into the SQL editor and run once.
-- Every account gets its own rows; the app reads rows with seq > its cursor and pushes its
-- outbox through sync_push(), which keeps the newest version of each record.

create sequence if not exists public.sync_seq;

create table if not exists public.sync_records (
  user_id    uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id         text   not null,
  kind       text   not null check (kind in ('person', 'item')),
  data       jsonb,                 -- the record as JSON; JSON null for a tombstone
  updated_at bigint not null,       -- version: the device's clock (ms) when it made the change
  deleted_at bigint,                -- set = tombstone
  seq        bigint not null default nextval('public.sync_seq'),
  primary key (user_id, id)
);
create index if not exists sync_records_user_seq on public.sync_records (user_id, seq);

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
