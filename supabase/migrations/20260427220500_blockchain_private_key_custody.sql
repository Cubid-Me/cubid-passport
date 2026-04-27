create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create table if not exists public.ref_chains (
  chain_key text primary key,
  display_name text not null,
  chain_family text not null,
  native_asset_symbol text,
  public_address_label text not null default 'address',
  address_case_sensitive boolean not null default true,
  supports_custodial_generation boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ref_chains (
  chain_key,
  display_name,
  chain_family,
  native_asset_symbol,
  public_address_label,
  address_case_sensitive,
  supports_custodial_generation,
  metadata
) values
  (
    'evm',
    'EVM',
    'evm',
    'ETH',
    'address',
    false,
    true,
    '{"defaultNetwork":"ethereum"}'::jsonb
  ),
  (
    'near',
    'NEAR',
    'near',
    'NEAR',
    'publicKey',
    false,
    true,
    '{"keyType":"ed25519"}'::jsonb
  ),
  (
    'solana',
    'Solana',
    'solana',
    'SOL',
    'publicKey',
    true,
    true,
    '{"keyType":"ed25519"}'::jsonb
  )
on conflict (chain_key) do update
set
  display_name = excluded.display_name,
  chain_family = excluded.chain_family,
  native_asset_symbol = excluded.native_asset_symbol,
  public_address_label = excluded.public_address_label,
  address_case_sensitive = excluded.address_case_sensitive,
  supports_custodial_generation = excluded.supports_custodial_generation,
  metadata = excluded.metadata,
  updated_at = now();

create table if not exists public.user_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete restrict,
  chain_key text not null references public.ref_chains(chain_key) on delete restrict,
  public_address text not null,
  public_address_normalized text not null,
  account_label text,
  account_kind text not null default 'generated',
  custody_status text not null default 'cubid_custodied',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_accounts_account_kind_check
    check (account_kind in ('generated')),
  constraint user_accounts_custody_status_check
    check (custody_status in ('cubid_custodied')),
  constraint user_accounts_status_check
    check (status in ('active', 'revoked', 'archived'))
);

create unique index if not exists user_accounts_chain_public_address_idx
  on public.user_accounts(chain_key, public_address_normalized);

create index if not exists user_accounts_user_chain_idx
  on public.user_accounts(user_id, chain_key, status);

create table if not exists public.dapp_user_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete cascade,
  user_account_id uuid not null references public.user_accounts(id) on delete cascade,
  dapp_id bigint not null references public.dapps(id) on delete restrict,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dapp_user_accounts_status_check
    check (status in ('active', 'revoked', 'archived'))
);

create unique index if not exists dapp_user_accounts_dapp_user_account_idx
  on public.dapp_user_accounts(dapp_user_uuid, user_account_id);

create index if not exists dapp_user_accounts_account_idx
  on public.dapp_user_accounts(user_account_id, status);

create index if not exists dapp_user_accounts_dapp_user_idx
  on public.dapp_user_accounts(dapp_id, dapp_user_uuid, status);

create table if not exists private.private_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  user_account_id uuid not null unique references public.user_accounts(id) on delete restrict,
  chain_key text not null references public.ref_chains(chain_key) on delete restrict,
  private_key_ciphertext text not null,
  private_key_iv text not null,
  private_key_auth_tag text not null,
  wrapped_data_key text not null,
  wrapped_data_key_iv text not null,
  wrapped_data_key_auth_tag text not null,
  encryption_algorithm text not null,
  encryption_key_id text not null,
  encryption_key_version integer not null,
  encryption_purpose text not null,
  encryption_context jsonb not null default '{}'::jsonb,
  encrypted_at timestamptz not null default now(),
  rotated_at timestamptz,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_keys_algorithm_check
    check (encryption_algorithm = 'aes-256-gcm-envelope'),
  constraint private_keys_key_version_check
    check (encryption_key_version > 0),
  constraint private_keys_status_check
    check (status in ('active', 'rotated', 'revoked', 'archived'))
);

create index if not exists private_keys_chain_status_idx
  on private.private_keys(chain_key, status);

alter table public.ref_chains enable row level security;
alter table public.user_accounts enable row level security;
alter table public.dapp_user_accounts enable row level security;
alter table private.private_keys enable row level security;

grant select on table public.ref_chains to service_role;
grant select, insert, update, delete on table public.user_accounts to service_role;
grant select, insert, update, delete on table public.dapp_user_accounts to service_role;
grant select, insert, update, delete on table private.private_keys to service_role;

revoke all on table private.private_keys from anon;
revoke all on table private.private_keys from authenticated;
revoke all on table private.private_keys from public;

create or replace function public.get_blockchain_private_key_wrapping_key_v1()
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
   where name = 'passport_blockchain_private_key_wrapping_key_v1'
   limit 1;

  if secret_value is null or length(secret_value) < 32 then
    raise exception 'Blockchain private-key wrapping key is not configured';
  end if;

  return secret_value;
end;
$$;

revoke all on function public.get_blockchain_private_key_wrapping_key_v1() from public;
grant execute on function public.get_blockchain_private_key_wrapping_key_v1() to service_role;
