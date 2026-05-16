create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create table if not exists public.notification_categories (
  category_key text primary key,
  display_name text not null,
  description text,
  status text not null default 'active',
  default_priority text not null default 'NORMAL',
  requires_explicit_grant boolean not null default true,
  marketing_like boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_categories_status_check
    check (status in ('active', 'disabled')),
  constraint notification_categories_default_priority_check
    check (default_priority in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'))
);

insert into public.notification_categories (
  category_key,
  display_name,
  description,
  default_priority,
  requires_explicit_grant,
  marketing_like
) values
  (
    'SECURITY',
    'Security',
    'Identity, account, recovery, login, suspicious-activity, and verification security notifications.',
    'CRITICAL',
    true,
    false
  ),
  (
    'TRANSACTIONAL',
    'Transactional',
    'Receipts, contract events, escrow updates, payment status, and other user-requested transactional notifications.',
    'HIGH',
    true,
    false
  ),
  (
    'WORKFLOW',
    'Workflow',
    'Task, proposal, form, approval, voting, and collaboration workflow notifications.',
    'NORMAL',
    true,
    false
  )
on conflict (category_key) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  default_priority = excluded.default_priority,
  requires_explicit_grant = excluded.requires_explicit_grant,
  marketing_like = excluded.marketing_like,
  updated_at = now();

create table if not exists public.notification_providers (
  provider_key text primary key,
  display_name text not null,
  channel_type text not null,
  status text not null default 'disabled',
  supports_verification boolean not null default true,
  supports_delivery boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_providers_channel_type_check
    check (channel_type in ('email', 'telegram')),
  constraint notification_providers_status_check
    check (status in ('active', 'disabled', 'suspended'))
);

insert into public.notification_providers (
  provider_key,
  display_name,
  channel_type,
  status,
  supports_verification,
  supports_delivery
) values
  ('email_smtp', 'Email', 'email', 'disabled', true, true),
  ('telegram_bot', 'Telegram', 'telegram', 'disabled', true, true)
on conflict (provider_key) do update
set
  display_name = excluded.display_name,
  channel_type = excluded.channel_type,
  supports_verification = excluded.supports_verification,
  supports_delivery = excluded.supports_delivery,
  updated_at = now();

create table if not exists public.user_notification_channels (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  channel_type text not null,
  provider_key text not null references public.notification_providers(provider_key) on delete restrict,
  label text,
  display_hint text,
  verification_status text not null default 'pending',
  status text not null default 'active',
  is_default boolean not null default false,
  muted_until timestamptz,
  paused_until timestamptz,
  verified_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notification_channels_channel_type_check
    check (channel_type in ('email', 'telegram')),
  constraint user_notification_channels_verification_status_check
    check (verification_status in ('pending', 'verified', 'failed', 'revoked')),
  constraint user_notification_channels_status_check
    check (status in ('active', 'muted', 'paused', 'revoked', 'archived')),
  constraint user_notification_channels_provider_type_match
    check (
      (provider_key = 'email_smtp' and channel_type = 'email')
      or (provider_key = 'telegram_bot' and channel_type = 'telegram')
    )
);

create index if not exists user_notification_channels_user_idx
  on public.user_notification_channels(user_id, status, channel_type);

create unique index if not exists user_notification_channels_default_type_idx
  on public.user_notification_channels(user_id, channel_type)
  where is_default is true and status in ('active', 'muted', 'paused');

create table if not exists private.notification_channel_destinations (
  id uuid primary key default extensions.gen_random_uuid(),
  channel_id uuid not null unique references public.user_notification_channels(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  channel_type text not null,
  destination_ciphertext text not null,
  destination_iv text not null,
  destination_auth_tag text not null,
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
  constraint notification_channel_destinations_channel_type_check
    check (channel_type in ('email', 'telegram')),
  constraint notification_channel_destinations_algorithm_check
    check (encryption_algorithm = 'aes-256-gcm-envelope'),
  constraint notification_channel_destinations_key_version_check
    check (encryption_key_version > 0),
  constraint notification_channel_destinations_status_check
    check (status in ('active', 'rotated', 'revoked', 'archived'))
);

create index if not exists notification_channel_destinations_user_type_idx
  on private.notification_channel_destinations(user_id, channel_type, status);

create table if not exists public.notification_app_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  dapp_id bigint not null references public.dapps(id) on delete cascade,
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  category_key text not null references public.notification_categories(category_key) on delete restrict,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_app_grants_status_check
    check (status in ('active', 'revoked', 'expired'))
);

create unique index if not exists notification_app_grants_active_idx
  on public.notification_app_grants(dapp_id, dapp_user_uuid, category_key)
  where status = 'active';

create index if not exists notification_app_grants_user_idx
  on public.notification_app_grants(user_id, dapp_id, status);

create table if not exists public.notification_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id bigint not null references public.users(id) on delete cascade,
  dapp_id bigint references public.dapps(id) on delete cascade,
  category_key text not null references public.notification_categories(category_key) on delete restrict,
  channel_id uuid references public.user_notification_channels(id) on delete set null,
  status text not null default 'active',
  muted_until timestamptz,
  paused_until timestamptz,
  priority_floor text not null default 'LOW',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_status_check
    check (status in ('active', 'muted', 'paused', 'revoked')),
  constraint notification_preferences_priority_floor_check
    check (priority_floor in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'))
);

create unique index if not exists notification_preferences_user_app_category_idx
  on public.notification_preferences(user_id, coalesce(dapp_id, 0), category_key);

create index if not exists notification_preferences_channel_idx
  on public.notification_preferences(channel_id, status);

create table if not exists public.notification_events (
  id uuid primary key default extensions.gen_random_uuid(),
  idempotency_key_id bigint references public.api_idempotency_keys(id) on delete set null,
  dapp_id bigint not null references public.dapps(id) on delete restrict,
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete restrict,
  user_id bigint not null references public.users(id) on delete restrict,
  category_key text not null references public.notification_categories(category_key) on delete restrict,
  priority text not null,
  title text not null,
  body text not null,
  deep_link text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'accepted',
  selected_channel_id uuid references public.user_notification_channels(id) on delete set null,
  selected_channel_type text,
  request_id text,
  denied_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_events_priority_check
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  constraint notification_events_status_check
    check (status in ('accepted', 'denied', 'queued', 'delivered', 'failed', 'muted', 'rate_limited', 'provider_disabled')),
  constraint notification_events_selected_channel_type_check
    check (selected_channel_type is null or selected_channel_type in ('email', 'telegram'))
);

create index if not exists notification_events_dapp_user_idx
  on public.notification_events(dapp_id, dapp_user_uuid, created_at desc);

create index if not exists notification_events_user_idx
  on public.notification_events(user_id, created_at desc);

create index if not exists notification_events_request_id_idx
  on public.notification_events(request_id);

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  channel_id uuid references public.user_notification_channels(id) on delete set null,
  provider_key text not null references public.notification_providers(provider_key) on delete restrict,
  attempt_number integer not null default 1,
  status text not null default 'queued',
  provider_message_id text,
  error_code text,
  error_message text,
  attempted_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_delivery_attempts_attempt_number_check
    check (attempt_number > 0),
  constraint notification_delivery_attempts_status_check
    check (status in ('queued', 'sent', 'delivered', 'failed', 'provider_disabled', 'skipped'))
);

create index if not exists notification_delivery_attempts_event_idx
  on public.notification_delivery_attempts(event_id, attempt_number);

create index if not exists notification_delivery_attempts_provider_status_idx
  on public.notification_delivery_attempts(provider_key, status, created_at desc);

alter table public.notification_categories enable row level security;
alter table public.notification_providers enable row level security;
alter table public.user_notification_channels enable row level security;
alter table private.notification_channel_destinations enable row level security;
alter table public.notification_app_grants enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_delivery_attempts enable row level security;

grant select, insert, update, delete on table public.notification_categories to service_role;
grant select, insert, update, delete on table public.notification_providers to service_role;
grant select, insert, update, delete on table public.user_notification_channels to service_role;
grant select, insert, update, delete on table private.notification_channel_destinations to service_role;
grant select, insert, update, delete on table public.notification_app_grants to service_role;
grant select, insert, update, delete on table public.notification_preferences to service_role;
grant select, insert, update, delete on table public.notification_events to service_role;
grant select, insert, update, delete on table public.notification_delivery_attempts to service_role;

revoke all on table public.notification_categories from public, anon, authenticated;
revoke all on table public.notification_providers from public, anon, authenticated;
revoke all on table public.user_notification_channels from public, anon, authenticated;
revoke all on table private.notification_channel_destinations from public, anon, authenticated;
revoke all on table public.notification_app_grants from public, anon, authenticated;
revoke all on table public.notification_preferences from public, anon, authenticated;
revoke all on table public.notification_events from public, anon, authenticated;
revoke all on table public.notification_delivery_attempts from public, anon, authenticated;

create or replace function public.get_notification_channel_wrapping_key_v1()
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
   where name = 'passport_notification_channel_wrapping_key_v1'
   limit 1;

  if secret_value is null or length(secret_value) < 43 then
    raise exception 'passport_notification_channel_wrapping_key_v1 is missing from Supabase Vault'
      using errcode = '22023';
  end if;

  return secret_value;
end;
$$;

revoke all on function public.get_notification_channel_wrapping_key_v1() from public;
grant execute on function public.get_notification_channel_wrapping_key_v1() to service_role;

comment on table public.user_notification_channels is
  'Public, non-secret metadata for user-owned flexible messaging channels. Raw destinations live encrypted in private.notification_channel_destinations.';

comment on table private.notification_channel_destinations is
  'Service-role-only encrypted custody table for retrievable notification channel destinations such as email addresses and Telegram chat identifiers.';

comment on table public.notification_events is
  'Immutable app-scoped flexible messaging event records. Events must not expose raw channel destinations or provider secrets.';
