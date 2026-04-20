create index if not exists oidc_consents_client_active_idx
  on public.oidc_consents (client_id)
  where revoked_at is null;

create index if not exists oidc_access_tokens_client_active_idx
  on public.oidc_access_tokens (client_id, expires_at)
  where revoked_at is null;

create or replace function public.get_oidc_ops_client_counts(
  p_now timestamptz default timezone('utc', now())
)
returns table (
  client_id text,
  active_consent_count bigint,
  active_token_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    clients.client_id,
    count(distinct consents.consent_id)
      filter (where consents.revoked_at is null)::bigint as active_consent_count,
    count(distinct access_tokens.access_token_jti)
      filter (
        where access_tokens.revoked_at is null
          and access_tokens.expires_at > p_now
      )::bigint as active_token_count
  from public.oidc_clients clients
  left join public.oidc_consents consents
    on consents.client_id = clients.client_id
  left join public.oidc_access_tokens access_tokens
    on access_tokens.client_id = clients.client_id
  group by clients.client_id;
$$;

revoke all on function public.get_oidc_ops_client_counts(timestamptz) from public;
grant execute on function public.get_oidc_ops_client_counts(timestamptz) to service_role;
