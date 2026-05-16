-- Minimal local-only seed data for Passport development.
-- This is synthetic test data and does not mirror production records.

begin;

insert into public.dapps (
  id,
  appname,
  url,
  uid,
  admin_uid,
  is_cubid_native,
  redirect_url
)
values (
  900001,
  'Local Passport Test App',
  'http://localhost:3000',
  '11111111-1111-1111-1111-111111111111',
  'local-admin',
  true,
  'http://localhost:3000/auth/callback'
)
on conflict (id) do nothing;

insert into public.dapp_api_keys (
  dapp_id,
  key_prefix,
  key_hash,
  hash_algorithm,
  hash_version,
  status,
  rotated_at
)
values (
  900001,
  substring('22222222-2222-2222-2222-222222222222' from 1 for 12),
  'sha256:v1:' || encode(extensions.digest('22222222-2222-2222-2222-222222222222', 'sha256'), 'hex'),
  'sha256',
  1,
  'active',
  now()
)
on conflict do nothing;

insert into public.stamptypes (
  id,
  stamptype,
  stampcategory,
  salt,
  is_auth_enabled,
  v2stamptype,
  format,
  example,
  is_in_blacklist
)
values
  (11, 'phone', 'contact', 'local-phone-salt', true, 'phone', 'e164', '+15550000001', true),
  (13, 'email', 'contact', 'local-email-salt', true, 'email', 'email', 'alice.local@example.com', true),
  (14, 'evm', 'wallet', 'local-evm-salt', true, 'evm', 'address', '0x1111111111111111111111111111111111111111', true)
on conflict (id) do nothing;

insert into public.users (
  id,
  email,
  phone,
  username,
  created_by_app,
  is_master,
  is_human,
  unique_phone,
  evm
)
values
  (
    900001,
    'alice.local@example.com',
    '+15550000001',
    'alice-local',
    900001,
    true,
    true,
    '+15550000001',
    '0x1111111111111111111111111111111111111111'
  ),
  (
    900002,
    'bob.local@example.com',
    '+15550000002',
    'bob-local',
    900001,
    true,
    true,
    '+15550000002',
    '0x2222222222222222222222222222222222222222'
  )
on conflict (id) do nothing;

insert into public.dapp_users (
  id,
  dapp_id,
  user_id,
  uuid,
  is_authorized,
  username,
  user_data,
  master_auth_uniquevalue
)
values
  (
    900001,
    900001,
    900001,
    '33333333-3333-3333-3333-333333333331',
    true,
    'alice-local',
    '{"source":"local-seed","role":"tester"}'::jsonb,
    'alice.local@example.com'
  ),
  (
    900002,
    900001,
    900002,
    '33333333-3333-3333-3333-333333333332',
    true,
    'bob-local',
    '{"source":"local-seed","role":"tester"}'::jsonb,
    'bob.local@example.com'
  )
on conflict (id) do nothing;

select setval('public.users_id_seq', greatest(coalesce((select max(id) from public.users), 1), 900002), true);
select setval('public.dapp_users_id_seq', greatest(coalesce((select max(id) from public.dapp_users), 1), 900002), true);

commit;
