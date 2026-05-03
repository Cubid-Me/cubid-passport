# API v3 Developer Platform

Last updated: 2026-05-03
Status: E02.5 canonical contract

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
- `POST /api/v3/accounts/generate`: dapp-authenticated custodial account
  generation for supported chains, storing encrypted private-key material in
  the `private` schema and returning only public account metadata.
- `POST /api/v3/accounts/list`: dapp-authenticated account metadata listing
  scoped to the target dapp user.

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

### `POST /api/v3/accounts/generate`

Purpose: generate a Cubid-custodied blockchain account for one dapp user and
store the private key using the v3 encrypted private-key custody model.

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
- Supported generated chains are currently `evm`, `near`, and `solana`. Sui is
  explicitly deferred to `C05.2.1`.
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

The route never returns the raw private key, encrypted private-key material,
wrapped data keys, or internal custody metadata.

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
- `chain` is optional and filters to `evm`, `near`, or `solana` when present.
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

## SDK Coordination

Every backend change that affects public route shape, response semantics, error
categories, disclosure states, webhook payloads, examples, or migration guidance
must create a message for the public SDK agents in the SDK repo's
`agent-context/messages-from-cubid-passport/` directory.

Before starting API v3 work in this repo, check
`agent-context/messages-from-cubid-sdk/` for incoming SDK-agent notes and
address any relevant requests.

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
