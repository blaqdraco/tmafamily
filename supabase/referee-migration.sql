-- Run in Supabase SQL Editor after workflow-migration.sql

alter table public.membership_applications
  add column if not exists referee_application_id bigint,
  add column if not exists referee_full_name text not null default '',
  add column if not exists referee_phone text not null default '',
  add column if not exists referee_registration_number text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'membership_applications_referee_application_id_fkey'
  ) then
    alter table public.membership_applications
      add constraint membership_applications_referee_application_id_fkey
      foreign key (referee_application_id)
      references public.membership_applications(id)
      on delete set null;
  end if;
end $$;

create or replace function public.list_referee_members(
  exclude_user_id uuid default null,
  exclude_application_id bigint default null
)
returns table (
  id bigint,
  full_name text,
  phone_number text,
  email text,
  office_registration_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ma.id,
    ma.full_name,
    ma.phone_number,
    ma.email,
    ma.office_registration_number
  from public.membership_applications ma
  where ma.status = 'approved'
    and (exclude_user_id is null or ma.user_id <> exclude_user_id)
    and (exclude_application_id is null or ma.id <> exclude_application_id)
  order by ma.full_name asc;
$$;

revoke all on function public.list_referee_members(uuid, bigint) from public;
grant execute on function public.list_referee_members(uuid, bigint) to authenticated;
