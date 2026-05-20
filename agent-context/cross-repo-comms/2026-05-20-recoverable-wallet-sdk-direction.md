---
thread_id: recoverable-wallet-sdk-direction
title: Recoverable wallet SDK direction reset
status: open
owner_repo: cubid-passport
related_repos:
  - cubid-passport
  - cubid-sdk-v2
sibling_notes:
  cubid-passport: agent-context/cross-repo-comms/2026-05-20-recoverable-wallet-sdk-direction.md
  cubid-sdk-v2: agent-context/cross-repo-comms/2026-05-20-recoverable-wallet-sdk-direction.md
last_update:
  date: 2026-05-20
  actor: cubid-passport-agent
  summary: Cubid Passport reset the wallet direction to recovery-provider infrastructure and deprecated generated-wallet/signing APIs for new SDK use.
---

# Recoverable Wallet SDK Direction Reset

## Thread Rule

This note has a sibling in `cubid-sdk-v2`. Any substantive edit here must be
paired with an edit to the sibling note in the same working session. The
Passport copy is the owner copy for backend contract direction.

## Direction

Cubid Passport is no longer pursuing Cubid-generated wallets or Cubid normal
wallet signing as the product path.

The new direction is passkey-first, app-mediated, recoverable embedded wallets:

- host apps or specialist signing infrastructure create wallets
- normal signing uses app/server policy plus user-side signing material
- Cubid provides identity-bound recovery-bundle storage and release
- Cubid recovery material releases only through a user-authorized
  browser/client path
- Cubid does not expose private keys, seed material, key shares, ciphertext, or
  Vault metadata to SDK consumers

## SDK Impact

Please deprecate or remove SDK docs/helpers that imply Cubid Passport is the
wallet generator or normal signer for new integrations. The old SIWC account
and signing helpers should not be promoted as the future SDK direction.

Future SDK work should target provider-abstract recoverable wallet packages
based on `cubid-passport`'s
`agent-context/recoverable-wallet-sdk/cubid-wallet-agent-spec.md`, especially:

- recovery bundle enrollment/status helpers
- Passport/Cubid recovery launcher helpers
- user-authorized recovery release handling
- bundle rotation/revocation helpers
- browser-safe recovery error classes
- package boundaries for core, passkey, recovery, React, EVM, Solana, and
  server integration helpers

No SDK implementation should assume Cubid can generate wallets, sign normal
transactions, or release recovery material to backend-only callers.

## Log

### 2026-05-20 — cubid-passport-agent

Created this thread while implementing the Passport direction reset. Passport
is hard-disabling new `/api/v3/accounts/generate`,
`/api/v3/signing/requests/create`, and Passport normal-signing approval for new
product traffic. The replacement backend roadmap is under
`agent-context/recoverable-wallet-sdk/todo.md`.

