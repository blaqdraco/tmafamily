# TMA Family Registration System

Vercel-ready React registration portal for TMA Association / TMA Family, using Supabase for auth and database.

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
```

Then deploy.

## Notes

- Supabase Row Level Security is enabled.
- Members can read and edit only their own applications.
- Admin users are controlled by `public.profiles.is_admin`.
- Parent/guardian/in-law and child rows are stored as JSON because the source form allows up to four simple repeatable entries.
