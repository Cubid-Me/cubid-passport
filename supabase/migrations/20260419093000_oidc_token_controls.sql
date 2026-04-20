create table if not exists public.oidc_access_tokens (
  access_token_jti text primary key,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  session_id text not null references public.oidc_sessions (session_id) on delete cascade,
  consent_id text references public.oidc_consents (consent_id) on delete set null,
  consent_version integer,
  cubid_user_id bigint,
  human_subject_key text not null,
  pairwise_sub text not null,
  scope text not null,
  audience text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_access_tokens_client_id_idx
  on public.oidc_access_tokens (client_id);

create index if not exists oidc_access_tokens_session_id_idx
  on public.oidc_access_tokens (session_id);

create index if not exists oidc_access_tokens_expires_at_idx
  on public.oidc_access_tokens (expires_at);

create table if not exists public.oidc_rate_limit_buckets (
  bucket_key text primary key,
  route text not null,
  limit_key text not null,
  tier text not null default 'starter' check (tier in ('starter', 'trusted', 'internal')),
  count integer not null default 0,
  window_start timestamptz not null,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_rate_limit_buckets_route_key_idx
  on public.oidc_rate_limit_buckets (route, limit_key);

create index if not exists oidc_rate_limit_buckets_expires_at_idx
  on public.oidc_rate_limit_buckets (expires_at);
