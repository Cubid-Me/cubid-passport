create table if not exists public.api_idempotency_keys (
  id bigserial primary key,
  route text not null,
  actor_type text not null,
  actor_identifier text not null,
  idempotency_key text not null,
  request_hash text not null,
  status text not null check (status in ('pending', 'completed', 'failed')),
  response_status integer,
  response_body jsonb,
  request_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  unique (route, actor_type, actor_identifier, idempotency_key)
);

create index if not exists api_idempotency_keys_expires_at_idx
  on public.api_idempotency_keys (expires_at);

create index if not exists api_idempotency_keys_request_id_idx
  on public.api_idempotency_keys (request_id)
  where request_id is not null;

alter table public.api_idempotency_keys enable row level security;

revoke all on public.api_idempotency_keys from anon;
revoke all on public.api_idempotency_keys from authenticated;
grant select, insert, update, delete on public.api_idempotency_keys to service_role;
grant usage, select on sequence public.api_idempotency_keys_id_seq to service_role;
