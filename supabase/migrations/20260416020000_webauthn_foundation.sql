create table if not exists public.oidc_webauthn_credentials (
  credential_id text primary key,
  user_handle text not null,
  human_subject_key text not null references public.oidc_human_subjects (human_subject_key) on delete cascade,
  cubid_user_id bigint references public.users (id) on delete set null,
  credential_label text,
  public_key_cose text not null,
  authenticator_attachment text check (authenticator_attachment in ('platform', 'cross-platform')),
  authenticator_aaguid text,
  attestation_format text,
  attestation_type text,
  transports jsonb not null default '[]'::jsonb,
  backup_eligible boolean not null default false,
  backup_state boolean not null default false,
  sign_count bigint not null default 0,
  last_authenticated_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_webauthn_credentials_human_subject_key_idx
  on public.oidc_webauthn_credentials (human_subject_key);

create index if not exists oidc_webauthn_credentials_cubid_user_id_idx
  on public.oidc_webauthn_credentials (cubid_user_id);

create index if not exists oidc_webauthn_credentials_user_handle_idx
  on public.oidc_webauthn_credentials (user_handle);

create index if not exists oidc_webauthn_credentials_revoked_at_idx
  on public.oidc_webauthn_credentials (revoked_at);

create table if not exists public.oidc_webauthn_challenges (
  challenge_id text primary key,
  challenge text not null unique,
  challenge_type text not null check (challenge_type in ('registration', 'authentication')),
  login_challenge_id text references public.oidc_authorization_requests (login_challenge_id) on delete cascade,
  session_id text references public.oidc_sessions (session_id) on delete cascade,
  human_subject_key text references public.oidc_human_subjects (human_subject_key) on delete cascade,
  cubid_user_id bigint references public.users (id) on delete set null,
  user_handle text,
  rp_id text not null,
  user_verification text not null default 'preferred' check (user_verification in ('required', 'preferred', 'discouraged')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists oidc_webauthn_challenges_login_challenge_id_idx
  on public.oidc_webauthn_challenges (login_challenge_id);

create index if not exists oidc_webauthn_challenges_session_id_idx
  on public.oidc_webauthn_challenges (session_id);

create index if not exists oidc_webauthn_challenges_human_subject_key_idx
  on public.oidc_webauthn_challenges (human_subject_key);

create index if not exists oidc_webauthn_challenges_expires_at_idx
  on public.oidc_webauthn_challenges (expires_at);

alter table public.oidc_sessions
  add column if not exists webauthn_credential_id text references public.oidc_webauthn_credentials (credential_id) on delete set null;

create index if not exists oidc_sessions_webauthn_credential_id_idx
  on public.oidc_sessions (webauthn_credential_id);