alter table public.oidc_webauthn_credentials
  add column if not exists device_id text default ('passkey_device_' || replace(gen_random_uuid()::text, '-', '')),
  add column if not exists revoked_by text check (revoked_by in ('user', 'operator', 'system')),
  add column if not exists revoked_reason text;

update public.oidc_webauthn_credentials
set device_id = 'passkey_device_' || replace(gen_random_uuid()::text, '-', '')
where device_id is null;

alter table public.oidc_webauthn_credentials
  alter column device_id set default ('passkey_device_' || replace(gen_random_uuid()::text, '-', '')),
  alter column device_id set not null;

create unique index if not exists oidc_webauthn_credentials_device_id_idx
  on public.oidc_webauthn_credentials (device_id);

create index if not exists oidc_webauthn_credentials_active_subject_idx
  on public.oidc_webauthn_credentials (human_subject_key, updated_at desc)
  where revoked_at is null;

create index if not exists oidc_webauthn_credentials_subject_updated_idx
  on public.oidc_webauthn_credentials (human_subject_key, updated_at desc);
