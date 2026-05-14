create table if not exists public.notification_verification_challenges (
  id uuid primary key default extensions.gen_random_uuid(),
  channel_id uuid references public.user_notification_channels(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  channel_type text not null,
  provider_key text not null references public.notification_providers(provider_key) on delete restrict,
  challenge_hash text not null,
  hash_algorithm text not null default 'hmac-sha256',
  hash_version integer not null default 1,
  purpose text not null default 'notification_channel_verification',
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  replayed_at timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_verification_challenges_channel_type_check
    check (channel_type in ('email', 'telegram')),
  constraint notification_verification_challenges_hash_algorithm_check
    check (hash_algorithm in ('hmac-sha256')),
  constraint notification_verification_challenges_hash_version_check
    check (hash_version > 0),
  constraint notification_verification_challenges_status_check
    check (status in ('pending', 'consumed', 'expired', 'failed', 'revoked')),
  constraint notification_verification_challenges_attempt_check
    check (attempt_count >= 0 and max_attempts > 0 and attempt_count <= max_attempts)
);

create index if not exists notification_verification_pending_idx
  on public.notification_verification_challenges(user_id, channel_type, provider_key, expires_at)
  where status = 'pending' and consumed_at is null;

create index if not exists notification_verification_channel_idx
  on public.notification_verification_challenges(channel_id, status, created_at desc);

create index if not exists notification_verification_request_id_idx
  on public.notification_verification_challenges(request_id)
  where request_id is not null;

create table if not exists public.notification_app_policies (
  id uuid primary key default extensions.gen_random_uuid(),
  dapp_id bigint not null references public.dapps(id) on delete cascade,
  policy_name text not null default 'Default notification policy',
  policy_version integer not null default 1,
  status text not null default 'disabled',
  sandbox_mode boolean not null default true,
  allowed_categories text[] not null default '{}'::text[],
  allowed_priorities text[] not null default array['LOW', 'NORMAL']::text[],
  allowed_providers text[] not null default '{}'::text[],
  security_category_enabled boolean not null default false,
  minute_limit integer not null default 0,
  daily_limit integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_app_policies_policy_version_check
    check (policy_version > 0),
  constraint notification_app_policies_status_check
    check (status in ('disabled', 'enabled', 'suspended')),
  constraint notification_app_policies_limits_check
    check (minute_limit >= 0 and daily_limit >= 0),
  constraint notification_app_policies_categories_check
    check (
      allowed_categories <@ array['SECURITY', 'TRANSACTIONAL', 'WORKFLOW']::text[]
    ),
  constraint notification_app_policies_priorities_check
    check (
      allowed_priorities <@ array['LOW', 'NORMAL', 'HIGH', 'CRITICAL']::text[]
    ),
  constraint notification_app_policies_providers_check
    check (allowed_providers <@ array['email_smtp', 'telegram_bot']::text[]),
  constraint notification_app_policies_security_gate_check
    check (
      security_category_enabled is true
      or not ('SECURITY' = any(allowed_categories))
    )
);

create unique index if not exists notification_app_policies_dapp_idx
  on public.notification_app_policies(dapp_id);

create index if not exists notification_app_policies_status_idx
  on public.notification_app_policies(status, sandbox_mode);

alter table public.notification_verification_challenges enable row level security;
alter table public.notification_app_policies enable row level security;

grant select, insert, update, delete on table public.notification_verification_challenges to service_role;
grant select, insert, update, delete on table public.notification_app_policies to service_role;

revoke all on table public.notification_verification_challenges from public, anon, authenticated;
revoke all on table public.notification_app_policies from public, anon, authenticated;

comment on table public.notification_verification_challenges is
  'One-time verification sessions for flexible messaging channels. Stores only challenge hashes, expiry, attempt counts, and replay evidence.';

comment on table public.notification_app_policies is
  'App-level flexible messaging policy and quota controls. Provider registry enablement, app policy, user grants, and verified channels are all required before delivery.';
