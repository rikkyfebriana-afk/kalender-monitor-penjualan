create table public.calendar_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.calendar_admins enable row level security;
revoke all on public.calendar_admins from anon, authenticated;
grant select, insert, delete on public.calendar_admins to authenticated;
create policy admins_read on public.calendar_admins for select to authenticated
using (user_id=(select auth.uid()) or exists(select 1 from public.calendar_team where id=1 and owner_id=(select auth.uid())));
create policy owner_grants_admin on public.calendar_admins for insert to authenticated
with check (granted_by=(select auth.uid()) and exists(select 1 from public.calendar_team where id=1 and owner_id=(select auth.uid()) and owner_id<>user_id));
create policy owner_revokes_admin on public.calendar_admins for delete to authenticated
using (exists(select 1 from public.calendar_team where id=1 and owner_id=(select auth.uid()) and owner_id<>user_id));
create policy additional_admin_write on public.calendar_team for update to authenticated
using (id=1 and exists(select 1 from public.calendar_admins where user_id=(select auth.uid())))
with check (id=1 and exists(select 1 from public.calendar_admins where user_id=(select auth.uid())));
revoke update on public.calendar_team from authenticated, anon;
grant update(payload,revision) on public.calendar_team to authenticated;
create index calendar_admins_granted_by_idx on public.calendar_admins(granted_by);
create schema if not exists calendar_private;
revoke all on schema calendar_private from public;
grant usage on schema calendar_private to authenticated;
create function calendar_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.calendar_team where id=1 and owner_id=auth.uid())
$$;
revoke all on function calendar_private.is_owner() from public,anon;
grant execute on function calendar_private.is_owner() to authenticated;
alter policy admins_read on public.calendar_admins using (user_id=(select auth.uid()) or (select calendar_private.is_owner()));
alter policy owner_grants_admin on public.calendar_admins with check (granted_by=(select auth.uid()) and user_id<>(select auth.uid()) and (select calendar_private.is_owner()));
alter policy owner_revokes_admin on public.calendar_admins using (user_id<>(select auth.uid()) and (select calendar_private.is_owner()));