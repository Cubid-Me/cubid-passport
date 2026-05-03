insert into public.ref_chains (
  chain_key,
  display_name,
  chain_family,
  native_asset_symbol,
  public_address_label,
  address_case_sensitive,
  supports_custodial_generation,
  metadata
) values (
  'sui',
  'Sui',
  'sui',
  'SUI',
  'address',
  false,
  true,
  '{"keyType":"ed25519","addressFormat":"hex","privateKeyFormat":"suiprivkey"}'::jsonb
)
on conflict (chain_key) do update
set
  display_name = excluded.display_name,
  chain_family = excluded.chain_family,
  native_asset_symbol = excluded.native_asset_symbol,
  public_address_label = excluded.public_address_label,
  address_case_sensitive = excluded.address_case_sensitive,
  supports_custodial_generation = excluded.supports_custodial_generation,
  metadata = excluded.metadata,
  updated_at = now();
