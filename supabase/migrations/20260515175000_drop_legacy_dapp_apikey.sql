do $$
declare
  missing_active_key_count integer;
  duplicate_active_key_count integer;
begin
  select count(*)::integer
  into missing_active_key_count
  from public.dapps d
  where not exists (
    select 1
    from public.dapp_api_keys k
    where k.dapp_id = d.id
      and k.status = 'active'
  );

  if missing_active_key_count > 0 then
    raise exception
      'Cannot drop legacy dapps.apikey: % dapps are missing active dapp_api_keys rows',
      missing_active_key_count;
  end if;

  select count(*)::integer
  into duplicate_active_key_count
  from (
    select k.dapp_id
    from public.dapp_api_keys k
    where k.status = 'active'
    group by k.dapp_id
    having count(*) > 1
  ) duplicate_keys;

  if duplicate_active_key_count > 0 then
    raise exception
      'Cannot drop legacy dapps.apikey: % dapps have multiple active dapp_api_keys rows',
      duplicate_active_key_count;
  end if;
end $$;

alter table only public.dapps
  drop constraint if exists dapps_apikey_key;

alter table public.dapps
  drop column if exists apikey;

comment on table public.dapp_api_keys is
  'Hash-only dapp API key verifier table. Raw dapp API keys are shown once on create/rotate and are not stored in public.dapps.';
