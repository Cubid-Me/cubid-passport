# API Security Operations

Last updated: 2026-04-27
Status: Active runbook for the C03 shared API security baseline

## Purpose

This runbook explains how to operate and debug the shared API security baseline across Passport, Admin, and OIDC. It focuses on request IDs, denial signals, audit and rate-limit storage, environment ownership, and the expected triage path for origin, auth, validation, and abuse-related failures.

## Request Tracing

Every API response in scope returns `X-Request-Id`.

Rules:

- reuse an incoming `x-request-id` header when the caller provides a non-empty value
- otherwise generate a workspace-prefixed ID:
  - `passport_<uuid>`
  - `admin_<uuid>`
  - `oidc_<uuid>`
- Passport and Admin also include the same request ID in the JSON error envelope under `error.requestId`
- OIDC keeps RFC-style error bodies and surfaces the request ID only through `X-Request-Id`

Primary operator workflow:

1. capture the `X-Request-Id` from the failing client, browser network panel, or reverse-proxy logs
2. identify the owning workspace by prefix
3. inspect the matching security or audit table rows for that request ID
4. correlate the route, actor type, outcome, and details payload before assuming the failure is application logic

## Event Tables

### Passport and Admin

Passport and Admin denial and abuse signals write to `api_security_events`.

Relevant fields:

- `event_id`
- `event_type`
- `route`
- `request_id`
- `actor_type`
- `actor_identifier`
- `outcome`
- `details`
- `created_at`

Expected denial-oriented event types include:

- `validation.failed`
- `method.denied`
- `origin.denied`
- `authentication.denied`
- `authorization.denied`
- `rate_limit.denied`
- `request.denied`

Interpretation notes:

- `actor_identifier` may be blank when the caller fails before auth completes
- `details` commonly carries origin, rate-limit tier, limit values, route metadata, or validation issue summaries
- success-path noise is intentionally limited; this table is primarily for security-relevant denials and abuse diagnostics

### OIDC

OIDC continues to use `oidc_audit_logs`.

Relevant fields:

- `log_id`
- `event_type`
- `client_id`
- `request_id`
- `actor_type`
- `actor_identifier`
- `outcome`
- `details`
- `created_at`

Common OIDC event families include:

- registration success and failure
- token success and failure
- userinfo success and failure
- revoke and logout events
- passkey lifecycle events
- consent lifecycle events
- rate-limit denials

## Rate-Limit Tables

### Passport and Admin

Passport and Admin share `api_rate_limit_buckets`.

Purpose:

- track per-window counts keyed by route family and actor/IP identity
- back shared rate-limit enforcement in the Next API handlers

Relevant fields:

- `bucket_key`
- `route`
- `limit_key`
- `tier`
- `count`
- `window_start`
- `expires_at`
- `metadata`
- `updated_at`

### OIDC

OIDC keeps `oidc_rate_limit_buckets`.

Purpose:

- enforce issuer-specific route limits without forcing OIDC into the generic Passport/Admin storage contract

Relevant fields are analogous: route, key, tier, count, and window timing metadata.

## Denial Triage

### Origin denials

Symptoms:

- Passport/Admin JSON error envelope with `code: "origin_not_allowed"`
- OIDC browser-callable interaction route returns an origin denial before business logic

Checks:

1. confirm the request included an `Origin` header
2. compare it to the workspace allowlist env:
  - `PASSPORT_CORS_ALLOWED_ORIGINS`
  - `ADMIN_CORS_ALLOWED_ORIGINS`
  - `OIDC_CORS_ALLOWED_ORIGINS`
3. verify the route is intended to be browser-callable at all

Special rule:

- internal Passport routes such as webhook and cron endpoints should not be treated like browser APIs and intentionally reject browser-style origin usage

### Authentication denials

Symptoms:

- `code: "unauthorized"` in Passport/Admin
- RFC-style OIDC auth failure body where applicable

Checks by actor:

- `user`: verify the Firebase bearer token exists, is well-formed, and maps to the expected email or phone identity
- `admin`: verify the Firebase token first, then confirm the platform admin-user record exists
- `dapp`: verify the dapp API key exists and matches any route-supplied dapp identifier
- `internal`: verify `Authorization: Bearer <PASSPORT_INTERNAL_API_TOKEN>` is present for internal-only Passport routes

### Authorization denials

Symptoms:

- `code: "forbidden"`

Common causes:

- non-admin Firebase users reaching Admin operator routes
- dapp identifiers that do not match the supplied API key
- routes whose rate-limit group or actor rules intentionally block the current actor

### Validation failures

Symptoms:

- `code: "invalid_request"`
- `details.issues` populated for Passport/Admin envelope-based routes

Checks:

1. confirm the request method is correct
2. inspect required JSON fields, types, and enum values
3. confirm security-relevant headers are present when required
4. verify legacy callers are not sending pre-C03 payload shapes to hardened routes

### Rate-limit denials

Symptoms:

- `code: "rate_limit_exceeded"`
- `Retry-After` header present
- corresponding `rate_limit.denied` event row

Checks:

1. inspect the matching bucket row in `api_rate_limit_buckets` or `oidc_rate_limit_buckets`
2. confirm the actor tier and route family
3. compare the observed traffic pattern to the expected client behavior
4. determine whether the issue is abuse, retry storms, or an operator using the wrong environment or loop

## Security Environment Ownership

### Passport

- `PASSPORT_CORS_ALLOWED_ORIGINS`
- `PASSPORT_INTERNAL_API_TOKEN`
- `PASSPORT_APP_SCOPED_SUBJECT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Firebase Admin server credentials for bearer-token verification
- `NEAR_ISSUER_PRIVATE_KEY` preferred over legacy `private_key_near`
- `TWILIO_ACCOUNT_SID` preferred over legacy `twilio_sid`
- `TWILIO_AUTH_TOKEN` preferred over legacy `authToken`

Passport also owns route-specific secrets for OTP, webhook, and outbound integrations touched by the hardened API surface.

Email OTP rows are verification-only. Passport stores `otp_hash` values derived
by the Supabase function `hash_email_otp`, which reads the
`passport_email_otp_hash_secret` secret from Supabase Vault. Codes expire after
10 minutes, allow at most three failed attempts per issued code, and successful
challenges are marked consumed instead of retaining reusable plaintext codes.
Provision the Vault secret before enabling email OTP sends in an environment;
the application intentionally fails closed if the secret is absent.

Dapp user secrets are retrievable server-side secrets and use the C05 envelope
encryption model. `/api/v3/save_secret` encrypts submissions into
`private.dapp_user_secrets` using a per-row data key wrapped by the Supabase
Vault secret `passport_dapp_user_secret_wrapping_key_v1`. Provision this Vault
secret before enabling v3 writes or running the legacy backfill script. The
legacy `/api/v2/save_secret` route is removed and returns `410 endpoint_removed`.
The legacy `public.dapp_user_secrets` table is quarantined as service-role
read-only backfill/audit input; new writes must use v3 encrypted private-schema
custody. The quarantine blocks inserts and updates but preserves cascaded
cleanup deletes from owning dapp-user records.

Webhook signing secrets use the same C05 envelope model because Passport must
recover them to sign outbound webhook deliveries. Admin-created subscriptions
store encrypted secret fields in `dapp_webhook_subscriptions`, return the raw
secret only once during creation, and show only redacted secret status in list
views. Provision the Supabase Vault secret
`passport_webhook_signing_secret_wrapping_key_v1` before creating encrypted
webhook subscriptions or running the legacy webhook backfill script.

Blockchain private keys from the earlier v3 account custody surface are now a
legacy quarantine surface. `/api/v3/accounts/generate` is deprecated and should
fail closed for new integrations; historical `user_accounts`,
`dapp_user_accounts`, and `private.private_keys` rows remain in place until
hosted data is reviewed and a destructive cleanup migration is explicitly
approved. New wallet work should use app-mediated recoverable wallets with
Cubid recovery bundles rather than Cubid-generated private keys.

### Admin

- `ADMIN_CORS_ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Firebase Admin server credentials for bearer-token verification

### OIDC

- `OIDC_CORS_ALLOWED_ORIGINS`
- issuer URL, signing-key, and client-registration configuration
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OIDC_PAIRWISE_SUBJECT_MASTER_SECRET`
- `OIDC_SIGNING_PRIVATE_JWK_JSON`
- `OIDC_ACTIVE_SIGNING_KID`

See `docs/engineering/operational-secret-hardening.md` for the C06 runbook,
canonical names, legacy aliases, readiness checks, and rotation procedures.

## CI and Regression Expectations

The normal validation graph remains:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

CI also runs `pnpm check:api-security`, which fails if repo-tracked hardened API handlers reintroduce:

- `nextjs-cors`
- wildcard `origin: "*"` behavior

If this check fails, treat it as a security regression rather than a style warning.
