create table if not exists public.cloud_backups (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  profile_name text not null default '',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cloud_backups enable row level security;

drop policy if exists "cloud_backups_select_own" on public.cloud_backups;
drop policy if exists "cloud_backups_insert_own" on public.cloud_backups;
drop policy if exists "cloud_backups_update_own" on public.cloud_backups;
drop policy if exists "cloud_backups_delete_own" on public.cloud_backups;

create policy "cloud_backups_select_own" on public.cloud_backups
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "cloud_backups_insert_own" on public.cloud_backups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cloud_backups_update_own" on public.cloud_backups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cloud_backups_delete_own" on public.cloud_backups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.cloud_backups from anon;
grant select, insert, update, delete on public.cloud_backups to authenticated;
