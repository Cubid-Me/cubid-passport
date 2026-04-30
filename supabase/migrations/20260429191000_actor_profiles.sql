create table if not exists public.actor_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  firebase_uid text not null,
  actor_type text not null check (actor_type in ('human', 'agent', 'organization')),
  display_name text,
  organization_kind text check (
    organization_kind is null
    or organization_kind in (
      'formal_organization',
      'team',
      'group',
      'network',
      'community',
      'collective',
      'other'
    )
  ),
  agent_affiliation_type text check (
    agent_affiliation_type is null
    or agent_affiliation_type in (
      'standalone',
      'human_supported',
      'organization_supported'
    )
  ),
  supported_human_subject_key text,
  organization_subject_key text,
  affiliation_description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actor_profiles_firebase_uid_key unique (firebase_uid),
  constraint actor_profiles_organization_shape check (
    (actor_type = 'organization' and organization_kind is not null)
    or (actor_type <> 'organization' and organization_kind is null)
  ),
  constraint actor_profiles_agent_shape check (
    (actor_type = 'agent' and agent_affiliation_type is not null)
    or (
      actor_type <> 'agent'
      and agent_affiliation_type is null
      and supported_human_subject_key is null
      and organization_subject_key is null
      and affiliation_description is null
    )
  )
);

create index if not exists actor_profiles_actor_type_idx
  on public.actor_profiles (actor_type);

create index if not exists actor_profiles_organization_kind_idx
  on public.actor_profiles (organization_kind)
  where organization_kind is not null;

alter table public.actor_profiles enable row level security;

revoke all on table public.actor_profiles from anon;
revoke all on table public.actor_profiles from authenticated;
revoke all on table public.actor_profiles from public;
grant select, insert, update, delete on table public.actor_profiles to service_role;
