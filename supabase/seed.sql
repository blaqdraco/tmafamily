-- Staff test users for local/linked Supabase projects.
-- Password for all accounts: TmaTest@2026
-- Run with: npm run supabase:seed

create extension if not exists pgcrypto;

do $$
declare
  test_password text := 'TmaTest@2026';
  user_record record;
begin
  for user_record in
    select *
    from (
      values
        ('a0000000-0000-4000-8000-000000000001'::uuid, 'communication@tmafamily.test', 'communication', 'Communication', 'Officer', false),
        ('a0000000-0000-4000-8000-000000000002'::uuid, 'hr@tmafamily.test', 'hr', 'HR', 'Officer', false),
        ('a0000000-0000-4000-8000-000000000003'::uuid, 'finance@tmafamily.test', 'finance', 'Finance', 'Officer', false),
        ('a0000000-0000-4000-8000-000000000004'::uuid, 'admin@tmafamily.test', 'admin', 'System', 'Admin', true)
    ) as users(id, email, role_name, first_name, last_name, is_admin_flag)
  loop
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
      user_record.id,
      'authenticated',
      'authenticated',
      user_record.email,
      crypt(test_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'username', split_part(user_record.email, '@', 1),
        'first_name', user_record.first_name,
        'last_name', user_record.last_name
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    on conflict (id) do update
    set
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

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
      user_record.id,
      user_record.id,
      jsonb_build_object('sub', user_record.id::text, 'email', user_record.email),
      'email',
      user_record.email,
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do update
    set
      identity_data = excluded.identity_data,
      updated_at = now();

    insert into public.profiles (id, username, first_name, last_name, is_admin, role)
    values (
      user_record.id,
      split_part(user_record.email, '@', 1),
      user_record.first_name,
      user_record.last_name,
      user_record.is_admin_flag,
      user_record.role_name
    )
    on conflict (id) do update
    set
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      is_admin = excluded.is_admin,
      role = excluded.role,
      updated_at = now();
  end loop;
end $$;
