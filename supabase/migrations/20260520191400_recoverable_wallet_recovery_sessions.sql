create extension if not exists pgcrypto with schema extensions;

create table if not exists public.recoverable_wallet_recovery_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  recovery_session_id text not null unique,
  dapp_id bigint not null references public.dapps(id) on delete cascade,
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  recovery_bundle_id text not null,
  provider_key text not null default 'cubid',
  status text not null default 'pending',
  request_id text,
  created_by_actor_identifier text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recoverable_wallet_recovery_sessions_status_check
    check (status in ('pending', 'released', 'expired', 'cancelled'))
);

create index if not exists recoverable_wallet_recovery_sessions_lookup_idx
  on public.recoverable_wallet_recovery_sessions (recovery_session_id, status);

create index if not exists recoverable_wallet_recovery_sessions_dapp_user_idx
  on public.recoverable_wallet_recovery_sessions (dapp_id, dapp_user_uuid, status);

create index if not exists recoverable_wallet_recovery_sessions_user_idx
  on public.recoverable_wallet_recovery_sessions (user_id, status);

alter table public.recoverable_wallet_recovery_sessions enable row level security;

revoke all on table public.recoverable_wallet_recovery_sessions from public;
revoke all on table public.recoverable_wallet_recovery_sessions from anon;
revoke all on table public.recoverable_wallet_recovery_sessions from authenticated;
grant select, insert, update, delete on table public.recoverable_wallet_recovery_sessions to service_role;
