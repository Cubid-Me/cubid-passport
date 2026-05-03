revoke all on table public.dapp_user_secrets from public;
revoke all on table public.dapp_user_secrets from anon;
revoke all on table public.dapp_user_secrets from authenticated;
revoke all on sequence public.dapp_user_secrets_id_seq from public;
revoke all on sequence public.dapp_user_secrets_id_seq from anon;
revoke all on sequence public.dapp_user_secrets_id_seq from authenticated;

revoke all on table public.dapp_user_secrets from service_role;
grant select on table public.dapp_user_secrets to service_role;

revoke all on sequence public.dapp_user_secrets_id_seq from service_role;

create or replace function public.reject_public_dapp_user_secrets_writes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'public.dapp_user_secrets is quarantined; use private.dapp_user_secrets via /api/v3/save_secret'
    using errcode = '42501';
end;
$$;

drop trigger if exists reject_public_dapp_user_secrets_writes
  on public.dapp_user_secrets;

create trigger reject_public_dapp_user_secrets_writes
before insert or update or delete on public.dapp_user_secrets
for each row execute function public.reject_public_dapp_user_secrets_writes();

comment on table public.dapp_user_secrets is
  'Quarantined legacy plaintext dapp-user-secret table. Retained only for service-role backfill/audit reads; new writes must use private.dapp_user_secrets through API v3.';
