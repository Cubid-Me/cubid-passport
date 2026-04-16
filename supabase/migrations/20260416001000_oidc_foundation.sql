create table if not exists public.oidc_clients (
  id bigserial primary key,
  client_id text not null unique,
  client_name text not null,
  client_type text not null check (client_type in ('public_web', 'confidential_web', 'native', 'device', 'backend_service')),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified_domain', 'internal')),
  token_endpoint_auth_method text not null check (token_endpoint_auth_method in ('none', 'client_secret_basic', 'client_secret_post', 'private_key_jwt')),
  redirect_uris jsonb not null default '[]'::jsonb,
  post_logout_redirect_uris jsonb not null default '[]'::jsonb,
  grant_types jsonb not null default '[]'::jsonb,
  default_scopes jsonb not null default '[]'::jsonb,
  allowed_scopes jsonb not null default '[]'::jsonb,
  rate_limit_tier text not null default 'starter' check (rate_limit_tier in ('starter', 'trusted', 'internal')),
  owner_account_id text,
  registration_client_uri text not null,
  registration_access_token_hash text not null,
  client_secret_hash text,
  secret_version integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  suspended_at timestamptz
);

create index if not exists oidc_clients_status_idx on public.oidc_clients (status);
create index if not exists oidc_clients_owner_account_id_idx on public.oidc_clients (owner_account_id);

create table if not exists public.oidc_signing_keys (
  key_id text primary key,
  algorithm text not null,
  public_jwk jsonb not null,
  private_key_ref text,
  status text not null default 'active' check (status in ('active', 'retiring', 'retired')),
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.oidc_human_subjects (
  human_subject_key text primary key,
  cubid_user_id bigint,
  primary_email text,
  primary_phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.oidc_sessions (
  session_id text primary key,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  cubid_user_id bigint,
  human_subject_key text,
  login_challenge_id text,
  consent_challenge_id text,
  authentication_methods jsonb not null default '[]'::jsonb,
  verified_email text,
  verified_phone text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_sessions_client_id_idx on public.oidc_sessions (client_id);
create index if not exists oidc_sessions_human_subject_key_idx on public.oidc_sessions (human_subject_key);

create table if not exists public.oidc_authorization_codes (
  code_id text primary key,
  authorization_code text not null unique,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  session_id text references public.oidc_sessions (session_id) on delete cascade,
  cubid_user_id bigint,
  human_subject_key text,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text not null,
  state text,
  nonce text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_authorization_codes_client_id_idx on public.oidc_authorization_codes (client_id);
create index if not exists oidc_authorization_codes_session_id_idx on public.oidc_authorization_codes (session_id);

create table if not exists public.oidc_refresh_tokens (
  refresh_token_id text primary key,
  refresh_token_hash text not null unique,
  token_family_id text not null,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  session_id text references public.oidc_sessions (session_id) on delete cascade,
  consent_id text,
  consent_version integer,
  cubid_user_id bigint,
  human_subject_key text,
  expires_at timestamptz not null,
  rotated_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_refresh_tokens_client_id_idx on public.oidc_refresh_tokens (client_id);
create index if not exists oidc_refresh_tokens_session_id_idx on public.oidc_refresh_tokens (session_id);

create table if not exists public.oidc_device_codes (
  device_code_id text primary key,
  device_code_hash text not null unique,
  user_code_hash text not null unique,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  session_id text references public.oidc_sessions (session_id) on delete cascade,
  scope text not null,
  verification_uri text not null,
  verification_uri_complete text,
  interval_seconds integer not null default 5,
  expires_at timestamptz not null,
  approved_at timestamptz,
  denied_at timestamptz,
  last_polled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_device_codes_client_id_idx on public.oidc_device_codes (client_id);

create table if not exists public.oidc_consents (
  consent_id text primary key,
  human_subject_key text not null,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  pairwise_sub text not null,
  granted_scopes jsonb not null default '[]'::jsonb,
  granted_claims jsonb not null default '[]'::jsonb,
  claim_classification_summary jsonb not null default '[]'::jsonb,
  consent_version integer not null,
  policy_version text not null default 'v1',
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by text check (revoked_by in ('user', 'operator')),
  source text not null default 'passport'
);

create unique index if not exists oidc_consents_subject_client_version_idx
  on public.oidc_consents (human_subject_key, client_id, consent_version);

create table if not exists public.oidc_audit_logs (
  id bigserial primary key,
  log_id text not null unique,
  client_id text,
  session_id text,
  event_type text not null,
  actor_type text not null,
  actor_identifier text,
  request_id text,
  outcome text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_audit_logs_client_id_idx on public.oidc_audit_logs (client_id);
create index if not exists oidc_audit_logs_event_type_idx on public.oidc_audit_logs (event_type);