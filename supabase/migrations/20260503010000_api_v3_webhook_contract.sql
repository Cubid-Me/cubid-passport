alter table if exists public.webhook_events
  add column if not exists event_id text,
  add column if not exists api_version text,
  add column if not exists payload_version text;

create unique index if not exists webhook_events_dapp_event_id_idx
  on public.webhook_events (dapp_id, event_id)
  where event_id is not null;

create index if not exists webhook_events_api_version_idx
  on public.webhook_events (api_version)
  where api_version is not null;

alter table if exists public.webhook_event_deliveries
  add column if not exists request_body jsonb,
  add column if not exists request_headers jsonb,
  add column if not exists event_id text,
  add column if not exists signature_version text;

create index if not exists webhook_event_deliveries_event_id_idx
  on public.webhook_event_deliveries (event_id)
  where event_id is not null;
