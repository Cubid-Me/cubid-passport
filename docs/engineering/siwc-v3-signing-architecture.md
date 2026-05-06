# SIWC V3 Signing And Transaction Authorization Architecture

Last updated: 2026-05-06
Status: SIWC08 production runbook added; transaction signing remains disabled

## Purpose

Sign In With Cubid already has the identity, consent, passkey, and app-scoped
custody foundations needed for a wallet-adjacent product. The missing product
boundary is explicit signing: a dapp can create and list app-scoped custodial
accounts, but it cannot yet ask the human to approve a message signature or
transaction.

This document defines the first SIWC signing architecture for API v3. It is a
design contract only; it does not add signing endpoints, Admin controls, or SDK
code.

## Locked Direction

The first SIWC signing implementation should be a phased server-side custodial
signing system backed by the existing Supabase Vault envelope-encrypted private
keys in `private.private_keys`.

This is the right first step because:

- API v3 already creates app-scoped accounts and stores private key material
  under the service-role-only custody boundary.
- Passport already has passkey ACR semantics that can authorize human intent.
- Admin already owns policy/control-plane surfaces and can be extended before
  broad signing is enabled.
- Smart accounts, session keys, paymasters, and external signers add useful
  capabilities later, but they should not be prerequisites for a minimal secure
  signing loop.

The system must preserve a hard separation between authentication credentials
and blockchain signing keys. Passkeys authenticate and authorize the human's
intent; chain private keys, smart-account signer keys, or future external
signers produce the blockchain signature.

## Current Foundation

Already implemented foundations:

- OIDC Login with Cubid, pairwise subjects, passkey ACR, revoke/logout, JWKS,
  `/token`, and `/userinfo`.
- Passport passkey UX, device lifecycle, Profile visibility, and recovery
  framing.
- App-scoped identity and selective-disclosure grants for Allow Page, OIDC,
  SDK-facing routes, and webhooks.
- API v3 account generation/listing for EVM, NEAR, Solana, and Sui.
- Supabase Vault-backed envelope encryption for retrievable custody secrets.

Important gap:

- Generated accounts cannot sign messages or transactions yet.

## Scope For The First Signing Product

The first SIWC signing product should support:

- dapp-authenticated creation of signing requests through API v3
- Passport-hosted human review, approval, and rejection
- passkey step-up for approval when policy requires it
- server-side signing after approval
- status polling by the requesting dapp
- disclosure-safe webhook events for lifecycle changes
- audit/security events for every state transition

The first implementation should prioritize typed message signing before broad
transaction submission unless SIWC02/SIWC05 policy work proves a transaction
class is safe enough for launch. Transaction signing is allowed in the target
state, but production enablement should be gated by policy evaluation, risk
display, and passkey step-up.

## Chains

Initial signing eligibility should follow existing v3 custody support:

- `evm`: typed-data and personal-message signing first; transaction signing
  only after policy/risk controls are present.
- `solana`: message signing first; transaction signing only after readable
  transaction summaries and policy controls exist.
- `near`: transaction/action signing can be considered after action summaries
  are human-readable and policy-controlled.
- `sui`: message or transaction signing only after Sui-specific transaction
  summaries and policy checks are defined.

Each chain package or helper should remain isolated. Do not introduce generic
cross-chain assumptions that hide chain-specific risk.

## Proposed API V3 Surfaces

Future signing routes should use the existing Passport API v3 baseline:
structured errors, `X-Request-Id`, dapp API-key auth, ownership checks,
idempotency on writes, rate limits, and no secret exposure.

Candidate routes:

- `POST /api/v3/signing/requests/create`
- `POST /api/v3/signing/requests/get`
- `POST /api/v3/signing/requests/cancel`
- `POST /api/v3/signing/requests/list`

Passport-hosted approval should use authenticated human routes, not dapp
credentials:

- `POST /api/siwc/signing/requests/list`
- `POST /api/siwc/signing/requests/approve`
- `POST /api/siwc/signing/requests/reject`

Route names can change during implementation, but the ownership boundary should
not: dapps create and observe requests; humans approve or reject in Passport;
server-side custody code signs only after policy and approval succeed.

## Request Model

A signing request should include:

- `request_id`: server-generated stable id
- `dapp_id`: authenticated dapp
- `dapp_user_uuid`: target app-scoped user
- `user_account_id`: app-visible account id
- `chain_key`: `evm`, `near`, `solana`, or `sui`
- `request_type`: `message`, `typed_data`, `transaction`, or chain-specific
  subtype
- `payload_hash`: canonical hash of the signing payload
- `payload_summary`: redacted human-readable summary for Passport/Admin
- `policy_version`: Admin signing policy version evaluated at creation
- `required_acr`: optional `urn:cubid:acr:passkey`
- `idempotency_key`: write idempotency key for dapp retries
- `expires_at`: short approval window
- `status`: state-machine value

The raw signing payload may be stored only if needed for signing and only in a
server-side table with clear retention rules. Public/Admin/UI responses should
prefer summaries and hashes over raw payloads whenever possible.

## State Machine

Initial signing request states:

- `pending_policy`: created, awaiting policy evaluation
- `policy_denied`: rejected by policy before user approval
- `pending_user_approval`: policy accepted, waiting for Passport approval
- `approved`: human approved with sufficient auth context
- `rejected`: human rejected
- `expired`: approval window closed before completion
- `signing`: server is performing custody signing
- `completed`: signature or transaction hash is available
- `failed`: server-side signing or submission failed
- `cancelled`: dapp cancelled before completion

Allowed transitions should be explicit. Terminal states should be immutable
except for metadata fields such as delivery attempts or support notes.

## Authorization Boundary

Dapp API keys authorize only app-side request creation and status reads for
their own dapp users. They do not authorize signing.

Passport user auth authorizes only the human approval/rejection action. Approval
must confirm that:

- the user owns or controls the target `dapp_user_uuid` relationship
- the account is linked to that dapp user
- the request belongs to the same dapp/account/chain
- the request has not expired or reached a terminal state
- the current auth context satisfies required ACR

Custody signing code runs server-side with service-role access and may decrypt
private-key material only after policy and approval checks pass.

## Passkey Step-Up

Passkey ACR is the default high-risk approval mechanism. Signing policy may set
`required_acr = urn:cubid:acr:passkey` for all signing, or only for selected
chains, transaction types, amounts, contracts, or risk tiers.

OTP and OwnID flows remain recovery/bootstrap paths but should not satisfy a
passkey-required signing request. If the user lacks an active passkey, Passport
should guide them to create one before approval where policy allows.

## Policy Evaluation

SIWC02 adds the first Admin-owned policy contract in
`public.siwc_signing_policies`. Signing remains unavailable until SIWC04, but
every future signing request must read and enforce this table before user
approval and again immediately before signing.

The policy table stores one current policy per dapp:

- `status`: `disabled`, `enabled`, or `suspended`
- `custody_enabled`: whether the app may request app-scoped account custody
- `signing_enabled`: whether the app may request message or transaction signing
- `sandbox_mode`: whether the policy is still treated as non-production
- `allowed_chains`: `evm`, `near`, `solana`, and/or `sui`
- `allowed_request_types`: `message`, `typed_data`, and/or `transaction`
- `required_acr`: `urn:cubid:acr:passkey` whenever signing is enabled
- `transaction_value_limit_usd`, `contract_allowlist`,
  `webhook_event_subscriptions`, and `metadata`

Default behavior is fail-closed: missing policy rows mean custody disabled,
signing disabled, sandbox enabled, no allowed chains, and no allowed request
types. Admin APIs expose only non-secret policy configuration through
`POST /api/admin/siwc/policies/list` and
`POST /api/admin/siwc/policies/upsert`.

SIWC05 should add deeper transaction policy and risk controls, but the
architecture already expects:

- dapp signing enabled/disabled
- allowed chains
- allowed request types
- optional contract or recipient allowlists
- amount or value thresholds where chain data supports them
- required ACR
- sandbox versus production behavior
- webhook subscriptions for signing lifecycle events

Policy must be evaluated before user approval and again immediately before
signing to prevent stale approvals from bypassing policy changes.

## Idempotency, Replay, And Expiry

Dapp-created signing requests should require `Idempotency-Key`, scoped to the
authenticated dapp and route. Replaying the same key with the same canonical
request should return the existing request. Reusing the key with a different
payload should return `409 idempotency_conflict`.

Approval actions should be single-use state transitions. Replaying approval for
an already terminal request should return the terminal state, not sign twice.
Signing payloads should include canonical hashes so an operator can verify that
the approved payload and signed payload match.

## Audit And Observability

Record security or audit events for:

- `signing_request.created`
- `signing_request.policy_denied`
- `signing_request.approved`
- `signing_request.rejected`
- `signing_request.expired`
- `signing_request.signing_started`
- `signing_request.completed`
- `signing_request.failed`
- `signing_request.cancelled`
- `signing_request.step_up_failed`

Events should include request id, dapp id, chain, account id, policy version,
actor type, request id header, and outcome. They must not include private keys,
Vault material, ciphertext, raw human subject keys, raw Cubid user ids, or
unredacted transaction payloads.

## Webhooks

SIWC signing events extend the API v3 webhook contract rather than adding a
separate delivery system. SIWC06 seeds and emits these canonical event names:

- `wallet.created`
- `wallet.signing_request.created`
- `wallet.policy.denied`
- `wallet.signing_request.approved`
- `wallet.signing_request.rejected`
- `wallet.signing_request.cancelled`
- `wallet.signing_request.step_up_failed`
- `wallet.signature.completed`
- `wallet.signature.failed`

Each event uses the API v3 webhook envelope, HMAC signature headers, replay
event id, delivery attempt records, and encrypted per-subscription signing
secret resolution. Delivery requires both an active `dapp_webhook_subscriptions`
row for the canonical event and the event name in
`siwc_signing_policies.webhook_event_subscriptions`.

SIWC webhook payloads are app-scoped and custody-safe. They may include account
id, dapp user uuid, chain, public address, signing request id, request type,
status, policy version, risk summary, payload hash, and safe signature result
metadata such as algorithm and public address. They must not include raw
signing payloads, signatures, private keys, encrypted key material, Vault
material, human subject keys, raw Cubid user ids, Firebase uid, or webhook
signing secrets.

Webhook delivery is best-effort for SIWC lifecycle APIs. A dapp endpoint outage
records a failed delivery attempt but does not roll back account generation,
approval, rejection, cancellation, or signature completion.

`wallet.transaction.submitted` and `wallet.transaction.failed` remain deferred
until transaction signing and transaction submission exist.

## Passport Account Visibility

SIWC03 adds user-facing visibility for generated app-scoped custody accounts.
Passport exposes `POST /api/siwc/accounts/list` as a Firebase-authenticated user
route and displays the result in Profile.

The route returns public account metadata only:

- app name and dapp id
- dapp user UUID and dapp-user-account link id
- account id, chain, public address, label, account status, custody status, and
  timestamps
- current SIWC policy visibility fields: policy status/version, custody enabled,
  signing enabled, sandbox mode, and required ACR

The route must not expose private keys, ciphertext, wrapped data keys, IVs,
auth tags, Vault material, human subject keys, raw internal user ids, or
service-role-only fields. Missing SIWC policy rows are shown fail-closed:
signing disabled, custody disabled, sandbox mode enabled, and policy version
`0`. This is visibility only; users cannot sign, export, transfer, revoke, or
share accounts through SIWC03.

## Signing Request Lifecycle

SIWC04 implements the first backend signing request lifecycle:

- dapps create signing requests with
  `POST /api/v3/signing/requests/create`
- dapps poll, list, or cancel with
  `POST /api/v3/signing/requests/get`,
  `POST /api/v3/signing/requests/list`, and
  `POST /api/v3/signing/requests/cancel`
- signed-in Passport users inspect requests with
  `POST /api/siwc/signing/requests/list`
- signed-in Passport users approve or reject with
  `POST /api/siwc/signing/requests/approve` and
  `POST /api/siwc/signing/requests/reject`

Request creation requires `Idempotency-Key` and is scoped to the authenticated
dapp actor. The route checks that the `dapp_user_uuid`, `user_account_id`, and
`dapp_user_accounts` link all belong to the authenticated dapp. It then
evaluates the current `public.siwc_signing_policies` row. Missing or disabled
policy rows fail closed. Enabled policy rows must allow the chain and request
type before the request can enter `pending_user_approval`.

Passport approval re-checks policy immediately before signing. If policy has
changed, the request moves to `policy_denied` instead of signing. If
`required_acr = urn:cubid:acr:passkey`, approval requires a fresh
`cubid_oidc_session_id` cookie whose OIDC session was authenticated with
passkey, whose human subject belongs to the signed-in Passport user, and whose
passkey assurance is no older than five minutes. Missing, stale, revoked, or
cross-user passkey sessions are audited as `signing_request.step_up_failed`.

SIWC04 supports message signing for EVM, NEAR, Solana, and Sui generated
custody accounts, plus EVM typed-data signing. SIWC05 adds transaction risk
controls and human-readable summaries, but it still records transaction
requests as `policy_denied`. Transaction signing remains intentionally
disabled until a later explicit enablement slice.

Transaction risk controls are conservative:

- EVM transaction payloads are summarized as native transfers or contract calls.
- Recipient or contract addresses are normalized when possible.
- Declared USD value is accepted only when supplied by the caller.
- Admin `transaction_value_limit_usd` and `contract_allowlist` are enforced in
  the policy decision.
- NEAR, Solana, and Sui transaction requests fail closed with
  `transaction_chain_risk_unsupported` until chain-specific summaries exist.
- All transaction requests include `riskLevel`, `riskReasons`,
  `transactionOperationType`, recipient/contract fields, declared value, policy
  decision, and step-up requirement in public response summaries.

Public dapp and Passport responses return request status, payload hash,
payload summary, risk summary, policy version, required ACR, expiry, and
signing result when completed. They never return private keys, decrypted
material, ciphertext, wrapped keys, IVs, auth tags, human subject keys, raw
Cubid user ids, or the raw signing `payload` field.

## SIWC07 Smart Accounts, Session Keys, And Paymasters

SIWC07 keeps the current server-side custodial signing model as the near-term
default. Generated app-scoped accounts remain the base account mode because
they already match Cubid's privacy posture: every dapp gets its own account
linkage, approvals happen through Passport, and custody secrets stay behind the
service-role and Vault boundary.

Smart accounts should be added later as an optional EVM-first custody mode, not
as a replacement for generated app-scoped accounts. They are useful when an app
needs programmability, recovery rules, spending limits, batched execution,
sponsored gas, or account abstraction features that cannot be safely expressed
with an ordinary generated account. They also add deployment, chain support,
gas, bundler, paymaster, monitoring, and support complexity, so they should be
explicitly policy-gated and capability-advertised rather than assumed.

Session keys should be treated as scoped, revocable child capabilities of an
app-scoped account. A session key must never become a cross-app portable
identity or wallet credential. A future session-key design should bind each key
to a dapp, dapp user, account, chain, request type, expiry, policy version, and
optional spending or contract limits. Creation should require Passport approval
and passkey step-up, and revocation should be visible to both Admin and the
user. Session keys should wait until the current signing policy, approval UX,
webhooks, and production runbook are stable.

Paymasters and gas sponsorship should be treated as a separate app policy and
billing product. They should remain disabled until transaction signing has a
safe enablement plan, transaction summaries are human-readable, abuse controls
are live, and Admin can configure budgets, rate limits, allowed contracts,
allowed chains, and emergency suspension. Paymaster support should emit
dedicated audit and webhook events once it exists, but `wallet.transaction.*`
events remain deferred until transaction signing and submission are available.

Recommended sequence:

1. Finish SIWC08 production readiness for the current custodial signing model.
2. Add a future EVM smart-account design todo that chooses provider, account
   standard, deployment timing, recovery model, and capability discovery shape.
3. Add scoped session keys only after smart-account or transaction-signing
   semantics define what the delegated key may actually do.
4. Add paymasters last, after transaction risk, monitoring, billing limits, and
   emergency app suspension are operational.

Not-yet criteria:

- Do not replace generated app-scoped accounts with smart accounts by default.
- Do not expose session keys until they have expiry, scope, revocation,
  approval, and audit semantics.
- Do not enable paymasters until transaction signing and abuse controls are
  production-ready.
- Do not assume Solana, NEAR, or Sui have the same smart-account abstractions as
  EVM; evaluate chain-native equivalents only after chain-specific transaction
  signing is safe and user-readable.
- Do not add SDK APIs that imply all accounts are smart accounts; SDKs should
  use capability discovery when this roadmap becomes implementation work.

## Deferred

Deferred until later SIWC slices:

- transaction simulation and risk scoring
- EVM-first smart-account design and optional custody mode implementation
- scoped session keys with expiry, limits, revocation, and passkey approval
- paymasters and gas sponsorship after transaction signing is safe
- public SDK implementation in `Cubid-Me/cubid-sdk`

## Acceptance Criteria For SIWC01

SIWC01 is complete when a reviewer can answer:

- what signing architecture Cubid should build first
- where dapps, Passport, Admin, and custody code each sit
- which chains are in initial scope
- how passkeys relate to wallet private keys
- what the signing request state machine is
- what audit, idempotency, policy, and webhook boundaries must exist
- what remains deferred to SIWC02-SIWC08
