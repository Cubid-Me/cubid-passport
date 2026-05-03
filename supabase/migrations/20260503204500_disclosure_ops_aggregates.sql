create index if not exists selective_disclosure_grants_status_source_idx
  on public.selective_disclosure_grants (status, source);

create index if not exists selective_disclosure_grants_dapp_updated_idx
  on public.selective_disclosure_grants (dapp_id, updated_at desc)
  where dapp_id is not null;

create index if not exists selective_disclosure_grants_oidc_client_updated_idx
  on public.selective_disclosure_grants (oidc_client_id, updated_at desc)
  where oidc_client_id is not null;

create index if not exists selective_disclosure_events_created_idx
  on public.selective_disclosure_events (created_at desc);

create or replace function public.get_disclosure_ops_grant_totals()
returns table (
  source text,
  status text,
  grant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    grants.source,
    grants.status,
    count(*)::bigint as grant_count
  from public.selective_disclosure_grants grants
  group by grants.source, grants.status;
$$;

revoke all on function public.get_disclosure_ops_grant_totals() from public;
grant execute on function public.get_disclosure_ops_grant_totals() to service_role;

create or replace function public.get_disclosure_ops_active_subject_count()
returns table (
  active_subject_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint as active_subject_count
  from public.app_scoped_subjects subjects
  where subjects.status = 'active';
$$;

revoke all on function public.get_disclosure_ops_active_subject_count() from public;
grant execute on function public.get_disclosure_ops_active_subject_count() to service_role;

create or replace function public.get_disclosure_ops_recent_event_count(
  p_since timestamptz
)
returns table (
  event_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint as event_count
  from public.selective_disclosure_events events
  where events.created_at >= p_since;
$$;

revoke all on function public.get_disclosure_ops_recent_event_count(timestamptz) from public;
grant execute on function public.get_disclosure_ops_recent_event_count(timestamptz) to service_role;

create or replace function public.get_disclosure_ops_dapp_summaries()
returns table (
  dapp_id bigint,
  app_name text,
  active_grant_count bigint,
  revoked_grant_count bigint,
  active_subject_count bigint,
  last_granted_at timestamptz,
  last_revoked_at timestamptz,
  sources jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with grant_counts as (
    select
      grants.dapp_id,
      count(*) filter (where grants.status = 'active')::bigint as active_grant_count,
      count(*) filter (where grants.status = 'revoked')::bigint as revoked_grant_count,
      max(grants.granted_at) as last_granted_at,
      max(grants.revoked_at) as last_revoked_at
    from public.selective_disclosure_grants grants
    where grants.dapp_id is not null
    group by grants.dapp_id
  ),
  source_counts as (
    select
      grants.dapp_id,
      grants.source,
      count(*)::bigint as source_count
    from public.selective_disclosure_grants grants
    where grants.dapp_id is not null
    group by grants.dapp_id, grants.source
  ),
  source_json as (
    select
      source_counts.dapp_id,
      jsonb_object_agg(source_counts.source, source_counts.source_count) as sources
    from source_counts
    group by source_counts.dapp_id
  ),
  subject_counts as (
    select
      subjects.dapp_id,
      count(distinct subjects.id)::bigint as active_subject_count
    from public.app_scoped_subjects subjects
    where subjects.dapp_id is not null
      and subjects.status = 'active'
    group by subjects.dapp_id
  )
  select
    grant_counts.dapp_id,
    coalesce(dapps.appname, ('Dapp ' || grant_counts.dapp_id::text)) as app_name,
    grant_counts.active_grant_count,
    grant_counts.revoked_grant_count,
    coalesce(subject_counts.active_subject_count, 0)::bigint as active_subject_count,
    grant_counts.last_granted_at,
    grant_counts.last_revoked_at,
    coalesce(source_json.sources, '{}'::jsonb) as sources
  from grant_counts
  left join public.dapps dapps
    on dapps.id = grant_counts.dapp_id
  left join subject_counts
    on subject_counts.dapp_id = grant_counts.dapp_id
  left join source_json
    on source_json.dapp_id = grant_counts.dapp_id
  order by grant_counts.active_grant_count desc, grant_counts.revoked_grant_count desc;
$$;

revoke all on function public.get_disclosure_ops_dapp_summaries() from public;
grant execute on function public.get_disclosure_ops_dapp_summaries() to service_role;

create or replace function public.get_disclosure_ops_oidc_client_summaries()
returns table (
  client_id text,
  client_name text,
  active_grant_count bigint,
  revoked_grant_count bigint,
  last_granted_at timestamptz,
  last_revoked_at timestamptz,
  sources jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with grant_counts as (
    select
      grants.oidc_client_id,
      count(*) filter (where grants.status = 'active')::bigint as active_grant_count,
      count(*) filter (where grants.status = 'revoked')::bigint as revoked_grant_count,
      max(grants.granted_at) as last_granted_at,
      max(grants.revoked_at) as last_revoked_at
    from public.selective_disclosure_grants grants
    where grants.oidc_client_id is not null
    group by grants.oidc_client_id
  ),
  source_counts as (
    select
      grants.oidc_client_id,
      grants.source,
      count(*)::bigint as source_count
    from public.selective_disclosure_grants grants
    where grants.oidc_client_id is not null
    group by grants.oidc_client_id, grants.source
  ),
  source_json as (
    select
      source_counts.oidc_client_id,
      jsonb_object_agg(source_counts.source, source_counts.source_count) as sources
    from source_counts
    group by source_counts.oidc_client_id
  )
  select
    grant_counts.oidc_client_id as client_id,
    coalesce(clients.client_name, grant_counts.oidc_client_id) as client_name,
    grant_counts.active_grant_count,
    grant_counts.revoked_grant_count,
    grant_counts.last_granted_at,
    grant_counts.last_revoked_at,
    coalesce(source_json.sources, '{}'::jsonb) as sources
  from grant_counts
  left join public.oidc_clients clients
    on clients.client_id = grant_counts.oidc_client_id
  left join source_json
    on source_json.oidc_client_id = grant_counts.oidc_client_id
  order by grant_counts.active_grant_count desc, grant_counts.revoked_grant_count desc;
$$;

revoke all on function public.get_disclosure_ops_oidc_client_summaries() from public;
grant execute on function public.get_disclosure_ops_oidc_client_summaries() to service_role;
