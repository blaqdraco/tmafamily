# TMA Family Registration System

Vercel-ready React registration portal for TMA Association / TMA Family, using Supabase for auth and database.

The Django backend is still in `backend/`, but it is ignored for the current deployment plan.

## Features

- Member account creation and login with Supabase Auth
- Digital registration form based on the provided TMA Family membership form
- Member status tracking: draft, pending review, approved, rejected, action required
- Admin/staff request queue
- Admin actions: approve, reject, request action, add office registration details and comments
- TMA recruitment-site theme and logo

## Project structure

```text
frontend/          React app powered by Vite
supabase/schema.sql Supabase tables, policies, trigger, and admin support
backend/           Old Django backend, parked for now
```

## Supabase setup

1. Create a free Supabase project.
2. Open Supabase SQL Editor.
3. Run all SQL in:

```text
supabase/schema.sql
```

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

Use these Vercel settings:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Add these Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Then deploy.

## Notes

- Supabase Row Level Security is enabled.
- Members can read and edit only their own applications.
- Admin users are controlled by `public.profiles.is_admin`.
- Parent/guardian/in-law and child rows are stored as JSON because the source form allows up to four simple repeatable entries.
