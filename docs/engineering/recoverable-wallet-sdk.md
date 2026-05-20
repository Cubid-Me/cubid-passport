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

