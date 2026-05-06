create table if not exists public.siwc_signing_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  signing_request_id text not null unique,
  dapp_id bigint not null references public.dapps(id) on delete cascade,
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete cascade,
  dapp_user_account_id uuid not null references public.dapp_user_accounts(id) on delete restrict,
  user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  user_id bigint not null references public.users(id) on delete restrict,
  chain_key text not null references public.ref_chains(chain_key) on delete restrict,
  request_type text not null,
  status text not null,
  payload_hash text not null,
  payload jsonb not null,
  payload_summary jsonb not null default '{}'::jsonb,
  policy_version integer not null default 0,
  required_acr text,
  idempotency_key text,
  result jsonb,
  error_code text,
  error_message text,
  request_id_header text,
  approved_by_firebase_uid text,
  approved_at timestamptz,
  rejected_by_firebase_uid text,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint siwc_signing_requests_type_check
    check (request_type in ('message', 'typed_data', 'transaction')),
  constraint siwc_signing_requests_status_check
    check (status in (
      'policy_denied',
      'pending_user_approval',
      'approved',
      'rejected',
      'expired',
      'signing',
      'completed',
      'failed',
      'cancelled'
    )),
  constraint siwc_signing_requests_required_acr_check
    check (required_acr is null or required_acr = 'urn:cubid:acr:passkey'),
  constraint siwc_signing_requests_payload_hash_check
    check (payload_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists siwc_signing_requests_dapp_status_idx
  on public.siwc_signing_requests(dapp_id, status, created_at desc);

create index if not exists siwc_signing_requests_dapp_user_idx
  on public.siwc_signing_requests(dapp_id, dapp_user_uuid, created_at desc);

create index if not exists siwc_signing_requests_user_status_idx
  on public.siwc_signing_requests(user_id, status, created_at desc);

create index if not exists siwc_signing_requests_account_idx
  on public.siwc_signing_requests(user_account_id, created_at desc);

alter table public.siwc_signing_requests enable row level security;

grant select, insert, update, delete on table public.siwc_signing_requests to service_role;
revoke all on table public.siwc_signing_requests from anon;
revoke all on table public.siwc_signing_requests from authenticated;
revoke all on table public.siwc_signing_requests from public;
