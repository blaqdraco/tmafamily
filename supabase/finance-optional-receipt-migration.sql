-- Run after application-history-migration.sql or applicant-workflow-update.sql.
-- Allows Finance approval for legacy payments without receipts; preserves workflow protections.
-- Safe to rerun. Does not create accounts or reset passwords.
begin;

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
    -- Finance may verify legacy payments without an uploaded receipt.
  end if;
  return new;
end;
$$;
revoke all on function public.validate_application_workflow() from public;
notify pgrst, 'reload schema';
commit;
