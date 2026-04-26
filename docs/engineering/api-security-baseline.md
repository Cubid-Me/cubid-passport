# Cubid API Security Baseline

Last updated: 2026-04-26
Status: Accepted target-state contract for C03.1

## Purpose

This document is the target-state source of truth for API security across Cubid Passport, Cubid Admin, and the OIDC service. It defines the shared request lifecycle, validation rules, authorization model, rate-limiting behavior, CORS policy, request ID contract, and error-handling contract that later C03 implementation slices must enforce.

This document does not replace the OIDC protocol architecture. OIDC endpoint semantics remain defined by [docs/engineering/login-with-cubid-oidc-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/login-with-cubid-oidc-architecture.md). C03 governs the shared security baseline around those semantics.

## Locked Decisions

- `zod` is the single request-validation library for C03.
- Shared server-side API security primitives live in `@cubid/auth`.
- Shared security-oriented environment helpers live in `@cubid/config`.
- Every public API response in Passport, Admin, and OIDC returns `X-Request-Id`.
- Incoming `x-request-id` is reused when present and non-empty; otherwise the runtime generates:
  - `passport_<uuid>`
  - `admin_<uuid>`
  - `oidc_<uuid>`
- No repo-tracked public endpoint may keep `origin: "*"` after C03 is complete.
- OIDC keeps RFC/OIDC response payload formats. Passport and Admin normalize to a structured JSON error envelope.
- OIDC keeps its existing `oidc_rate_limit_buckets` and `oidc_audit_logs` tables. Passport and Admin add a generic security store rather than forcing a cross-service storage migration in C03.

## Shared Request Contract

Every route family must move onto the same request lifecycle:

1. Create request context and request ID.
2. Enforce method contract and return `405` with `Allow` when violated.
3. Apply CORS policy for browser-callable endpoints.
4. Authenticate the actor if the route is not anonymous.
5. Validate headers, query parameters, and body with `zod`.
6. Apply route-level rate limits.
7. Execute business logic.
8. Emit success or failure events with request ID, actor type, route, and outcome.
9. Return a response that includes `X-Request-Id`.

Shared helpers in `@cubid/auth` should expose request-context builders for both:

- Next.js `NextApiRequest` and `NextApiResponse`
- Fetch `Request` and `Response` used by `services/oidc`

## Actor Model

The shared security baseline recognizes these actor types:

- `anonymous`
  unauthenticated callers for routes that intentionally allow them
- `user`
  Passport-authenticated human users verified through Firebase bearer tokens
- `admin`
  Admin-authenticated operators verified through Firebase bearer tokens plus admin membership checks
- `dapp`
  external application callers authenticated through Cubid dapp credentials and route-specific app lookup
- `oidc_client`
  OIDC relying parties authenticated through OIDC client credentials or client metadata rules
- `internal`
  server-to-server Cubid automation callers authenticated through internal bearer tokens

Route families must declare one allowed actor type up front, or a narrow allowed set when a flow genuinely supports multiple callers.

## Validation and Error Contracts

### Validation

- `zod` schemas must validate request body, query string, and security-relevant headers.
- Validation happens before business logic and before any write operation.
- Validation failures are not generic `500` errors. They must produce deterministic `400` or `422` style application errors under the shared envelope.

### Error envelopes

Passport and Admin return:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human-readable message",
    "requestId": "passport_123",
    "details": {}
  }
}
```

Rules:

- `code` is stable and machine-readable.
- `message` is safe for client display unless the route explicitly chooses a more generic message.
- `requestId` always matches the `X-Request-Id` response header.
- `details` is optional and must never include secrets, token values, raw private key material, or hidden internal identifiers that the route contract is not allowed to expose.

OIDC keeps RFC/OIDC wire shape:

```json
{
  "error": "invalid_request",
  "error_description": "Human-readable message"
}
```

OIDC still adds `X-Request-Id`.

## CORS Policy

Three environment-owned allowlists are required:

- `PASSPORT_CORS_ALLOWED_ORIGINS`
- `ADMIN_CORS_ALLOWED_ORIGINS`
- `OIDC_CORS_ALLOWED_ORIGINS`

Rules:

- Browser-callable routes must use explicit origin allowlists.
- Internal-only routes must not act like browser APIs and should reject cross-origin browser access entirely.
- OIDC applies browser CORS only to browser-driven interaction and passkey endpoints that are intentionally called from Passport or other approved browser origins.
- Discovery, JWKS, token, userinfo, revoke, and logout remain protocol endpoints, not wildcard browser APIs.

## Rate Limits and Security Events

### Storage

Passport and Admin add:

- `api_rate_limit_buckets`
- `api_security_events`

OIDC continues to use:

- `oidc_rate_limit_buckets`
- `oidc_audit_logs`

### Shared behavior

- All rate limits are enforced through a shared helper interface in `@cubid/auth`.
- Rate-limit keys may combine client identity, Firebase user identity, internal job identity, request path, and source IP depending on the route family.
- Rate-limit denials emit security events containing request ID, route, actor type, actor identifier when safe, outcome, and denial reason.

Minimum route families that must be rate limited in C03:

- OIDC authorize, token, userinfo, revoke, login completion, consent completion, and passkey challenge endpoints
- Admin mutation routes
- Passport OTP send and verify
- Passport email verification routes
- Passport dapp user creation, score lookup, and identity lookup routes
- Passport consent and passkey management routes
- Passport webhook trigger and other sensitive internal automation routes

## Route Family Rules

### OIDC

- Preserve OIDC protocol wire formats.
- Move existing request ID, validation, CORS, and rate-limit behavior behind shared helpers.
- Continue using OIDC-specific storage and audit records.

### Admin

- Every `apps/admin/pages/api/admin/*` route becomes `POST`-only or the explicitly declared method set.
- Every route uses shared admin actor verification.
- All request bodies use `zod` validation.
- Sensitive mutations receive DB-backed rate limits.

### Passport user-facing and dapp-facing APIs

- `/api/oidc/*` routes use the shared baseline immediately and continue using Passport Firebase user auth where required.
- `/api/dapp/*`, `/api/v2/*`, `/api/verify/*`, `/api/allow/*`, and `/api/wallet/*` lose wildcard CORS and must declare actor, validation, method, and rate-limit contracts.
- Legacy success payloads may change during C03 if needed to align with the normalized security baseline. OIDC payloads remain the compatibility exception.

### Passport internal-only routes

The following are treated as internal surfaces, not public browser APIs:

- `/api/cubid-webhook/*`
- cron-style routes such as `five_min_3oc_cron` and `gitcoin-near-cron-job`
- similar job or maintenance routes added later

Rules:

- require `Authorization: Bearer <PASSPORT_INTERNAL_API_TOKEN>`
- reject browser-oriented CORS
- use actor type `internal`
- bypass rate limiting only when explicitly configured as trusted internal automation

### Generic Supabase routes

- `/api/supabase/*` must be locked down under the shared baseline during C03.
- They are no longer allowed to behave as unauthenticated arbitrary CRUD endpoints.
- C02 still owns their final replacement with typed domain services.

## Shared Package Boundaries

### `@cubid/auth`

Add server-only primitives for:

- request ID generation and propagation
- method guards
- `zod` validation helpers
- actor guard interfaces and shared actor result types
- CORS allowlist decisions
- rate-limit adapter interfaces
- shared API security error classes and serializers

Client-safe exports from `@cubid/auth` must remain explicitly separated from these server-only helpers.

### `@cubid/config`

Add helpers for:

- parsing comma-separated origin allowlists
- required internal bearer tokens
- numeric and bounded security configuration values
- shared failure messages for missing security-critical env vars

## Environment Additions

The following variables are required by the target state:

- `PASSPORT_CORS_ALLOWED_ORIGINS`
- `ADMIN_CORS_ALLOWED_ORIGINS`
- `OIDC_CORS_ALLOWED_ORIGINS`
- `PASSPORT_INTERNAL_API_TOKEN`

Later implementation slices may add per-route or per-service tuning variables, but they must be layered on top of this baseline rather than creating unrelated security config schemes.

## Implementation Sequence

C03 execution order is locked:

1. `C03.1` define the contract and target-state doc
2. `C03.2` adopt the baseline in OIDC
3. `C03.3` adopt the baseline in Admin
4. `C03.4` adopt the baseline in Passport
5. `C03.5` close with tests, CI, and observability updates

This order is intentional:

- OIDC already has partial hardening and proves the shared primitives on a non-Next runtime first
- Admin is smaller and more uniform than Passport
- Passport has the broadest and riskiest legacy public API surface

## Acceptance Criteria

C03 is not complete until a reviewer can answer these without guessing:

- which validation library all APIs use
- how request IDs are generated and returned
- which routes are `user`, `admin`, `dapp`, `oidc_client`, `anonymous`, or `internal`
- how OIDC differs from Passport/Admin error payloads
- which endpoints are browser-callable versus internal-only
- which origin allowlists exist and where they are configured
- which storage tables back Passport/Admin versus OIDC security events and rate limits
- in what order the route families must be migrated
