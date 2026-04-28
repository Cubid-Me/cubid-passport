alter table public.email_otp
  add column if not exists otp_hash text,
  add column if not exists hash_algorithm text not null default 'hmac-sha256',
  add column if not exists hash_version integer not null default 1,
  add column if not exists expires_at timestamp with time zone,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists consumed_at timestamp with time zone;

create index if not exists email_otp_active_lookup_idx
  on public.email_otp(email, created_at desc)
  where consumed_at is null;

create index if not exists email_otp_expiry_idx
  on public.email_otp(expires_at);

create or replace function public.get_email_otp_hash_secret()
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
  where name = 'passport_email_otp_hash_secret'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if secret_value is null or length(secret_value) < 32 then
    raise exception 'passport_email_otp_hash_secret is missing from Supabase Vault'
      using errcode = '22023';
  end if;

  return secret_value;
end;
$$;

create or replace function public.hash_email_otp(
  p_email text,
  p_otp text
)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select encode(
    extensions.hmac(
      lower(trim(p_email)) || ':' || trim(p_otp) || ':email_otp:v1',
      public.get_email_otp_hash_secret(),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.get_email_otp_hash_secret() from public;
revoke all on function public.hash_email_otp(text, text) from public;

grant execute on function public.hash_email_otp(text, text) to service_role;
