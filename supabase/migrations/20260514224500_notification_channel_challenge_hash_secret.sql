create or replace function public.get_notification_challenge_hash_secret_v1()
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  secret_value text;
begin
  select decrypted_secret
    into secret_value
    from vault.decrypted_secrets
   where name = 'passport_notification_challenge_hash_secret_v1'
   limit 1;

  if secret_value is null or length(secret_value) < 32 then
    raise exception 'passport_notification_challenge_hash_secret_v1 is missing from Supabase Vault'
      using errcode = '22023';
  end if;

  return secret_value;
end;
$$;

revoke all on function public.get_notification_challenge_hash_secret_v1() from public;
grant execute on function public.get_notification_challenge_hash_secret_v1() to service_role;

comment on function public.get_notification_challenge_hash_secret_v1() is
  'Service-role-only Vault accessor for hashing flexible messaging channel verification challenges.';
