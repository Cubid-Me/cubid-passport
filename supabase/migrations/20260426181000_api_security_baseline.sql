create table if not exists public.api_rate_limit_buckets (
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

create index if not exists api_rate_limit_buckets_route_key_idx
  on public.api_rate_limit_buckets (route, limit_key);

create index if not exists api_rate_limit_buckets_expires_at_idx
  on public.api_rate_limit_buckets (expires_at);

create or replace function public.increment_api_rate_limit_bucket(
  p_bucket_key text,
  p_route text,
  p_limit_key text,
  p_tier text,
  p_window_start timestamptz,
  p_expires_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  insert into public.api_rate_limit_buckets (
    bucket_key,
    route,
    limit_key,
    tier,
    count,
    window_start,
    expires_at,
    metadata,
    updated_at
  )
  values (
    p_bucket_key,
    p_route,
    p_limit_key,
    p_tier,
    1,
    p_window_start,
    p_expires_at,
    coalesce(p_metadata, '{}'::jsonb),
    timezone('utc', now())
  )
  on conflict (bucket_key) do update
    set count = public.api_rate_limit_buckets.count + 1,
        route = excluded.route,
        limit_key = excluded.limit_key,
        tier = excluded.tier,
        expires_at = excluded.expires_at,
        metadata = excluded.metadata,
        updated_at = timezone('utc', now())
  returning count into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_api_rate_limit_bucket(
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  jsonb
) from public;
grant execute on function public.increment_api_rate_limit_bucket(
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  jsonb
) to service_role;

create table if not exists public.api_security_events (
  id bigserial primary key,
  event_id text not null unique,
  route text not null,
  event_type text not null,
  actor_type text not null,
  actor_identifier text,
  request_id text,
  outcome text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists api_security_events_route_idx
  on public.api_security_events (route);

create index if not exists api_security_events_event_type_idx
  on public.api_security_events (event_type);

create index if not exists api_security_events_request_id_idx
  on public.api_security_events (request_id);
