# Cubid Recoverable Wallet SDK Direction

Last updated: 2026-05-20

## Position

Cubid's wallet-adjacent product direction is now **passkey-first,
app-mediated, recoverable embedded wallets**. Cubid is not trying to become a
typical third-party wallet, a custodial wallet, or a normal transaction signer.

The target model is assisted self-custody:

- the host app or specialized signing infrastructure creates wallet material
- normal signing requires a user-side signing share and an app/server-side
  policy signing share
- Cubid does not generate wallets or sign normal app transactions
- Cubid stores and releases recovery material only after user-authorized Cubid
  recovery
- the full wallet private key is never reconstructed server-side

## Superseded Work

The earlier SIWC custody/signing implementation used Cubid-generated
app-scoped accounts and server-side signing from Vault-encrypted private keys.
That work is now a quarantined legacy surface. It remains useful as historical
context and for redacted account visibility, but it is no longer the product
path.

New integrations must not rely on:

- `/api/v3/accounts/generate` for Cubid-generated accounts
- `/api/v3/signing/requests/create` for Cubid normal signing
- Passport SIWC approval as a normal-signing flow
- `private.private_keys` as an active signing source

Those surfaces should fail closed for new use while existing tables remain in
place until hosted data is reviewed and a destructive cleanup migration is
explicitly approved.

## Replacement Role For Cubid Passport

Cubid Passport should provide recovery-provider infrastructure:

- app-scoped recovery-bundle enrollment
- encrypted recovery-bundle custody using the existing private schema and
  Supabase Vault envelope pattern
- recovery status lookup without exposing bundle contents
- Passport-hosted user recovery verification
- one-time browser/client-path recovery release
- bundle rotation and revocation
- audit/security events for recovery lifecycle changes
- SDK-facing error taxonomy and handoff notes

Backend dapp credentials alone must never retrieve recovery material. Recovery
material must release only through a user-authorized browser/client path after
Cubid recovery verification.

## Recovery Bundle Storage

Recovery bundles are stored in
`private.recoverable_wallet_recovery_bundles`, a service-role-only table. The
table binds encrypted bundle material to:

- dapp id
- dapp user UUID
- Cubid user id
- provider key
- recovery bundle id and version
- status, expiry, rotation, revocation, stale, and release metadata

The bundle payload uses AES-256-GCM envelope encryption with a Supabase
Vault-backed wrapping key. Provision the Vault secret
`passport_recoverable_wallet_recovery_bundle_wrapping_key_v1` as a
base64/base64url encoded 32-byte key before enabling recovery-bundle writes.

The backend may create, update, revoke, rotate, and report status for a bundle,
but backend dapp credentials must not be able to read the decrypted payload.
Decryption is reserved for a later user-authorized recovery release flow.

## API v3 Recovery Bundle Routes

RW04 adds the first dapp-authenticated recovery-bundle APIs:

- `POST /api/v3/recovery-bundles/enroll`
- `POST /api/v3/recovery-bundles/status`
- `POST /api/v3/recovery-bundles/release/start`
- `POST /api/recovery-bundles/release/complete`

Enrollment accepts a dapp API key, `dapp_user_uuid`, opaque bundle material,
provider metadata, and an optional caller-provided `recovery_bundle_id`.
Enrollment requires `Idempotency-Key`, verifies that the dapp user belongs to
the authenticated dapp, encrypts the bundle material, and returns only safe
status metadata. It never returns plaintext bundle material, ciphertext,
wrapped data keys, IVs, auth tags, raw Cubid user ids, or service-role fields.

Status lookup accepts a dapp API key and `dapp_user_uuid`, with optional
`recovery_bundle_id` or `provider_key` filters. It returns the latest safe
bundle status for that dapp user, or `status: "not_enrolled"` when no bundle
exists. Backend credentials can inspect enrollment state, but cannot retrieve
or decrypt recovery material.

Release start is dapp-authenticated and creates a short-lived, one-time
recovery session for an existing active bundle. It returns a Passport-hosted
`recoveryUrl` and session metadata only. It does not return bundle material and
does not give backend credentials any recovery read capability.

Release completion is Passport user-authenticated. It verifies that the signed
in user maps to the Cubid user bound to the recovery session, rejects expired or
already-consumed sessions, decrypts the bundle, marks the session consumed, and
returns the bundle material only to the verified browser/client path. This is
the only RW05 path that returns recovery material.

## Ownership Boundary

SmarTrust or another host app owns:

- wallet creation
- threshold/MPC provider selection
- normal signing
- transaction broadcasting
- app-specific transaction policy
- chain-specific wallet UX

Cubid owns:

- identity and app-scoped user binding
- passkey and recovery verification
- recovery-bundle storage/release
- disclosure-safe API and webhook contracts
- auditability and operator support
- public SDK coordination through `Cubid-Me/cubid-sdk`

## Implementation Roadmap

Use `agent-context/recoverable-wallet-sdk/todo.md` as the active roadmap for
the corrected wallet direction. The old SIWC roadmap is superseded for wallet
generation and normal signing, but Login with Cubid, passkey ACR, selective
disclosure, Admin policy patterns, and API v3 security baseline remain valid
platform foundations.
