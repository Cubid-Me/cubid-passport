# API v3 Developer Platform

Last updated: 2026-05-03
Status: E02 review and hardening target

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

## Webhook Contract Target

API v3 webhooks should become protocol events rather than ad hoc table-change
notifications. The target event families are:

- disclosure granted or revoked
- stamp or claim updated
- score changed
- credential blacklisted or revoked
- app-scoped subject revoked
- custody/account lifecycle events where appropriate

Webhook payloads must be signed with encrypted-at-rest webhook signing secrets,
include replay-protection inputs such as a stable event id and timestamp, record
delivery attempts, and be filtered through the same app-scoped disclosure
contract as API responses.

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
