-- Create applicant (member) accounts, bypassing normal registration.
-- Default password for all accounts: TMAFAMILY@2026
-- Run in Supabase SQL Editor (or: python3 scripts/run_supabase_sql.py supabase/seed-applicants.sql)

create extension if not exists pgcrypto;

do $$
declare
  default_password text := 'TMAFAMILY@2026';
  user_record record;
  new_user_id uuid;
begin
  for user_record in
    select *
    from (
      values
        ('charlesdanielmandia@gmail.com', 'Charles', 'Mandia'),
        ('singanosalome@gmail.com', 'Salome', 'Singano'),
        ('ntwale79@gmail.com', 'Ntwale', 'Member'),
        ('jkalamule@yahoo.com', 'J', 'Kalamule')
    ) as users(email, first_name, last_name)
  loop
    select id into new_user_id
    from auth.users
    where lower(email) = lower(user_record.email);

    if new_user_id is null then
      new_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      )
      values (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        lower(user_record.email),
        crypt(default_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
          'username', split_part(lower(user_record.email), '@', 1),
          'first_name', user_record.first_name,
          'last_name', user_record.last_name
        ),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    else
      update auth.users
      set
        encrypted_password = crypt(default_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object(
          'username', split_part(lower(user_record.email), '@', 1),
          'first_name', user_record.first_name,
          'last_name', user_record.last_name
        ),
        updated_at = now()
      where id = new_user_id;
    end if;

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      new_user_id,
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', lower(user_record.email)),
      'email',
      lower(user_record.email),
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do update
    set
      user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = now();

    insert into public.profiles (id, username, first_name, last_name, is_admin, role)
    values (
      new_user_id,
      split_part(lower(user_record.email), '@', 1),
      user_record.first_name,
      user_record.last_name,
      false,
      'member'
    )
    on conflict (id) do update
    set
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      is_admin = false,
      role = 'member',
      updated_at = now();
  end loop;
end $$;
