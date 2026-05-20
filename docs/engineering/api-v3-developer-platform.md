# API v3 Developer Platform

Last updated: 2026-05-20
Status: E02.5 canonical contract with recoverable-wallet correction

## Purpose

API v3 is Cubid's forward path for developer-facing backend contracts. This
repo owns the runtime behavior: routes, migrations, validation, authorization,
disclosure enforcement, secret custody, webhook delivery, and operational
events. Public SDK implementation, package publication, examples, and
external-integration docs belong in the canonical public SDK repo,
`Cubid-Me/cubid-sdk`.

The old E02 SDK/package implementation work is historical context in this repo.
Do not add new public SDK code under `packages/core` or any other
`cubid-passport` workspace.

## Current API v3 Inventory

The current backend-owned API v3 routes are:

- `POST /api/v3/save_secret`: dapp-authenticated encrypted dapp-user secret
  write path backed by `private.dapp_user_secrets`.
- `POST /api/v3/accounts/generate`: legacy Cubid-generated wallet creation
  endpoint. This route is deprecated and fails closed for new use.
- `POST /api/v3/accounts/list`: dapp-authenticated account metadata listing
  scoped to the target dapp user, retained for historical visibility.
- `POST /api/v3/signing/requests/create`: legacy Cubid normal-signing request
  creation endpoint. This route is deprecated and fails closed for new use.
- `POST /api/v3/signing/requests/get`: dapp-authenticated signing request
  status lookup.
- `POST /api/v3/signing/requests/list`: dapp-authenticated signing request
  listing for the authenticated app.
- `POST /api/v3/signing/requests/cancel`: dapp-authenticated cancellation for
  pending signing requests.
- `POST /api/v3/recovery-bundles/enroll`: dapp-authenticated recoverable
  wallet bundle enrollment backed by private-schema envelope encryption.
- `POST /api/v3/recovery-bundles/status`: dapp-authenticated safe recovery
  bundle status lookup for one app-scoped dapp user.
- `POST /api/v3/recovery-bundles/release/start`: dapp-authenticated
  short-lived recovery release session creation for a previously enrolled
  bundle.
- `POST /api/recovery-bundles/release/complete`: Passport user-authenticated
  one-time recovery release completion. This is intentionally not a dapp API v3
  credential route because it may return recovery material to the verified
  browser/client path.

Existing `/api/v2/*` routes remain legacy compatibility surfaces unless a
future todo explicitly promotes a capability into API v3. New developer-facing
backend capabilities should default to API v3 and should not expand v2.

## Canonical Route Contracts

All current API v3 routes are `POST` JSON endpoints and are dapp-authenticated.
Callers may send the API key using the legacy-compatible `api_key` or `apikey`
body field while the shared Passport dapp actor helper verifies the key against
`dapp_api_keys`. Optional `dapp_id` body fields are accepted for compatibility
but do not authorize access; the authenticated dapp from the API key is the
authority.

Write routes require an `Idempotency-Key` header. The key is scoped to the
authenticated dapp actor plus route and retained for 24 hours. Repeating the
same key with the same request body after a successful write replays the stored
status and response body without repeating side effects. Reusing the same key
with a different request body returns `409 idempotency_conflict`; retrying while
the original request is still pending returns `409 request_in_progress`.

### `POST /api/v3/save_secret`

Purpose: store a retrievable dapp-user secret using the v3 encrypted custody
model. This is the encrypted replacement for legacy `/api/v2/save_secret`; it
does not add a public retrieval endpoint.

Legacy `/api/v2/save_secret` is removed and returns `410 endpoint_removed`.
Callers that need to store dapp-user secrets must migrate to this v3 route.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "user_id": "00000000-0000-4000-8000-000000000000",
  "secret": "plaintext supplied by the dapp"
}
```

Rules:

- `Idempotency-Key` is required.
- `user_id` is the dapp user UUID and must belong to the authenticated dapp.
- `secret` must be non-empty and is encrypted before storage.
- Writes go to `private.dapp_user_secrets` with `secret` set to the non-secret
  sentinel `__cubid_encrypted_dapp_user_secret__`.
- The route assigns a per-dapp-user sequential id and retries unique conflicts
  up to three times.
- A success event `dapp_user_secret.encrypted` is written to
  `api_security_events`.

Success response:

```json
{ "success": true }
```

No response may contain the raw secret, ciphertext, wrapped data key, IVs, auth
tags, human subject keys, raw Cubid user ids, or service-role data.

### `POST /api/v3/recovery-bundles/enroll`

Purpose: store app-provided recoverable-wallet recovery bundle material using
the private-schema Supabase Vault envelope-encryption pattern. This is Cubid's
replacement direction for wallet-adjacent recovery support; it does not create
wallets and does not enable normal transaction signing.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "bundle_material": "opaque encrypted or sealed recovery material from the app",
  "provider_key": "cubid",
  "bundle_version": 1,
  "recovery_bundle_id": "rw_bundle_...",
  "recovery_reference": "optional provider reference"
}
```

Rules:

- `Idempotency-Key` is required.
- `dapp_user_uuid` must belong to the authenticated dapp.
- `bundle_material` is encrypted before storage in
  `private.recoverable_wallet_recovery_bundles`.
- Supplying an existing `recovery_bundle_id` updates the encrypted bundle
  metadata for the authenticated dapp.
- The route returns status metadata only.

Success response shape:

```json
{
  "data": {
    "bundleVersion": 1,
    "dappUserUuid": "00000000-0000-4000-8000-000000000000",
    "providerKey": "cubid",
    "recoveryBundleId": "rw_bundle_...",
    "recoveryReference": "optional provider reference",
    "status": "active",
    "createdAt": "2026-05-20T00:00:00.000Z",
    "updatedAt": "2026-05-20T00:00:00.000Z"
  }
}
```

No response may contain bundle plaintext, ciphertext, wrapped data keys, IVs,
auth tags, raw Cubid user ids, or service-role metadata.

### `POST /api/v3/recovery-bundles/status`

Purpose: let a dapp inspect whether one of its dapp users has an active or
historical Cubid recovery bundle, without exposing recovery material.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "provider_key": "cubid",
  "recovery_bundle_id": "rw_bundle_..."
}
```

Rules:

- `dapp_user_uuid` must belong to the authenticated dapp.
- `provider_key` and `recovery_bundle_id` are optional filters.
- Missing bundles return a successful `status: "not_enrolled"` response.
- The route returns safe metadata only.

### `POST /api/v3/recovery-bundles/release/start`

Purpose: let a dapp request a user-authorized recovery release session for an
existing active bundle. This route starts recovery, but does not retrieve or
return recovery material.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "recovery_bundle_id": "rw_bundle_...",
  "provider_key": "cubid"
}
```

Rules:

- `Idempotency-Key` is required.
- `dapp_user_uuid` must belong to the authenticated dapp.
- The referenced bundle must exist, be active, and belong to the same dapp user.
- The route creates a short-lived pending release session.
- The response includes a Passport-hosted `recoveryUrl`; it never includes
  recovery material or encrypted custody fields.

### `POST /api/recovery-bundles/release/complete`

Purpose: complete a recovery release from the Passport browser/client path
after Cubid verifies the user. This route is user-authenticated, not
dapp-authenticated.

Request body:

```json
{
  "recovery_session_id": "rw_release_..."
}
```

Rules:

- The request must include a valid Passport/Firebase bearer token.
- The signed-in user must resolve to the Cubid user bound to the release
  session.
- The session must be pending, unexpired, and unconsumed.
- On success, the session is consumed before returning the recovery bundle
  material to the verified browser/client path.
- Replays return `409 recovery_session_consumed`; expired sessions return
  `410 recovery_session_expired`; wrong users return `403 wrong_user`.

### `POST /api/v3/accounts/generate`

Purpose: generate a Cubid-custodied blockchain account for one dapp user and
store the private key using the v3 encrypted private-key custody model.

Current status: **deprecated and fail-closed**. Cubid no longer generates
wallets for new integrations. Host apps should create app-mediated
recoverable wallets using audited threshold/MPC infrastructure and enroll
Cubid recovery bundles instead.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "chain": "evm",
  "label": "Primary wallet"
}
```

Rules:

- `Idempotency-Key` is required.
- `dapp_user_uuid` must belong to the authenticated dapp.
- Supported generated chains are currently `evm`, `near`, `solana`, and `sui`.
- The route creates `public.user_accounts`, encrypted `private.private_keys`,
  and one `public.dapp_user_accounts` link for the triggering dapp user.
- If private-key or link creation fails, the route performs compensating cleanup
  so orphaned generated accounts are not left behind.
- A success event `blockchain_account.generated` is written to
  `api_security_events`.

Success response shape:

```json
{
  "data": {
    "accountId": "account id",
    "chain": "evm",
    "createdAt": "2026-05-01T00:00:00.000Z",
    "custodyStatus": "cubid_custodied",
    "dappUserAccountId": "link id",
    "dappUserUuid": "00000000-0000-4000-8000-000000000000",
    "label": "Primary wallet",
    "publicAddress": "0x..."
  }
}
```

Current failure response:

```json
{
  "error": {
    "code": "cubid_generated_wallets_deprecated",
    "message": "Cubid-generated wallet creation is deprecated. Use app-mediated recoverable wallets with Cubid recovery bundles instead.",
    "requestId": "passport_..."
  }
}
```

The route must not create new account rows, private-key rows, dapp-user-account
links, or `wallet.created` webhook events.

### `POST /api/v3/accounts/list`

Purpose: list public account metadata visible to the authenticated dapp for one
dapp user.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "chain": "solana"
}
```

Rules:

- `dapp_user_uuid` must belong to the authenticated dapp.
- `chain` is optional and filters to `evm`, `near`, `solana`, or `sui` when present.
- Only active dapp-user account links and active user accounts are returned.

Success response shape:

```json
{
  "data": [
    {
      "accountId": "account id",
      "chain": "solana",
      "createdAt": "2026-05-01T00:00:00.000Z",
      "custodyStatus": "cubid_custodied",
      "dappUserAccountId": "link id",
      "dappUserUuid": "00000000-0000-4000-8000-000000000000",
      "label": null,
      "linkStatus": "active",
      "publicAddress": "...",
      "updatedAt": "2026-05-01T00:00:00.000Z"
    }
  ]
}
```

The route returns public metadata only. It must not expose private keys,
ciphertexts, wrapped keys, internal user ids, or account records not linked to
the authenticated dapp user.

### `POST /api/v3/signing/requests/create`

Purpose: create a Passport-hosted signing request for a specific app-scoped
custodial account. The route records the request, evaluates the current Admin
SIWC policy, and returns a polling-safe state. It does not sign until the
Passport user approves the request.

Current status: **deprecated and fail-closed**. Cubid no longer performs normal
wallet signing for host apps. Normal signing belongs to the host app or a
specialized threshold/MPC signing service; Cubid should provide recovery-bundle
storage and release.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "user_account_id": "00000000-0000-4000-8000-000000000001",
  "request_type": "message",
  "payload": { "message": "Sign in to Example" },
  "payload_summary": { "kind": "message", "preview": "Sign in to Example" }
}
```

Rules:

- `Idempotency-Key` is required and follows the shared API v3 write-route
  contract.
- The dapp user and account link must belong to the authenticated dapp.
- Admin SIWC policy must be enabled, allow signing, allow the account chain,
  and allow the requested type.
- `transaction` requests are still recorded as `policy_denied`; SIWC05 adds
  transaction risk summaries and stricter policy evidence, but not transaction
  signatures.
- Message signing is supported for EVM, NEAR, Solana, and Sui custody accounts.
- EVM typed-data signing is supported for `typed_data`.
- The route stores the raw signing payload in `siwc_signing_requests` for
  service-role signing, but public responses return only payload hashes and
  summaries.

Success response shape:

```json
{
  "data": {
    "signingRequestId": "siwc_req_...",
    "status": "pending_user_approval",
    "chain": "evm",
    "requestType": "message",
    "payloadHash": "64-char sha256 hex",
    "payloadSummary": { "kind": "message", "preview": "Sign in to Example" },
    "riskLevel": "low",
    "riskReasons": [],
    "policyDecision": "allowed",
    "stepUpRequired": true,
    "policyVersion": 2,
    "requiredAcr": "urn:cubid:acr:passkey",
    "expiresAt": "2026-05-06T00:10:00.000Z"
  }
}
```

Current failure response:

```json
{
  "error": {
    "code": "cubid_signing_deprecated",
    "message": "Cubid normal wallet signing is deprecated. Use app-mediated threshold signing with Cubid recovery bundles instead.",
    "requestId": "passport_..."
  }
}
```

The route must not create new signing requests, decrypt private-key material,
or emit signing lifecycle webhooks for new product traffic.

### `POST /api/v3/signing/requests/get`

Purpose: let the authenticated dapp poll one signing request that belongs to
that dapp.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "signing_request_id": "siwc_req_..."
}
```

Completed message or typed-data requests include `result` with a signature,
algorithm, public address, and result type. Failed, rejected, cancelled,
expired, and policy-denied requests include status plus redacted error metadata
where available.

### `POST /api/v3/signing/requests/list`

Purpose: list recent signing requests for the authenticated dapp, optionally
filtered to one dapp user.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "limit": 25
}
```

The response is `{ "data": [...] }` using the same redacted signing request
summary shape as `get`.

### `POST /api/v3/signing/requests/cancel`

Purpose: cancel a pending signing request before the Passport user approves it.

Request body:

```json
{
  "api_key": "cubid_live_...",
  "signing_request_id": "siwc_req_..."
}
```

Only `pending_user_approval` requests can be cancelled. Terminal requests are
idempotently returned in their terminal state.

## Error Contract

API v3 uses the Passport structured error envelope for non-OIDC APIs:

```json
{
  "error": {
    "code": "not_found",
    "message": "Dapp user was not found for the authenticated app.",
    "requestId": "passport_..."
  }
}
```

Expected route-level failures include:

- `400 invalid_request` for malformed payloads, unsupported enum values, or
  validation failures.
- `401 unauthorized` for missing or invalid dapp credentials.
- `404 not_found` when the target dapp user does not belong to the
  authenticated dapp.
- `429 rate_limited` for Passport API baseline rate-limit denials.
- `500` only for unexpected server/storage failures.

## Backend Contract Rules

API v3 routes must use the shared Passport API baseline:

- explicit HTTP method and `zod` request validation
- dapp API-key authentication through hashed `dapp_api_keys`
- dapp-user ownership checks before any user-scoped read or write
- request IDs and structured Passport error envelopes
- rate limits and security-event logging for denials
- no raw private keys, encrypted key material, token hashes, secret plaintext,
  service-role outputs, human subject keys, raw Cubid user IDs, or cross-app
  identifiers in public responses

API v3 identity-adjacent responses must respect app-scoped identity and
selective-disclosure grants. If a value is not granted, the route should omit
it, return `null`, or return an explicit non-granted state as documented by the
route contract. It must not leak the value through score details, webhooks, or
fallback legacy permissions.

API v3 write routes use the shared `api_idempotency_keys` store. Route
implementations must hash the canonical request body instead of storing raw
payloads, and idempotency records must never store submitted secrets or private
keys in plaintext.

## Webhook Contract Target

API v3 webhooks are protocol events rather than ad hoc table-change
notifications. Current legacy subscription names are preserved for lookup, but
deliveries use canonical v3 event names:

- `credential_added` -> `stamp.created`
- `credential_removed` -> `stamp.removed`
- `credential_expired` -> `credential.expired`
- `credential_blacklisted` -> `credential.blacklisted`
- `credential_whitelisted` -> `credential.whitelisted`
- `score_increase` -> `score.increased`
- `score_decrease` -> `score.decreased`

SIWC custody and signing events are first-class v3 event names:

- `wallet.created`
- `wallet.signing_request.created`
- `wallet.policy.denied`
- `wallet.signing_request.approved`
- `wallet.signing_request.rejected`
- `wallet.signing_request.cancelled`
- `wallet.signing_request.step_up_failed`
- `wallet.signature.completed`
- `wallet.signature.failed`

`wallet.transaction.submitted` and `wallet.transaction.failed` remain deferred
until transaction signing exists.

Delivered payloads use this shape:

```json
{
  "apiVersion": "v3",
  "payloadVersion": "2026-05-03",
  "eventId": "wh_evt_...",
  "eventType": "stamp.created",
  "legacyEventType": "credential_added",
  "createdAt": "2026-05-03T00:00:00.000Z",
  "requestId": "passport_...",
  "dapp": { "id": "42" },
  "subject": { "dappUserUuid": "00000000-0000-4000-8000-000000000000" },
  "data": { "stampId": 123 }
}
```

SIWC events use the same envelope. Their `data` object may include account id,
chain, public address, dapp-user account id, signing request id, request type,
status, policy version, risk summary, payload hash, and safe result metadata
such as signature algorithm and public address. SIWC webhook payloads never
include raw signing payloads, signatures, private keys, encrypted key material,
Vault wrapping keys, human subject keys, raw Cubid user ids, Firebase uid, or
webhook signing secrets.

Delivery requests include replay-protection headers:

- `X-Cubid-Event-Id`: stable event id for the dapp, event type, dapp user, and
  stamp.
- `X-Cubid-Timestamp`: delivery timestamp.
- `X-Cubid-Signature-Version`: currently `v1`.
- `X-Cubid-Signature`: `v1=<hex hmac sha256>` over
  `eventId.timestamp.rawBody` using the subscription signing secret.

Webhook delivery remains disclosure-gated. A stamp event is delivered to a dapp
only when the corresponding dapp user has an active disclosure grant or legacy
stamp permission for that stamp during the rollout window. Payloads must not
include raw Cubid user ids, human subject keys, raw stamp rows, signing secrets,
or private custody material. Delivery attempts record event id, request body,
redacted request headers, signature version, status, response code/body, failure
category, and attempt number in `webhook_event_deliveries`.

SIWC webhook delivery is additionally gated by
`siwc_signing_policies.webhook_event_subscriptions` and the app's active
`dapp_webhook_subscriptions` row for the canonical event name. Delivery is
best-effort for account and signing APIs: failed dapp endpoints are recorded in
`webhook_event_deliveries`, but they do not roll back generated accounts,
approvals, rejections, cancellations, or completed signatures.

## SDK Coordination

Every backend change that affects public route shape, response semantics, error
categories, disclosure states, webhook payloads, examples, or migration guidance
must create a message for the public SDK agents in the SDK repo's
`agent-context/messages-from-cubid-passport/` directory.

Before starting API v3 work in this repo, check
`agent-context/messages-from-cubid-sdk/` for incoming SDK-agent notes and
address any relevant requests.

Current E02 coordination status:

- E02.5 was documentation-only and did not require an outbound SDK handoff.
- E02.6 created
  `Cubid-Me/cubid-sdk:agent-context/messages-from-cubid-passport/2026-05-03-e02-6-api-v3-idempotency.md`
  for the required `Idempotency-Key` write-route contract.
- E02.7 created
  `Cubid-Me/cubid-sdk:agent-context/messages-from-cubid-passport/2026-05-03-e02-7-api-v3-webhooks.md`
  for the canonical v3 webhook payload/signature contract.
- As of E02.8, there are no incoming SDK-agent notes in
  `agent-context/messages-from-cubid-sdk/` in this repo.
- The outbound SDK handoff notes are intentionally committed or ingested from
  the SDK repo, not from `cubid-passport`; this repo records the coordination
  state only.

## Validation Expectations

API v3 hardening work should add focused Passport tests for:

- malformed request payloads
- missing, invalid, revoked, or mismatched dapp credentials
- cross-dapp dapp-user access attempts
- unsupported chains or unsupported custody operations
- retry, idempotency, and partial-failure cleanup behavior
- non-exposure of secrets, private keys, ciphertext, and internal identifiers
- disclosure-denied identity values
- webhook signing, replay-protection inputs, redaction, and failure recording

Run at minimum:

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
