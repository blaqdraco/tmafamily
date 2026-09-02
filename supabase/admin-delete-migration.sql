-- Restrict application deletion to administrators only.
-- Run in Supabase SQL Editor if staff delete policy was already applied.

drop policy if exists "Staff can delete applications" on public.membership_applications;
drop policy if exists "Admins can delete applications" on public.membership_applications;

create policy "Admins can delete applications"
on public.membership_applications for delete
to authenticated
using (public.is_admin());
