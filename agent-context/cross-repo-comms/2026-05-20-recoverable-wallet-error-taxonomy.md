---
thread_id: recoverable-wallet-error-taxonomy
title: Recoverable wallet browser-safe error taxonomy
status: open
owner_repo: cubid-passport
related_repos:
  - cubid-passport
  - cubid-sdk-v2
sibling_notes:
  cubid-passport: agent-context/cross-repo-comms/2026-05-20-recoverable-wallet-error-taxonomy.md
  cubid-sdk-v2: agent-context/cross-repo-comms/2026-05-20-recoverable-wallet-error-taxonomy.md
last_update:
  date: 2026-05-20
  actor: cubid-passport-agent
  summary: Passport added the canonical browser-safe recovery error taxonomy for SDK mirroring.
---

# Recoverable Wallet Browser-Safe Error Taxonomy

## Log

### 2026-05-20 — cubid-passport-agent

Passport now treats recoverable-wallet errors as a stable SDK-facing contract.
The canonical codes are:

- `verification_required`
- `wrong_user`
- `recovery_session_expired`
- `recovery_session_consumed`
- `recovery_cancelled`
- `unsupported_app_context`
- `recovery_bundle_not_found`
- `bundle_revoked`
- `unavailable_credential`
- `cooldown_active`
- `provider_outage`

Current Passport behavior already emits these concrete route codes where
implemented:

- `unsupported_app_context` when a dapp credential targets a dapp user outside
  its app context.
- `recovery_bundle_not_found` when no matching recovery bundle/session target
  exists.
- `wrong_user` when the Passport user does not match the release session user.
- `recovery_session_expired` for expired release sessions.
- `recovery_session_consumed` for one-time release replay.
- `bundle_revoked` when a bundle is revoked before release completion.

SDK agents should mirror these as browser-safe typed errors for hosted recovery
flows. No SDK implementation should assume that dapp backend credentials can
retrieve recovery material. Release material is only returned through the
Passport user-authenticated completion path.
