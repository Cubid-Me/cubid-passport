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

For webhook signing secrets, the context includes:

- `dappId`
- `secretReferenceId`
- `webhook`

For blockchain private keys, the context includes:

- `chainKey`
- `publicAddressNormalized`
- `userAccountId`
- `userId`

Decrypting with the wrong dapp, user UUID, webhook subscription reference,
blockchain account, purpose, or key fails.

## Dapp User Secrets

`/api/v3/save_secret` is the encrypted replacement for the legacy
`/api/v2/save_secret` write path. The v3 route:

- authenticates the dapp through hashed `dapp_api_keys`
- confirms the `dapp_users.uuid` belongs to the authenticated dapp
- encrypts the submitted secret before writing `private.dapp_user_secrets`
- stores `__cubid_encrypted_dapp_user_secret__` in the legacy `secret` column
- writes a security event without raw secret material

`public.dapp_user_secrets` remains the legacy v2 table. It is intentionally
left intact while v2 is supported, and new encrypted v3 work must not add
encrypted columns or new custody behavior to the public table.

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

The script reads plaintext rows from `public.dapp_user_secrets` and inserts
encrypted copies into `private.dapp_user_secrets`. It reports counts only,
must never log raw secret values, and does not mutate the legacy public table.

Physical removal or final quarantine of the legacy public table is deferred
until production smoke confirms current rows are encrypted privately and no
callers depend on the v2 plaintext table.

## Webhook Signing Secrets

Webhook signing secrets are retrievable operational secrets because Passport
must recover the raw value to HMAC-sign outbound webhook deliveries. Admin
creates new subscriptions with a generated signing secret, stores only encrypted
fields plus `__cubid_encrypted_webhook_signing_secret__` in the legacy `secret`
column, and returns the raw secret only in the immediate create response.

Admin list/detail surfaces must not return the raw secret, ciphertext, wrapped
data key, IVs, or authentication tags. They may show non-secret metadata such
as status, creation time, and whether a subscription has been migrated to
encrypted custody.

The required Vault secret is
`passport_webhook_signing_secret_wrapping_key_v1`. It must be a base64 or
base64url encoded 32-byte value. Passport webhook delivery decrypts only inside
the internal server-to-server delivery path.

Run the idempotent webhook backfill script after the Vault secret is
provisioned:

```sh
pnpm --filter @cubid/passport exec tsx scripts/encrypt-webhook-signing-secrets.ts --dry-run
pnpm --filter @cubid/passport exec tsx scripts/encrypt-webhook-signing-secrets.ts
```

The delivery path temporarily accepts legacy plaintext rows so existing
subscriptions can keep working during the migration window. New Admin-created
subscriptions use encrypted storage immediately.

## Blockchain Private Keys

`/api/v3/accounts/generate` and `/api/v3/accounts/list` are the new v3
custodial account surface for dapp-authenticated callers. The legacy v2 wallet
and private-key paths remain untouched during C05.2, but v3 stores public
account metadata separately from encrypted private-key material:

- `public.ref_chains` stores supported chain metadata.
- `public.user_accounts` stores user-owned public account metadata.
- `public.dapp_user_accounts` links an account to the dapp user that triggered
  generation.
- `private.private_keys` stores encrypted private-key envelopes only.

The `private` schema is service-role-only. Browser, Admin list, and dapp
responses must never return raw private keys, ciphertext, wrapped data keys,
IVs, authentication tags, or Vault material. V3 account generation currently
supports EVM, NEAR, and Solana. Sui is deferred until a Sui SDK and address
normalization contract are selected.

The required Vault secret is
`passport_blockchain_private_key_wrapping_key_v1`. It must be a base64 or
base64url encoded 32-byte value. No public decrypt, reveal, export, or signing
endpoint exists in C05.2; decrypt helpers are server-only for future explicit
custody workflows.
