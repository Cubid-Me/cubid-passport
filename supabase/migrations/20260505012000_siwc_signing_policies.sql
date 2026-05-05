create table if not exists public.siwc_signing_policies (
  id uuid primary key default extensions.gen_random_uuid(),
  dapp_id bigint not null references public.dapps(id) on delete cascade,
  policy_name text not null default 'Default SIWC policy',
  policy_version integer not null default 1,
  status text not null default 'disabled',
  custody_enabled boolean not null default false,
  signing_enabled boolean not null default false,
  sandbox_mode boolean not null default true,
  allowed_chains text[] not null default '{}'::text[],
  allowed_request_types text[] not null default '{}'::text[],
  required_acr text,
  transaction_value_limit_usd numeric(18, 2),
  contract_allowlist text[] not null default '{}'::text[],
  webhook_event_subscriptions text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint siwc_signing_policies_dapp_unique unique (dapp_id),
  constraint siwc_signing_policies_version_positive
    check (policy_version > 0),
  constraint siwc_signing_policies_status_check
    check (status in ('disabled', 'enabled', 'suspended')),
  constraint siwc_signing_policies_chains_check
    check (allowed_chains <@ array['evm', 'near', 'solana', 'sui']::text[]),
  constraint siwc_signing_policies_request_types_check
    check (allowed_request_types <@ array['message', 'typed_data', 'transaction']::text[]),
  constraint siwc_signing_policies_required_acr_check
    check (required_acr is null or required_acr = 'urn:cubid:acr:passkey'),
  constraint siwc_signing_policies_signing_requires_acr
    check (signing_enabled = false or required_acr = 'urn:cubid:acr:passkey'),
  constraint siwc_signing_policies_value_limit_positive
    check (transaction_value_limit_usd is null or transaction_value_limit_usd >= 0)
);

create index if not exists siwc_signing_policies_status_idx
  on public.siwc_signing_policies(status);

create index if not exists siwc_signing_policies_updated_idx
  on public.siwc_signing_policies(updated_at desc);

alter table public.siwc_signing_policies enable row level security;

grant select, insert, update, delete on table public.siwc_signing_policies to service_role;
revoke all on table public.siwc_signing_policies from anon;
revoke all on table public.siwc_signing_policies from authenticated;
revoke all on table public.siwc_signing_policies from public;
