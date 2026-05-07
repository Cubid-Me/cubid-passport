# SIWC Custody And Signing Production Runbook

Last updated: 2026-05-06
Status: Active SIWC08 runbook; transaction signing remains disabled

## Purpose

This runbook defines the operating contract for Sign In With Cubid custody and
signing. It covers generated app-scoped accounts, Supabase Vault-backed private
key custody, signing request triage, webhook delivery, incident response, and
launch blockers.

Use this with:

- `docs/engineering/siwc-v3-signing-architecture.md`
- `docs/engineering/api-v3-developer-platform.md`
- `docs/engineering/api-security-operations.md`
- `docs/engineering/encrypted-database-secrets.md`

## Current Launch Boundary

Current SIWC production boundary:

- app-scoped account generation and listing are available through API v3
- EVM, NEAR, Solana, and Sui private keys are envelope-encrypted in
  `private.private_keys`
- dapps can create message and typed-data signing requests when Admin policy
  allows them
- Passport owns user-facing request visibility, approval, rejection, and
  passkey step-up
- webhook delivery is best-effort and signed through the API v3 webhook
  contract

Explicitly not enabled:

- transaction signing
- transaction submission or broadcast
- paymasters or gas sponsorship
- session keys
- smart-account deployment
- private-key export or reveal

## Custody Boundaries

Safe to expose to dapps:

- app-scoped account id
- dapp user UUID for the authenticated dapp
- chain key
- public address
- account label and status
- signing request status, payload hash, risk summary, policy version, and safe
  signature result metadata

Safe to expose to Passport users:

- app name and dapp id
- public app-scoped account metadata
- signing request summary, request type, chain, account, policy status, risk
  summary, and approval state
- whether signing is enabled by Admin policy

Safe to expose to Admin operators:

- SIWC policy configuration
- dapp/account/signing status
- public addresses and request summaries
- audit/security events and webhook delivery state

Never expose:

- raw private keys
- decrypted key material
- ciphertext, wrapped data keys, IVs, authentication tags, or Vault material
- raw signing payloads unless a future explicit operator-only support tool is
  designed and approved
- human subject keys, raw Cubid user ids, Firebase UIDs, service-role secrets,
  or webhook signing secrets

## Required Environment And Vault Inputs

Passport runtime env:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Firebase Admin credentials for user approval routes
- `PASSPORT_CORS_ALLOWED_ORIGINS`
- `PASSPORT_INTERNAL_API_TOKEN`

Supabase Vault secrets:

- `passport_blockchain_private_key_wrapping_key_v1`
- `passport_webhook_signing_secret_wrapping_key_v1`

OIDC/passkey dependency:

- Login with Cubid OIDC sessions must be available because passkey step-up uses
  the `cubid_oidc_session_id` cookie and `oidc_sessions` metadata.

Readiness check:

- missing Vault wrapping keys are launch blockers for account generation,
  signing, and webhook delivery
- missing Firebase Admin credentials block Passport approval routes
- missing Supabase service-role config blocks all SIWC server-side custody
  paths

## Database And Migration Readiness

Required tables and schemas:

- `private.private_keys`
- `public.ref_chains`
- `public.user_accounts`
- `public.dapp_user_accounts`
- `public.siwc_signing_policies`
- `public.siwc_signing_requests`
- `public.dapp_webhook_subscriptions`
- `public.webhook_events`
- `public.webhook_event_deliveries`
- `public.api_security_events`

Migration rollout order:

1. Apply custody schema and Vault helper migrations.
2. Provision Vault wrapping keys.
3. Apply SIWC policy and signing request migrations.
4. Seed SIWC webhook event names.
5. Configure one internal test dapp policy with sandbox mode enabled.
6. Run account-generation and signing smoke tests before enabling external
   dapps.

Rollback posture:

- do not drop custody tables during rollback
- suspend affected dapp policies instead of deleting records
- preserve encrypted private-key rows for forensic review and user support
- disable webhook subscriptions if a delivery bug creates retry storms

## Admin Policy Operations

Default policy posture is fail-closed:

- missing policy row means custody disabled and signing disabled
- `status = disabled` or `suspended` blocks signing request creation
- `signing_enabled = false` blocks all signing request types
- transaction requests remain `policy_denied` even when `transaction` appears
  in `allowed_request_types`

Before enabling a dapp:

1. Confirm the dapp owner and expected use case.
2. Keep `sandbox_mode = true` until staging smoke tests pass.
3. Enable only required chains.
4. Enable only required request types.
5. Keep `required_acr = urn:cubid:acr:passkey` for signing.
6. Configure webhook event subscriptions only for events the dapp will consume.
7. Set transaction value and contract allowlist fields even though transaction
   signing remains disabled, so the future policy evidence is explicit.

Emergency app suspension:

1. Set the SIWC policy `status` to `suspended`.
2. Suspend or rotate the dapp API key if credential abuse is suspected.
3. Disable relevant webhook subscriptions.
4. Search `api_security_events`, `siwc_signing_requests`, and webhook delivery
   rows for the dapp id.
5. Notify affected operators before reactivation.

## Signing Request Triage

Primary lookup fields:

- `X-Request-Id`
- signing request id
- dapp id
- dapp user UUID
- user account id
- chain key
- payload hash

Common states:

- `pending_user_approval`: waiting for Passport approval
- `policy_denied`: blocked by Admin policy or transaction-denial rules
- `approved`: user approval recorded
- `completed`: message or typed-data signature completed
- `failed`: server-side signing failed
- `rejected`: user rejected
- `cancelled`: dapp cancelled

Triage steps:

1. Capture the `X-Request-Id` from the dapp, Passport UI, or webhook payload.
2. Inspect `siwc_signing_requests` for status, policy version, risk fields, and
   expiry.
3. Inspect `api_security_events` for matching request id or signing request id.
4. Confirm the current `siwc_signing_policies` row still allows the request.
5. Confirm the user account and dapp-user link are active.
6. For approval failures, inspect OIDC session metadata for passkey ACR and
   freshness without exposing human subject keys.

Policy-denied transaction requests are expected in the current launch boundary.
They are not incidents unless the dapp expected message or typed-data signing.

## Webhook Operations

SIWC webhook delivery is best-effort. API state changes do not roll back when a
dapp endpoint is unavailable.

Supported SIWC event names:

- `wallet.created`
- `wallet.signing_request.created`
- `wallet.policy.denied`
- `wallet.signing_request.approved`
- `wallet.signing_request.rejected`
- `wallet.signing_request.cancelled`
- `wallet.signing_request.step_up_failed`
- `wallet.signature.completed`
- `wallet.signature.failed`

Delivery requires both:

- an active `dapp_webhook_subscriptions` row for the event
- the event in `siwc_signing_policies.webhook_event_subscriptions`

Triage:

1. Inspect `webhook_events` by event id, dapp id, or signing request id in the
   payload data.
2. Inspect `webhook_event_deliveries` for HTTP status, attempt count, and error
   metadata.
3. Verify the subscription has an encrypted signing secret and active status.
4. Confirm the dapp verifies the API v3 HMAC signature over
   `eventId.timestamp.rawBody`.
5. Disable the subscription if it is causing sustained retry noise.

Webhook replay:

- replay only from stored `webhook_events` and delivery metadata
- never reconstruct payloads from private-key rows or raw signing payloads
- preserve the original event id when replaying unless a future explicit replay
  API documents otherwise

## Smoke Tests

Run these in staging before any production enablement:

1. Generate an EVM account for an internal test dapp.
2. Confirm `/api/v3/accounts/list` returns only public account metadata.
3. Confirm the Passport Profile app-scoped account card displays the account.
4. Enable sandbox SIWC policy for `message` signing only.
5. Create a message signing request with an `Idempotency-Key`.
6. Approve through Passport with a fresh passkey OIDC session.
7. Confirm the dapp sees `completed` status and no private/ciphertext fields.
8. Confirm `wallet.signing_request.created`,
   `wallet.signing_request.approved`, and `wallet.signature.completed`
   webhooks are recorded when subscribed.
9. Create a transaction request and confirm it is `policy_denied`.
10. Confirm stale or missing passkey step-up records
    `wallet.signing_request.step_up_failed` when subscribed.

## Monitoring And Abuse Signals

Monitor:

- signing request creation volume by dapp
- policy-denied and step-up-failed counts
- failed signing attempts
- repeated idempotency conflicts
- webhook delivery failure rates
- account generation spikes
- dapp API key failures
- passkey freshness failures

Escalate when:

- a dapp shows unusual account-generation or signing-request volume
- signing failures cluster by chain or dapp
- webhook retry storms affect delivery infrastructure
- any log or response appears to contain private-key or encrypted custody
  material
- a user reports unfamiliar app-scoped accounts or signing requests

## Incident Response

Private-key or custody material exposure:

1. Suspend affected dapp SIWC policies.
2. Disable affected dapp API keys and webhook subscriptions.
3. Preserve database rows and request ids for investigation.
4. Rotate affected Vault wrapping keys only through a planned re-encryption or
   quarantine procedure; do not blindly rotate without understanding whether
   stored rows can still be decrypted.
5. Notify affected users and dapps according to the incident policy.

Suspicious signing request:

1. Suspend the dapp policy.
2. Search signing requests by dapp id, account id, and payload hash.
3. Verify whether any request reached `completed`.
4. Review passkey step-up and approval events.
5. Keep transaction signing disabled unless a future launch review says
   otherwise.

Webhook compromise:

1. Rotate the affected webhook subscription secret.
2. Disable delivery until the dapp confirms receiver integrity.
3. Replay only safe event envelopes if needed.
4. Audit recent failed deliveries and signature verification complaints.

## User Support Guidance

Users can be told:

- app-scoped accounts are generated for a specific app
- public addresses and labels are visible in Profile
- accounts are not universal wallets by default
- Cubid does not expose private keys or encrypted custody material
- signing approval happens in Passport and may require a fresh passkey

Users should not be told:

- that app-scoped accounts are portable wallets
- that private keys can be exported
- that transaction signing or gas sponsorship is live
- that all future apps can correlate or reuse the same account

## Launch Blockers

Do not enable broad SIWC signing if any of these are true:

- required Vault wrapping keys are missing
- service-role or Firebase Admin configuration is missing
- Admin SIWC policy UI cannot suspend a dapp
- Passport approval cannot enforce fresh passkey ACR
- signing responses expose raw payloads, signatures in webhook payloads,
  private keys, ciphertext, or internal user identifiers
- webhook signing secrets are not encrypted
- monitoring cannot find request ids across API responses, security events,
  signing requests, and webhook deliveries
- transaction signing is enabled before chain-specific summaries and risk
  controls are ready
- no operator has completed the staging smoke test
