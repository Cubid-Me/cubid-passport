create table if not exists public.clearpass_verification_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  dapp_user_uuid uuid not null references public.dapp_users(uuid) on delete cascade,
  dapp_id bigint not null references public.dapps(id) on delete cascade,
  page_id bigint references public.dapp_pages(id) on delete set null,
  user_id bigint not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'verified', 'failed', 'expired')),
  requested_scopes jsonb not null default '["cubid:stamps"]'::jsonb,
  requested_claims jsonb not null default '["stamp:clearpass_verify"]'::jsonb,
  return_to text,
  provider_verification_id text,
  provider_status text,
  derived_claims jsonb not null default '{}'::jsonb,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clearpass_verification_sessions enable row level security;
revoke all on public.clearpass_verification_sessions from anon, authenticated;
grant select, insert, update, delete on public.clearpass_verification_sessions to service_role;

create index if not exists clearpass_verification_sessions_dapp_user_idx
  on public.clearpass_verification_sessions (dapp_user_uuid, created_at desc);

create index if not exists clearpass_verification_sessions_status_expiry_idx
  on public.clearpass_verification_sessions (status, expires_at);

insert into public.stamptypes (
  id,
  stamptype,
  stampcategory,
  salt,
  is_auth_enabled,
  is_score_enabled,
  v2stamptype,
  format,
  example,
  highlevel,
  fields_to_use,
  is_app_scoped,
  validation_method,
  is_in_blacklist,
  short_description,
  "Notes"
)
values (
  71,
  'clearpass_verify',
  'kyc',
  'clearpass-verify-v1',
  false,
  true,
  'clearpass_verify',
  'third_party_verification',
  'ver_123',
  'Third-party identity verification by ClearPass.',
  '{"accepted_claims":["legal_name","age","is_over_18","is_over_21","country","state"],"provider":"clearpass","raw_document_storage":false}'::jsonb,
  true,
  'signed_clearpass_redirect',
  true,
  'ClearPass Verify third-party KYC/personhood stamp.',
  'ClearPass remains a third-party provider. Cubid stores only derived claims and verification metadata, never document or biometric payloads.'
)
on conflict (id) do update set
  stamptype = excluded.stamptype,
  stampcategory = excluded.stampcategory,
  is_score_enabled = excluded.is_score_enabled,
  v2stamptype = excluded.v2stamptype,
  format = excluded.format,
  highlevel = excluded.highlevel,
  fields_to_use = excluded.fields_to_use,
  is_app_scoped = excluded.is_app_scoped,
  validation_method = excluded.validation_method,
  short_description = excluded.short_description,
  "Notes" = excluded."Notes";

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stampscores_available'
      and column_name = 'is_GP_replacement'
  ) then
    insert into public.stampscores_available (
      schema_id,
      stamptype_id,
      is_simple_stamp,
      description,
      criteria,
      "is_GP_replacement",
      score
    )
    select
      schemas.id,
      71,
      true,
      'High-value ClearPass third-party KYC/personhood verification.',
      'Active clearpass_verify stamp created from a signed ClearPass completion token.',
      false,
      25
    from public.stampscore_schemas schemas
    where not exists (
      select 1
      from public.stampscores_available existing
      where existing.schema_id = schemas.id
        and existing.stamptype_id = 71
    );
  else
    insert into public.stampscores_available (
      schema_id,
      stamptype_id,
      is_simple_stamp,
      description,
      criteria,
      score
    )
    select
      schemas.id,
      71,
      true,
      'High-value ClearPass third-party KYC/personhood verification.',
      'Active clearpass_verify stamp created from a signed ClearPass completion token.',
      25
    from public.stampscore_schemas schemas
    where not exists (
      select 1
      from public.stampscores_available existing
      where existing.schema_id = schemas.id
        and existing.stamptype_id = 71
    );
  end if;
end $$;
