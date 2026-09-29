import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { ageFromBirthdate, isValidTanzaniaNin, canReviewApplication, requiredReviewNote, registrationLockMessage, submissionLabel } from '../frontend/src/workflowConfig.js';

const today = new Date(2026, 8, 28);
assert.equal(ageFromBirthdate('2000-09-28', today), '26');
assert.equal(ageFromBirthdate('2000-09-29', today), '25');
assert.equal(ageFromBirthdate('2000-02-29', today), '26');
for (const value of ['', '2001-02-29', '2000-13-01', '2026-09-29', 'bad']) assert.equal(ageFromBirthdate(value, today), '');
for (const value of ['19900101123451234512', '19900101-12345-12345-12']) assert.equal(isValidTanzaniaNin(value), true);
for (const value of ['abc19900101123451234512', '1990010112345123451', '19900101 12345 12345 12', '']) assert.equal(isValidTanzaniaNin(value), false);
assert.equal(requiredReviewNote({action_required_note: '   ', communication_notes: ' Correct details '}, 'communication_notes'), 'Correct details');
assert.equal(requiredReviewNote({action_required_note: ' '}, 'communication_notes'), '');
assert.equal(canReviewApplication('communication', 'rejected'), false);
assert.equal(canReviewApplication('finance', 'pending_communication'), false);
assert.equal(canReviewApplication('admin', 'action_required'), false);
assert.equal(canReviewApplication('admin', 'pending_finance'), true);
assert.match(registrationLockMessage({id: 1, status: 'pending_hr'}), /already been submitted/);
assert.equal(submissionLabel({history: [{id: 1, action: 'submitted', created_at: '2026-01-01'}, {id: 2, action: 'resubmitted', created_at: '2026-01-02'}]}), 'Resubmitted');

const db = new PGlite({extensions: {pgcrypto}});
await db.exec(`
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb,
 instance_id uuid, aud text, role text, encrypted_password text, email_confirmed_at timestamptz,
 raw_app_meta_data jsonb, created_at timestamptz, updated_at timestamptz, confirmation_token text,
 email_change text, email_change_token_new text, recovery_token text);
create table auth.identities(id uuid primary key, user_id uuid references auth.users(id), identity_data jsonb,
 provider text, provider_id text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
 unique(provider_id, provider));
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id bigint, bucket_id text, name text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1, '/') $$;
`);
await db.exec((await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8')).replace('create extension if not exists pgcrypto;', ''));
await db.exec(await readFile(new URL('../supabase/workflow-migration.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/referee-migration.sql', import.meta.url), 'utf8'));
await db.exec(`grant usage on schema public, auth to authenticated; grant select, insert, update on public.membership_applications to authenticated; grant select on public.profiles to authenticated; grant usage on all sequences in schema public to authenticated;`);
const ids = {member: '00000000-0000-0000-0000-000000000001', communication: '00000000-0000-0000-0000-000000000002', finance: '00000000-0000-0000-0000-000000000003', other: '00000000-0000-0000-0000-000000000004', admin: '00000000-0000-0000-0000-000000000005'};
for (const [role,id] of Object.entries(ids)) {
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')`, [id, `${role}@example.test`]);
  await db.query(`update public.profiles set role=$1, first_name=$1, username=$1, is_admin=$3 where id=$2`, [role === 'other' ? 'member' : role,id,role === 'admin']);
}
const migration = await readFile(new URL('../supabase/application-history-migration.sql', import.meta.url), 'utf8');
await db.exec(migration);
await db.exec(migration); // Safe to rerun.
async function as(role) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [ids[role]]);
  await db.exec('set role authenticated');
}
async function rejects(sql, regex) { await assert.rejects(db.exec(sql), regex); }
await as('member');
const insert = `insert into public.membership_applications(user_id, full_name,gender,phone_number,email,nida_number,residential_address,region,district,profession,education_level,emergency_name,emergency_relationship,emergency_phone,emergency_address,date_of_birth,age) values('${ids.member}','Test Applicant','Male','0712345678','member@example.test','19900101-12345-12345-12','Address','Region','District','Profession','Education','Contact','Parent','0712345678','Address','1990-01-01',999)`;
await db.exec(insert);
const app = (await db.query(`select * from public.membership_applications`)).rows[0];
assert.notEqual(app.age, 999);
await rejects(insert, /registration already exists/);
await rejects(`update public.membership_applications set date_of_birth='2999-01-01' where id=${app.id}`, /future/);
await db.exec(`update public.membership_applications set nida_number='abc19900101123451234512' where id=${app.id}`);
await rejects(`update public.membership_applications set status='pending_communication' where id=${app.id}`, /NIDA/);
await db.exec(`update public.membership_applications set nida_number='19900101-12345-12345-12', status='pending_communication' where id=${app.id}`);
// RLS hides the row from another submission; no second history event.
await db.exec(`update public.membership_applications set status='pending_communication' where id=${app.id}`);
assert.equal((await db.query(`select count(*)::int as n from public.application_history where action='submitted'`)).rows[0].n, 1);
await as('finance');
await rejects(`update public.membership_applications set status='rejected', action_required_note='No' where id=${app.id}`, /not awaiting your review/);
await as('communication');
await rejects(`update public.membership_applications set status='rejected', action_required_note='   ' where id=${app.id}`, /note is required/);
await rejects(`update public.membership_applications set status='action_required', action_required_note='' where id=${app.id}`, /note is required/);
await db.exec(`update public.membership_applications set status='rejected', action_required_note='Correct the address' where id=${app.id}`);
await rejects(`update public.membership_applications set status='rejected', action_required_note='Again' where id=${app.id}`, /already been reviewed/);
await as('member');
await rejects(`update public.membership_applications set action_required_note='Erase reviewer note' where id=${app.id}`, /cannot change reviewer notes/);
await db.exec(`update public.membership_applications set residential_address='Corrected address' where id=${app.id}`);
await db.exec(`update public.membership_applications set status='pending_communication' where id=${app.id}`);
const history = (await db.query(`select * from public.application_history order by id`)).rows;
assert.deepEqual(history.map(e => e.action), ['draft','submitted','rejected','resubmitted']);
assert.equal(history[2].actor_id, ids.communication);
assert.equal(history[2].actor_role, 'communication');
assert.equal(history[2].note, 'Correct the address');
assert.equal((await db.query(`select action_required_note from public.membership_applications where id=${app.id}`)).rows[0].action_required_note, '');
await rejects(`delete from public.application_history`, /permission denied/);
await as('other');
assert.equal((await db.query(`select * from public.application_history`)).rows.length, 0);
await as('communication');
assert.equal((await db.query(`select * from public.application_history where actor_id='${ids.communication}' and action='rejected'`)).rows.length, 1);
await db.exec(`update public.membership_applications set status='pending_hr' where id=${app.id}`);
await as('member');
await db.exec(`update public.membership_applications set payment_receipt_path='receipt.pdf' where id=${app.id}`);
await rejects(`update public.membership_applications set full_name='Overwrite during review' where id=${app.id}`, /Only the payment receipt/);
await as('admin');
await db.exec(`update public.membership_applications set status='pending_finance' where id=${app.id}`);
// Verify each migration permits receipt-free approval and preserves the approval audit.
await db.exec("reset role; select set_config('request.jwt.claim.sub','',false)");
const optionalReceiptMigration = await readFile(new URL('../supabase/finance-optional-receipt-migration.sql', import.meta.url), 'utf8');
for (const sql of [migration, optionalReceiptMigration, optionalReceiptMigration]) {
  await db.exec(sql);
  await db.exec('begin');
  await db.exec(`update public.membership_applications set payment_receipt_path='' where id=${app.id}`);
  await as('finance');
  await db.exec(`update public.membership_applications set status='approved', payment_verified=true, finance_notes='Verified against previous member records' where id=${app.id}`);
  const approval = (await db.query(`select * from public.application_history where application_id=${app.id} and action='approved'`)).rows;
  assert.equal(approval.length, 1);
  assert.equal(approval[0].actor_id, ids.finance);
  assert.equal(approval[0].note, 'Verified against previous member records');
  assert.equal((await db.query(`select payment_receipt_path from public.membership_applications where id=${app.id}`)).rows[0].payment_receipt_path, '');
  await db.exec('rollback');
}
await as('finance');
await db.exec(`update public.membership_applications set status='approved', payment_verified=true where id=${app.id}`);
await rejects(`update public.membership_applications set status='rejected', action_required_note='Too late' where id=${app.id}`, /already been reviewed/);
await db.exec("reset role; select set_config('request.jwt.claim.sub','',false)");
const update = await readFile(new URL('../supabase/applicant-workflow-update.sql', import.meta.url), 'utf8');
await db.exec(update);
await db.exec(update);
const newAccounts = (await db.query(`select u.email, p.role, crypt('TMAFAMILY@2026', u.encrypted_password) = u.encrypted_password as valid_password, u.email_confirmed_at is not null as confirmed from auth.users u join public.profiles p on p.id=u.id where u.email in ('masakirudiael@gmail.com','drmasoud05@gmail.com')`)).rows;
assert.equal(newAccounts.length, 2);
assert.ok(newAccounts.every(row => row.role === 'member' && row.valid_password && row.confirmed));
assert.equal((await db.query('select count(*)::int as n from auth.identities')).rows[0].n, 2);
assert.equal((await db.query("select count(*)::int as n from public.application_history where action='rejected'")).rows[0].n, 1);
await db.close();
console.log('PASS: age/NIDA validation, required notes, role checks, duplicate actions, resubmission history, receipt upload, history access and both account seeds (including reruns).');
