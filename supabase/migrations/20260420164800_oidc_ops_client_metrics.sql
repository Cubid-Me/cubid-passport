create index if not exists oidc_audit_logs_client_created_event_idx
  on public.oidc_audit_logs (client_id, created_at, event_type)
  where client_id is not null;

create or replace function public.get_oidc_ops_client_metrics(
  p_since timestamptz
)
returns table (
  client_id text,
  token_successes bigint,
  token_failures bigint,
  userinfo_successes bigint,
  userinfo_failures bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    audit_logs.client_id,
    count(*)
      filter (
        where audit_logs.event_type = 'token.issued'
          and audit_logs.outcome = 'success'
      )::bigint as token_successes,
    count(*)
      filter (where audit_logs.event_type = 'token.exchange_failed')::bigint
      as token_failures,
    count(*)
      filter (
        where audit_logs.event_type = 'userinfo.returned'
          and audit_logs.outcome = 'success'
      )::bigint as userinfo_successes,
    count(*)
      filter (where audit_logs.event_type = 'userinfo.failed')::bigint
      as userinfo_failures
  from public.oidc_audit_logs audit_logs
  where audit_logs.client_id is not null
    and audit_logs.created_at >= p_since
  group by audit_logs.client_id;
$$;

revoke all on function public.get_oidc_ops_client_metrics(timestamptz) from public;
grant execute on function public.get_oidc_ops_client_metrics(timestamptz) to service_role;
