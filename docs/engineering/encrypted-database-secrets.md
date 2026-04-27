# Encrypted Database Secrets

Last updated: 2026-04-27
Status: Active target state for C05 retrievable-secret custody

## Purpose

Some Cubid values must be recovered later by server-side workflows. Those values
belong in the C05 retrievable-secret track and must be envelope-encrypted at
rest instead of stored as plaintext or one-way hashes.

## Envelope Model

The default database envelope format is AES-256-GCM with a random per-row data
key. The data key is wrapped with a 32-byte wrapping key stored in Supabase
Vault. Each row stores ciphertext, IVs, authentication tags, wrapped data key,
algorithm, key id, key version, purpose, encrypted timestamp, and authenticated
context.

Authenticated context binds ciphertext to the tenant/user/purpose that owns it.
For dapp user secrets, the context includes:

- `dappId`
- `dappUserUuid`
- `purpose`
- algorithm and key version

Decrypting with the wrong dapp, user UUID, purpose, or key fails.

## Dapp User Secrets

`/api/v3/save_secret` is the encrypted replacement for the legacy
`/api/v2/save_secret` write path. The v3 route:

- authenticates the dapp through hashed `dapp_api_keys`
- confirms the `dapp_users.uuid` belongs to the authenticated dapp
- encrypts the submitted secret before writing `dapp_user_secrets`
- stores `__cubid_encrypted_dapp_user_secret__` in the legacy `secret` column
- writes a security event without raw secret material

The required Vault secret is `passport_dapp_user_secret_wrapping_key_v1`. It
must be a base64 or base64url encoded 32-byte value and must be provisioned
before v3 secret writes or migration backfills run.

No public decrypt endpoint exists in C05.1. Decryption helpers are server-only
and reserved for explicit future internal workflows.

## Legacy Backfill

Run the idempotent backfill script from the Passport workspace after the Vault
secret is provisioned:

```sh
pnpm --filter @cubid/passport exec tsx scripts/encrypt-dapp-user-secrets.ts --dry-run
pnpm --filter @cubid/passport exec tsx scripts/encrypt-dapp-user-secrets.ts
```

The script encrypts rows where `secret_ciphertext` is empty and replaces
plaintext `secret` with the sentinel. It reports counts only and must never log
raw secret values.

Physical removal of the legacy `secret` column is deferred until production
smoke confirms current rows are encrypted and no callers depend on plaintext.
