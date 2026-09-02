-- Run this in Supabase SQL Editor after schema.sql (existing projects).

alter table public.profiles
  add column if not exists role text not null default 'member';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'communication', 'hr', 'finance', 'admin'));

update public.profiles
set role = 'admin'
where is_admin = true and role = 'member';

alter table public.membership_applications
  add column if not exists payment_receipt_path text not null default '',
  add column if not exists payment_receipt_uploaded_at timestamptz,
  add column if not exists payment_verified boolean not null default false,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists communication_notes text not null default '',
  add column if not exists communication_reviewed_at timestamptz,
  add column if not exists hr_notes text not null default '',
  add column if not exists hr_reviewed_at timestamptz,
  add column if not exists finance_notes text not null default '',
  add column if not exists finance_reviewed_at timestamptz;

alter table public.membership_applications
  drop constraint if exists membership_applications_status_check;

alter table public.membership_applications
  add constraint membership_applications_status_check
  check (status in (
    'draft',
    'pending',
    'pending_communication',
    'pending_hr',
    'pending_finance',
    'approved',
    'rejected',
    'action_required'
  ));

update public.membership_applications
set status = 'pending_communication'
where status = 'pending';

create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (is_admin = true or role in ('communication', 'hr', 'finance', 'admin'))
  );
$$;

create or replace function public.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = any(allowed_roles) or (is_admin = true and 'admin' = any(allowed_roles)))
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_staff());

drop policy if exists "Members can create own applications" on public.membership_applications;
create policy "Members can create own applications"
on public.membership_applications for insert
to authenticated
with check (user_id = auth.uid() and status in ('draft', 'pending', 'pending_communication'));

drop policy if exists "Members can read own applications" on public.membership_applications;
create policy "Members can read own applications"
on public.membership_applications for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Members can update editable own applications" on public.membership_applications;
create policy "Members can update editable own applications"
on public.membership_applications for update
to authenticated
using (
  user_id = auth.uid()
  and status in ('draft', 'action_required', 'rejected', 'pending_hr', 'pending_finance')
)
with check (
  user_id = auth.uid()
  and status in ('draft', 'pending_communication', 'action_required', 'pending_hr', 'pending_finance')
);

drop policy if exists "Admins can update all applications" on public.membership_applications;
drop policy if exists "Staff can update applications" on public.membership_applications;
create policy "Staff can update applications"
on public.membership_applications for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

.drop policy if exists "Admins can delete applications" on public.membership_applications;
drop policy if exists "Staff can delete applications" on public.membership_applications;
create policy "Admins can delete applications"
on public.membership_applications for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

drop policy if exists "Members upload own payment receipts" on storage.objects;
create policy "Members upload own payment receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members read own payment receipts" on storage.objects;
create policy "Members read own payment receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_staff()
  )
);

drop policy if exists "Staff read payment receipts" on storage.objects;
create policy "Staff read payment receipts"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-receipts' and public.is_staff());

-- After creating test users in Supabase Auth, assign roles:
-- update public.profiles set role = 'communication' where id = (select id from auth.users where email = 'communication@tmafamily.test');
-- update public.profiles set role = 'hr' where id = (select id from auth.users where email = 'hr@tmafamily.test');
-- update public.profiles set role = 'finance' where id = (select id from auth.users where email = 'finance@tmafamily.test');
-- update public.profiles set role = 'admin', is_admin = true where id = (select id from auth.users where email = 'admin@tmafamily.test');
