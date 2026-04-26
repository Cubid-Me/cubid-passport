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
