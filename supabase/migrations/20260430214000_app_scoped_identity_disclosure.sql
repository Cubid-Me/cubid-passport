create table if not exists public.app_scoped_subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  subject_type text not null check (subject_type in ('human', 'agent', 'organization')),
  app_identifier text not null,
  app_scoped_subject text not null,
  dapp_id bigint references public.dapps (id) on update cascade on delete cascade,
  dapp_user_uuid uuid references public.dapp_users (uuid) on update cascade on delete set null,
  cubid_user_id bigint references public.users (id) on update cascade on delete set null,
  actor_profile_id uuid references public.actor_profiles (id) on update cascade on delete set null,
  derivation_version text not null default 'v1',
  status text not null default 'active' check (status in ('active', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint app_scoped_subjects_app_subject_key unique (app_identifier, app_scoped_subject),
  constraint app_scoped_subjects_app_link check (
    dapp_id is not null
    or app_identifier like 'oidc:%'
    or app_identifier like 'internal:%'
  )
);

create index if not exists app_scoped_subjects_dapp_user_uuid_idx
  on public.app_scoped_subjects (dapp_user_uuid)
  where dapp_user_uuid is not null;

create index if not exists app_scoped_subjects_cubid_user_id_idx
  on public.app_scoped_subjects (cubid_user_id)
  where cubid_user_id is not null;

create table if not exists public.selective_disclosure_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  app_scoped_subject_id uuid not null references public.app_scoped_subjects (id) on delete cascade,
  dapp_id bigint references public.dapps (id) on update cascade on delete cascade,
  oidc_client_id text references public.oidc_clients (client_id) on update cascade on delete cascade,
  source text not null check (source in ('allow_page', 'oidc', 'api', 'webhook')),
  grant_fingerprint text not null,
  granted_scopes text[] not null default array[]::text[],
  granted_claims jsonb not null default '[]'::jsonb,
  policy_version text not null,
  consent_version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by text check (revoked_by is null or revoked_by in ('user', 'operator', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint selective_disclosure_grants_client_scope check (
    dapp_id is not null
    or oidc_client_id is not null
  )
);

create index if not exists selective_disclosure_grants_subject_idx
  on public.selective_disclosure_grants (app_scoped_subject_id, status);

create index if not exists selective_disclosure_grants_dapp_idx
  on public.selective_disclosure_grants (dapp_id, status)
  where dapp_id is not null;

create index if not exists selective_disclosure_grants_oidc_client_idx
  on public.selective_disclosure_grants (oidc_client_id, status)
  where oidc_client_id is not null;

create table if not exists public.selective_disclosure_events (
  id uuid primary key default extensions.gen_random_uuid(),
  app_scoped_subject_id uuid references public.app_scoped_subjects (id) on delete set null,
  disclosure_grant_id uuid references public.selective_disclosure_grants (id) on delete set null,
  event_type text not null,
  actor_type text not null,
  actor_identifier text,
  request_id text,
  outcome text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists selective_disclosure_events_subject_idx
  on public.selective_disclosure_events (app_scoped_subject_id, created_at desc);

create index if not exists selective_disclosure_events_request_id_idx
  on public.selective_disclosure_events (request_id)
  where request_id is not null;

alter table public.app_scoped_subjects enable row level security;
alter table public.selective_disclosure_grants enable row level security;
alter table public.selective_disclosure_events enable row level security;

revoke all on table public.app_scoped_subjects from anon;
revoke all on table public.app_scoped_subjects from authenticated;
revoke all on table public.app_scoped_subjects from public;
grant select, insert, update, delete on table public.app_scoped_subjects to service_role;

revoke all on table public.selective_disclosure_grants from anon;
revoke all on table public.selective_disclosure_grants from authenticated;
revoke all on table public.selective_disclosure_grants from public;
grant select, insert, update, delete on table public.selective_disclosure_grants to service_role;

revoke all on table public.selective_disclosure_events from anon;
revoke all on table public.selective_disclosure_events from authenticated;
revoke all on table public.selective_disclosure_events from public;
grant select, insert, update, delete on table public.selective_disclosure_events to service_role;
