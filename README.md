# TMA Family Registration System

Vercel-ready React registration portal for TMA Association / TMA Family, using Supabase for auth and database.

## Features

- Member account creation and login with Supabase Auth
- Digital registration form based on the provided TMA Family membership form
- Multi-step registration with Tanzania NIN validation
- Workflow: Applicant → Communication → HR → Finance
- Role-based staff portals for Communication, HR, Finance, and Admin
- Payment receipt upload by members and finance verification
- Member status tracking across workflow stages
- TMA recruitment-site theme and logo

## Project structure

```text
frontend/          React app powered by Vite
supabase/schema.sql Supabase tables, policies, trigger, and admin support
```

## Supabase setup

1. Create a free Supabase project.
2. Open Supabase SQL Editor.
3. Run all SQL in:

```text
supabase/schema.sql
supabase/workflow-migration.sql
```

For existing projects, run `workflow-migration.sql` after `schema.sql`.

4. Copy your Supabase Project URL and anon public key.
5. Create `frontend/.env.local` from the example:

```bash
cd frontend
cp .env.example .env.local
```

6. Fill in:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase auth redirects

If confirmation emails point to `localhost:3000`, update Supabase Auth URL settings:

1. Open Supabase Dashboard.
2. Go to `Authentication` -> `URL Configuration`.
3. Set `Site URL` to your deployed Vercel URL, for example:

```text
https://your-vercel-app.vercel.app
```

4. Add these `Redirect URLs`:

```text
https://your-vercel-app.vercel.app/**
http://127.0.0.1:5173/**
http://localhost:5173/**
```

Supabase uses these settings for confirmation, magic link, recovery, and invite links.

## Make an admin user

Create/sign up the admin account first, then run this in Supabase SQL Editor:

```sql
update public.profiles
set is_admin = true
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);
```

Change `admin@example.com` to the real admin email.

## Workflow roles and test logins

After running `workflow-migration.sql`, create these users in Supabase Auth and assign roles:

| Role | Email | Password |
|------|-------|----------|
| Communication | `communication@tmafamily.test` | `TmaTest@2026` |
| HR | `hr@tmafamily.test` | `TmaTest@2026` |
| Finance | `finance@tmafamily.test` | `TmaTest@2026` |
| Admin | `admin@tmafamily.test` | `TmaTest@2026` |

Then run:

```bash
npm install
supabase login
supabase link --project-ref your-project-ref
npm run supabase:seed
```

Or for local Supabase:

```bash
supabase start
npm run supabase:seed:local
```

The seed file creates these accounts (password `TmaTest@2026` for all):

| Role | Email |
|------|-------|
| Communication | `communication@tmafamily.test` |
| HR | `hr@tmafamily.test` |
| Finance | `finance@tmafamily.test` |
| Admin | `admin@tmafamily.test` |

Manual role SQL is only needed if you skip `supabase/seed.sql`.

Workflow stages:

1. Member submits → `pending_communication`
2. Communication forwards → `pending_hr`
3. HR forwards → `pending_finance`
4. Member uploads payment receipt
5. Finance verifies receipt → `approved`

Create the `payment-receipts` storage bucket via `workflow-migration.sql`.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Deploy free on Vercel

This repo includes `vercel.json`, so Vercel can deploy from the repo root. If Vercel asks for settings, use:

```text
Build Command: cd frontend && npm run build
Output Directory: frontend/dist
```

Add these Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=tmafamily@tmafamily.tmaglobal.org
SMTP_PASSWORD=your-hostinger-mailbox-password
SMTP_FROM_EMAIL=tmafamily@tmafamily.tmaglobal.org
SMTP_FROM_NAME=TMA GLOBAL
CRON_SECRET=choose-a-long-random-string
```

Optional: set `CRON_SECRET` to protect `/api/keepalive` from public calls. Vercel Cron sends this header automatically on scheduled runs.

Then deploy.

The SMTP variables are used by the Vercel `/api/send-action-email` function for admin actions such as approve, reject, and request action. Keep `SMTP_PASSWORD` only in Vercel environment variables; do not commit it.

## Supabase keepalive (prevent auto-pause)

Free Supabase projects can pause after about a week of inactivity. This repo includes a Vercel Cron job that pings Supabase **once daily at 06:00 UTC**.

- Endpoint: `/api/keepalive`
- Config: `vercel.json` → `"crons"`

After deploy, confirm the cron appears in Vercel → Project → Settings → Cron Jobs.

Manual test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/keepalive
```

You should get `{"ok":true,...}`.

## Notes

- Supabase Row Level Security is enabled.
- Members can read and edit only their own applications.
- Staff roles are controlled by `public.profiles.role`.
- Admin users can also use `public.profiles.is_admin`.
- Parent/guardian/in-law and child rows are stored as JSON because the source form allows up to four simple repeatable entries.
