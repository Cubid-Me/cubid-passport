# Dapp API Key Hardening

This document records the C04.1 target state for Cubid dapp API keys.

## Storage Model

Dapp API keys are non-retrievable bearer credentials. Cubid must verify them,
but it must not recover or repeatedly display the original value after issuance.

The active storage surface is `public.dapp_api_keys`:

- `key_prefix` is a non-secret lookup value.
- `key_hash` stores a one-way verifier.
- `status` is `active` or `revoked`.
- `last_used_at`, `rotated_at`, and `revoked_at` support operations.

New keys use the format `cubid_live_<prefix>_<secret>` and are stored with a
server-side `scrypt:v1` hash. Legacy `dapps.apikey` UUID values were migrated
into `dapp_api_keys` with a `sha256:v1` hash because those legacy keys were
already high-entropy random UUIDs and needed to keep working during rollout.

## Runtime Contract

Passport dapp APIs continue accepting existing request fields such as `apikey`,
`id_to_read_from`, and legacy `dapp_id` API-key usage. Verification happens only
against `dapp_api_keys`; direct `dapps.apikey` lookup is no longer part of the
runtime auth path.

Admin create and rotate flows return a raw API key once. Admin list/detail
surfaces show only non-secret key metadata such as prefix, status, rotation time,
and last-used time.

## Legacy Column

`dapps.apikey` was removed in C04.1.1 after hosted preflight confirmed every
CubidDev dapp had exactly one active `dapp_api_keys` row. The destructive
migration includes its own guard and fails before dropping the column if any
dapp is missing an active key or has multiple active keys.

After C04.1.1, `public.dapps` no longer stores raw or recoverable API keys.
`public.dapp_api_keys` is the only supported verifier table, and raw key
material is only returned once from Admin create/rotate responses.
