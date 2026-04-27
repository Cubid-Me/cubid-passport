alter table public.dapp_user_secrets
  add column if not exists secret_ciphertext text,
  add column if not exists secret_iv text,
  add column if not exists secret_auth_tag text,
  add column if not exists wrapped_data_key text,
  add column if not exists wrapped_data_key_iv text,
  add column if not exists wrapped_data_key_auth_tag text,
  add column if not exists encryption_algorithm text,
  add column if not exists encryption_key_id text,
  add column if not exists encryption_key_version integer,
  add column if not exists encryption_purpose text,
  add column if not exists encryption_context jsonb not null default '{}'::jsonb,
  add column if not exists encrypted_at timestamp with time zone,
  add column if not exists migrated_from_plaintext_at timestamp with time zone;

create index if not exists dapp_user_secrets_dapp_user_uuid_idx
  on public.dapp_user_secrets (dapp_user_uuid);

create index if not exists dapp_user_secrets_encrypted_missing_idx
  on public.dapp_user_secrets (id)
  where secret_ciphertext is null;

alter table public.dapp_user_secrets
  drop constraint if exists dapp_user_secrets_encryption_algorithm_check;

alter table public.dapp_user_secrets
  add constraint dapp_user_secrets_encryption_algorithm_check
  check (
    encryption_algorithm is null
    or encryption_algorithm = 'aes-256-gcm-envelope'
  );

alter table public.dapp_user_secrets
  drop constraint if exists dapp_user_secrets_encryption_key_version_check;

alter table public.dapp_user_secrets
  add constraint dapp_user_secrets_encryption_key_version_check
  check (
    encryption_key_version is null
    or encryption_key_version > 0
  );

create or replace function public.get_dapp_user_secret_wrapping_key_v1()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret_value text;
begin
  select decrypted_secret
    into secret_value
  from vault.decrypted_secrets
  where name = 'passport_dapp_user_secret_wrapping_key_v1'
  limit 1;

  if secret_value is null or length(secret_value) < 43 then
    raise exception 'passport_dapp_user_secret_wrapping_key_v1 is missing from Supabase Vault'
      using errcode = '22023';
  end if;

  return secret_value;
end;
$$;

revoke all on function public.get_dapp_user_secret_wrapping_key_v1() from public;
grant execute on function public.get_dapp_user_secret_wrapping_key_v1() to service_role;

revoke select, insert, update, delete on table public.dapp_user_secrets from anon;
revoke select, insert, update, delete on table public.dapp_user_secrets from authenticated;
grant select, insert, update, delete on table public.dapp_user_secrets to service_role;
