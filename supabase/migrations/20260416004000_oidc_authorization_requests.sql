create table if not exists public.oidc_authorization_requests (
  request_id text primary key,
  login_challenge_id text not null unique,
  consent_challenge_id text unique,
  client_id text not null references public.oidc_clients (client_id) on delete cascade,
  session_id text references public.oidc_sessions (session_id) on delete set null,
  status text not null check (status in ('pending_login', 'pending_consent', 'approved', 'denied', 'expired')),
  response_type text not null default 'code',
  redirect_uri text not null,
  scope text not null,
  requested_claims jsonb not null default '[]'::jsonb,
  state text,
  nonce text,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  login_hint text,
  prompt text,
  expires_at timestamptz not null,
  authenticated_at timestamptz,
  approved_at timestamptz,
  denied_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_authorization_requests_client_id_idx
  on public.oidc_authorization_requests (client_id);

create index if not exists oidc_authorization_requests_session_id_idx
  on public.oidc_authorization_requests (session_id);

create index if not exists oidc_authorization_requests_status_idx
  on public.oidc_authorization_requests (status);