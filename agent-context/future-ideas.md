# Future Ideas Reference

Last updated: 2026-05-06
Status: Reference only; do not implement directly

## Purpose

This file is not an active roadmap and is not a substitute for
`agent-context/todo.md`. The ideas below are intentionally deferred. Agents
should use this file only as a last-resort reference when the current
implementation tracks are finished, `agent-context/todo.md` is depleted, and
the user asks for "what's next".

Before promoting anything here into implementation, create or update a proper
todo in `agent-context/todo.md`, add normal metadata, and confirm the work fits
the current product direction. Do not start from this file if any active todo,
incoming SDK message, review follow-up, release blocker, or production runbook
item is still open.

## Deferred Suggestions

### 1. EVM Smart Accounts As Optional App-Scoped Custody

Evaluate smart accounts as an optional EVM-first custody mode for apps that
need programmability, recovery rules, spend limits, batched execution, or
sponsored gas. Keep generated app-scoped accounts as the default until there is
a clear reason to add account-abstraction complexity. Any future design should
choose an account standard/provider, define deployment timing, define recovery
semantics, add Admin policy controls, and expose capability discovery for SDKs
instead of assuming all Cubid accounts are smart accounts.

### 2. Scoped Session Keys

Explore session keys as revocable child capabilities of an app-scoped account.
A session key should be bound to one dapp, one dapp user, one account, allowed
chains, allowed request types, expiry, policy version, and optional spend or
contract limits. Creation should require Passport approval and passkey step-up.
Revocation should be visible to the user and Admin. Session keys should not be
cross-app portable credentials or a way to bypass user approval.

### 3. Paymasters And Gas Sponsorship

Design paymasters as an app policy, billing, and abuse-control product rather
than a generic wallet feature. This should wait until transaction signing is
safe, transaction summaries are readable, and operators can configure budgets,
rate limits, allowlists, chain restrictions, monitoring, and emergency
suspension. SDKs should treat gas sponsorship as an optional capability, not a
default property of every account.

### 4. Chain-Specific Transaction Simulation

Add transaction simulation and readable risk summaries per chain before
enabling transaction signing. EVM can start with native transfer, ERC-20, common
contract call, allowlist, value, and approval-risk summaries. NEAR, Solana, and
Sui need chain-native action summaries rather than copied EVM assumptions.
Simulation output should feed Passport approval UX, Admin policy evaluation,
audit events, and webhook payloads without exposing raw custody material.

### 5. Transaction Signing Enablement

Promote transaction signing only after the SIWC production runbook launch
blockers are satisfied. A future track should add explicit Admin enablement,
chain-specific risk evidence, passkey freshness, idempotent request handling,
webhook events such as `wallet.transaction.submitted`, and operator rollback
procedures. Transaction signing should initially be allowlist-driven and
sandbox-first, not broadly enabled for every dapp.

### 6. Account Recovery And Key Rotation For Custodial Accounts

Define a user-safe recovery and rotation model for generated app-scoped
accounts. The current custody model protects stored private keys, but future
work may need account replacement, compromised-account quarantine, user support
flows, and dapp-visible account lifecycle events. This should include clear
answers for whether old accounts stay linked, how users understand recovery,
and how dapps migrate from an old public address to a replacement.

### 7. User-Controlled Account Sharing Between Apps

Consider whether a user should ever be allowed to share the same app-scoped
account with multiple dapps. The default should remain non-correlatable
per-app accounts. If sharing is added, it must require explicit user consent,
clear disclosure of correlation risk, Admin policy support, revocation, and
SDK-visible capability fields. This should not become accidental universal
wallet portability.

### 8. SIWC Developer Sandbox And Test Harness

Build a developer sandbox for SIWC flows: seed a test dapp, generate app-scoped
accounts, create signing requests, approve/reject in Passport, receive signed
webhooks, and inspect request state. This would help integrators and agents
test without production identity state. It should use API v3 contracts and
handoff docs for `Cubid-Me/cubid-sdk`, not SDK code in this repo.

### 9. Advanced Webhook Replay And Delivery Controls

Extend webhook operations with explicit replay tooling, delivery pause/resume,
per-subscription health, dead-letter handling, and receiver verification
guidance. Current webhook delivery is best-effort and records attempts. Future
operator tooling could help support teams diagnose dapp endpoint outages
without reconstructing payloads from private rows or leaking signing secrets.

### 10. SIWC Risk And Abuse Scoring

Create an abuse scoring layer for SIWC account generation and signing requests.
Signals could include dapp reputation, account-generation spikes, repeated
policy denials, passkey step-up failures, webhook failures, duplicate identity
signals, and unusual chain/request patterns. The output should be operator- and
policy-facing first, then possibly user-facing if it can be explained clearly.

### 11. Human-Agent Delegation For Signing Requests

Explore how a self-identified human might authorize an agent to prepare, but
not approve, signing requests. This should preserve the boundary that passkeys
authorize human intent and chain keys produce signatures only after policy and
approval. Any agent delegation model should be app-scoped, auditable, revocable,
and compatible with MCP-style agent interfaces.

### 12. Organization-Controlled App Accounts

Evaluate organization-owned app accounts for teams, groups, networks, or formal
organizations. This should stay distinct from human proof-of-personhood scoring:
organizations and standalone agents may claim social accounts to prevent
misattribution, but Cubid should not spend the same validation effort on them
as on self-identified humans. Custody and signing policy would need org actor
visibility, admin delegation, and support workflows.
