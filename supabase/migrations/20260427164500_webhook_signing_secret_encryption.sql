create extension if not exists pgcrypto with schema extensions;

alter table if exists public.dapp_webhook_subscriptions
  add column if not exists secret_reference_id uuid not null default extensions.gen_random_uuid(),
  add column if not exists secret_ciphertext text,
  add column if not exists secret_iv text,
  add column if not exists secret_auth_tag text,
  add column if not exists wrapped_data_key text,
  add column if not exists wrapped_data_key_iv text,
  add column if not exists wrapped_data_key_auth_tag text,
  add column if not exists secret_algorithm text,
  add column if not exists secret_key_id text,
  add column if not exists secret_key_version integer,
  add column if not exists secret_purpose text,
  add column if not exists secret_context jsonb not null default '{}'::jsonb,
  add column if not exists secret_encrypted_at timestamptz,
  add column if not exists secret_migrated_from_plaintext_at timestamptz,
  add column if not exists secret_rotated_at timestamptz;

create index if not exists dapp_webhook_subscriptions_secret_reference_idx
  on public.dapp_webhook_subscriptions(secret_reference_id);

create index if not exists dapp_webhook_subscriptions_encrypted_missing_idx
  on public.dapp_webhook_subscriptions(id)
  where secret_ciphertext is null and secret is not null;

alter table if exists public.dapp_webhook_subscriptions
  drop constraint if exists dapp_webhook_subscriptions_secret_algorithm_check;

alter table if exists public.dapp_webhook_subscriptions
  add constraint dapp_webhook_subscriptions_secret_algorithm_check
  check (
    secret_algorithm is null
    or secret_algorithm = 'aes-256-gcm-envelope'
  );

alter table if exists public.dapp_webhook_subscriptions
  drop constraint if exists dapp_webhook_subscriptions_secret_key_version_check;

alter table if exists public.dapp_webhook_subscriptions
  add constraint dapp_webhook_subscriptions_secret_key_version_check
  check (secret_key_version is null or secret_key_version > 0);

create or replace function public.get_webhook_signing_secret_wrapping_key_v1()
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
   where name = 'passport_webhook_signing_secret_wrapping_key_v1'
   limit 1;

  if secret_value is null or length(secret_value) < 32 then
    raise exception 'Webhook signing secret wrapping key is not configured';
  end if;

  return secret_value;
end;
$$;

revoke all on function public.get_webhook_signing_secret_wrapping_key_v1() from public;
grant execute on function public.get_webhook_signing_secret_wrapping_key_v1() to service_role;
