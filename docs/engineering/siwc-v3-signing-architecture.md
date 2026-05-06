# SIWC V3 Signing And Transaction Authorization Architecture

Last updated: 2026-05-05
Status: SIWC01 accepted target state

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

SIWC signing events should extend the API v3 webhook contract rather than add a
separate delivery system. Candidate events:

- `wallet.signing_request.created`
- `wallet.signing_request.policy_denied`
- `wallet.signing_request.approved`
- `wallet.signing_request.rejected`
- `wallet.signature.completed`
- `wallet.transaction.submitted`
- `wallet.transaction.failed`

Payloads must be signed, replay-safe, disclosure-filtered, and app-scoped.

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

## Deferred

Deferred until later SIWC slices:

- Admin policy UI and persistence
- implementation of signing request tables and routes
- transaction simulation and risk scoring
- smart accounts, session keys, paymasters, and gas sponsorship
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
