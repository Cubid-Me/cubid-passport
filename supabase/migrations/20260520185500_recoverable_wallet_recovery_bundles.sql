create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create table if not exists private.recoverable_wallet_recovery_bundles (
  id uuid primary key default extensions.gen_random_uuid(),
  recovery_bundle_id text not null unique,
  dapp_id bigint not null references public.dapps(id) on delete restrict,
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete cascade,
  user_id bigint not null references public.users(id) on delete restrict,
  provider_key text not null default 'cubid',
  bundle_version integer not null default 1,
  status text not null default 'active',
  recovery_reference text,
  bundle_ciphertext text not null,
  bundle_iv text not null,
  bundle_auth_tag text not null,
  wrapped_data_key text not null,
  wrapped_data_key_iv text not null,
  wrapped_data_key_auth_tag text not null,
  encryption_algorithm text not null,
  encryption_key_id text not null,
  encryption_key_version integer not null,
  encryption_purpose text not null,
  encryption_context jsonb not null default '{}'::jsonb,
  encrypted_at timestamptz not null default now(),
  expires_at timestamptz,
  rotated_at timestamptz,
  revoked_at timestamptz,
  stale_at timestamptz,
  last_released_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recoverable_wallet_recovery_bundles_status_check
    check (status in ('active', 'rotated', 'revoked', 'expired', 'stale')),
  constraint recoverable_wallet_recovery_bundles_algorithm_check
    check (encryption_algorithm = 'aes-256-gcm-envelope'),
  constraint recoverable_wallet_recovery_bundles_key_version_check
    check (encryption_key_version > 0),
  constraint recoverable_wallet_recovery_bundles_bundle_version_check
    check (bundle_version > 0)
);

create index if not exists recoverable_wallet_recovery_bundles_dapp_user_idx
  on private.recoverable_wallet_recovery_bundles(dapp_id, dapp_user_uuid, status);

create index if not exists recoverable_wallet_recovery_bundles_user_idx
  on private.recoverable_wallet_recovery_bundles(user_id, status);

create index if not exists recoverable_wallet_recovery_bundles_reference_idx
  on private.recoverable_wallet_recovery_bundles(recovery_reference)
  where recovery_reference is not null;

alter table private.recoverable_wallet_recovery_bundles enable row level security;

revoke all on table private.recoverable_wallet_recovery_bundles from public;
revoke all on table private.recoverable_wallet_recovery_bundles from anon;
revoke all on table private.recoverable_wallet_recovery_bundles from authenticated;
grant select, insert, update, delete on table private.recoverable_wallet_recovery_bundles to service_role;

create or replace function public.get_recoverable_wallet_recovery_bundle_wrapping_key_v1()
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  secret_value text;
begin
  select decrypted_secret
    into secret_value
    from vault.decrypted_secrets
   where name = 'passport_recoverable_wallet_recovery_bundle_wrapping_key_v1'
   limit 1;

  if secret_value is null or length(secret_value) < 43 then
    raise exception 'passport_recoverable_wallet_recovery_bundle_wrapping_key_v1 is missing from Supabase Vault'
      using errcode = '22023';
  end if;

  return secret_value;
end;
$$;

revoke all on function public.get_recoverable_wallet_recovery_bundle_wrapping_key_v1() from public;
grant execute on function public.get_recoverable_wallet_recovery_bundle_wrapping_key_v1() to service_role;

comment on table private.recoverable_wallet_recovery_bundles is
  'Encrypted app-mediated wallet recovery bundles. Service-role only; recovery material must not be returned to backend-only callers.';
