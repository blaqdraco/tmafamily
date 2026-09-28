-- Apply after workflow-migration.sql. Existing history cannot identify past reviewers.
begin;

create table if not exists public.application_history (
  id bigint generated always as identity primary key,
  application_id bigint not null references public.membership_applications(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_role text,
  action text not null,
  from_status text,
  to_status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists application_history_application_idx on public.application_history(application_id, created_at);
create index if not exists application_history_actor_idx on public.application_history(actor_id, action);
alter table public.application_history enable row level security;
revoke all on public.application_history from anon, authenticated;
grant select on public.application_history to authenticated;
drop policy if exists "Read own or staff application history" on public.application_history;
create policy "Read own or staff application history" on public.application_history for select to authenticated
using (exists (select 1 from public.membership_applications a where a.id = application_id and (a.user_id = auth.uid() or public.is_staff())));

-- Preserve known older status and notes without inventing a reviewer or event date.
insert into public.application_history(application_id, action, to_status, note, created_at)
select a.id, 'legacy_status', a.status,
  coalesce(nullif(a.action_required_note, ''), nullif(a.office_comments, ''), ''),
  coalesce(a.reviewed_at, a.submitted_at, a.created_at)
from public.membership_applications a
where not exists (select 1 from public.application_history h where h.application_id = a.id);

-- Keep returned applications editable, including saving corrections before resubmission.
drop policy if exists "Members can update editable own applications" on public.membership_applications;
create policy "Members can update editable own applications" on public.membership_applications for update to authenticated
using (user_id = auth.uid() and status in ('draft', 'action_required', 'rejected', 'pending_hr', 'pending_finance'))
with check (user_id = auth.uid() and status in ('draft', 'action_required', 'rejected', 'pending_communication', 'pending_hr', 'pending_finance'));

create or replace function public.validate_application_workflow()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  expected_role text;
  expected_next text;
  editable_fields text[] := array[
    'full_name','gender','date_of_birth','age','phone_number','email','nida_number',
    'residential_address','region','district','profession','institution','education_level',
    'work_experience_years','marital_status','member_group','parents','children',
    'emergency_name','emergency_relationship','emergency_phone','emergency_address',
    'referee_application_id','referee_full_name','referee_phone','referee_registration_number',
    'declaration_accepted','payment_receipt_path','payment_receipt_uploaded_at',
    'status','submitted_at','updated_at'
  ];
begin
  select case when p.is_admin then 'admin' else p.role end into actor_role from public.profiles p where p.id = actor;
  actor_role := coalesce(actor_role, 'member');

  if tg_op = 'INSERT' then
    -- Serialize creation per applicant to prevent double-clicks / concurrent tabs creating two applications.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
    if exists (select 1 from public.membership_applications a where a.user_id = new.user_id) then
      raise exception 'A registration already exists for this applicant. Open the existing registration instead.';
    end if;
    if actor is not null and (new.user_id <> actor or new.status not in ('draft', 'pending_communication')) then
      raise exception 'Create your own registration as a draft or submit it to Communication.';
    end if;
    if actor is not null and (new.payment_verified or new.reviewed_at is not null or coalesce(new.action_required_note, '') <> '' or coalesce(new.communication_notes, '') <> '' or coalesce(new.hr_notes, '') <> '' or coalesce(new.finance_notes, '') <> '') then
      raise exception 'Review fields can only be set during staff review.';
    end if;
  else
    if new.user_id is distinct from old.user_id then raise exception 'Application ownership cannot be changed.'; end if;
    if actor is not null then
      if actor_role = 'member' then
        if actor <> old.user_id then raise exception 'You can only edit your own registration.'; end if;
        if old.status in ('draft', 'rejected', 'action_required') then
          if new.status <> old.status and new.status <> 'pending_communication' then
            raise exception 'This registration can only be saved or resubmitted to Communication.';
          end if;
          if (to_jsonb(new) - editable_fields) is distinct from (to_jsonb(old) - editable_fields) then
            raise exception 'Applicants cannot change reviewer notes or approval fields.';
          end if;
        elsif old.status in ('pending_hr', 'pending_finance') then
          if (to_jsonb(new) - array['payment_receipt_path','payment_receipt_uploaded_at','updated_at']) is distinct from
             (to_jsonb(old) - array['payment_receipt_path','payment_receipt_uploaded_at','updated_at']) then
            raise exception 'Registration already submitted. Only the payment receipt can be updated at this stage.';
          end if;
        else
          raise exception 'Registration already submitted or approved. Check its current status.';
        end if;
      else
        expected_role := case old.status when 'pending_communication' then 'communication' when 'pending_hr' then 'hr' when 'pending_finance' then 'finance' end;
        expected_next := case old.status when 'pending_communication' then 'pending_hr' when 'pending_hr' then 'pending_finance' when 'pending_finance' then 'approved' end;
        if expected_role is null or (actor_role <> 'admin' and actor_role <> expected_role) then
          raise exception 'This registration is not awaiting your review or has already been reviewed.';
        end if;
        if new.status not in ('rejected', 'action_required', expected_next) then
          raise exception 'This review has already been applied or is not a valid next step.';
        end if;
      end if;
    end if;
  end if;

  if new.date_of_birth is not null then
    if new.date_of_birth > current_date then raise exception 'Date of birth cannot be in the future.'; end if;
    new.age := extract(year from age(current_date, new.date_of_birth))::integer;
  else
    new.age := null;
  end if;

  if (tg_op = 'INSERT' and new.status = 'pending_communication') or
     (tg_op = 'UPDATE' and new.status = 'pending_communication' and old.status is distinct from new.status) then
    if btrim(new.nida_number) !~ '^([0-9]{20}|[0-9]{8}-[0-9]{5}-[0-9]{5}-[0-9]{2})$' then
      raise exception 'NIDA must contain 20 digits, optionally formatted YYYYMMDD-XXXXX-XXXXX-XX.';
    end if;
    if new.date_of_birth is null then raise exception 'Date of birth is required before submission.'; end if;
    new.nida_number := replace(btrim(new.nida_number), '-', '');
    new.submitted_at := now();
    new.action_required_note := '';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('rejected', 'action_required') then
      new.action_required_note := btrim(coalesce(new.action_required_note, ''));
      if new.action_required_note = '' then raise exception 'A rejection or action note is required.'; end if;
    elsif new.status in ('pending_hr', 'pending_finance', 'approved') then
      new.action_required_note := '';
    end if;
    if new.status = 'approved' and coalesce(new.payment_receipt_path, '') = '' then
      raise exception 'Upload a payment receipt before approval.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_application_workflow() from public;
drop trigger if exists application_workflow_validation on public.membership_applications;
create trigger application_workflow_validation before insert or update on public.membership_applications
for each row execute function public.validate_application_workflow();

create or replace function public.record_application_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  actor_role text;
  event_action text;
  event_note text := '';
  previous_status text;
begin
  if tg_op = 'UPDATE' and old.status = new.status then return new; end if;
  if tg_op = 'UPDATE' then previous_status := old.status; end if;
  select coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username),
    case when p.is_admin then 'admin' else p.role end into actor_name, actor_role
  from public.profiles p where p.id = actor;
  event_action := case new.status
    when 'draft' then 'draft'
    when 'pending_communication' then
      case when previous_status in ('rejected','action_required') or exists (
        select 1 from public.application_history h where h.application_id = new.id and
        (h.action in ('submitted','resubmitted','rejected','action_required') or (h.action = 'legacy_status' and h.to_status <> 'draft'))
      ) then 'resubmitted' else 'submitted' end
    when 'rejected' then 'rejected'
    when 'action_required' then 'action_required'
    when 'approved' then 'approved'
    else 'forwarded' end;
  if new.status in ('rejected','action_required') then event_note := new.action_required_note;
  elsif previous_status = 'pending_communication' then event_note := new.communication_notes;
  elsif previous_status = 'pending_hr' then event_note := new.hr_notes;
  elsif previous_status = 'pending_finance' then event_note := new.finance_notes;
  end if;
  insert into public.application_history(application_id, actor_id, actor_name, actor_role, action, from_status, to_status, note)
  values(new.id, actor, actor_name, actor_role, event_action, previous_status, new.status, coalesce(event_note, ''));
  return new;
end;
$$;
revoke all on function public.record_application_history() from public;
drop trigger if exists application_history_record on public.membership_applications;
create trigger application_history_record after insert or update on public.membership_applications
for each row execute function public.record_application_history();
notify pgrst, 'reload schema';
commit;
