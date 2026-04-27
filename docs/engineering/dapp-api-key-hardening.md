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
server-side `scrypt:v1` hash. Existing `dapps.apikey` UUID values are migrated
into `dapp_api_keys` with a `sha256:v1` hash because those legacy keys are
already high-entropy random UUIDs and must keep working after the migration.

## Runtime Contract

Passport dapp APIs continue accepting existing request fields such as `apikey`,
`id_to_read_from`, and legacy `dapp_id` API-key usage. Verification happens only
against `dapp_api_keys`; direct `dapps.apikey` lookup is no longer part of the
runtime auth path.

Admin create and rotate flows return a raw API key once. Admin list/detail
surfaces show only non-secret key metadata such as prefix, status, rotation time,
and last-used time.

## Legacy Column

`dapps.apikey` remains in the schema during C04.1 so production can be smoked
before destructive cleanup. C04.1.1 owns dropping the legacy constraint and
column after active dapps are confirmed to authenticate through `dapp_api_keys`.
