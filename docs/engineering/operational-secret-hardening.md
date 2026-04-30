# Operational Secret Hardening

Last updated: 2026-04-27
Status: Active C06 runbook

## Purpose

C06 covers runtime secrets that must remain environment-backed. These values
are not user-facing database secrets and are not moved into C05 envelope
storage. They must be loaded only in server-side code, fail closed when absent
or weak, and be rotated through the owning provider or deployment platform.

## Secret Classes

- OIDC: `OIDC_SIGNING_PRIVATE_JWK_JSON`, `OIDC_ACTIVE_SIGNING_KID`,
  `OIDC_PAIRWISE_SUBJECT_MASTER_SECRET`.
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
  `FIREBASE_PRIVATE_KEY`.
- Passport integrations: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_VERIFY_SERVICE_SID`, `SMTP_*`, `INSTAGRAM_CLIENT_SECRET`,
  `FRACTAL_CLIENT_SECRET`, `WLD_CLIENT_SECRET`,
  `NEAR_ISSUER_PRIVATE_KEY`, `PASSPORT_INTERNAL_API_TOKEN`,
  `PASSPORT_APP_SCOPED_SUBJECT_SECRET`.

Public `NEXT_PUBLIC_*` Firebase and OAuth client IDs are not private secrets,
but they still belong in app-local environment files and should not be reused
as server trust credentials.

## Loading Rules

- Use `@cubid/config` helpers for required secrets, JSON secret parsing,
  Firebase Admin private-key normalization, service-role Supabase config, and
  redaction.
- Error messages may name missing variables but must never include values.
- `OIDC_PAIRWISE_SUBJECT_MASTER_SECRET` must be at least 32 characters.
- `OIDC_SIGNING_PRIVATE_JWK_JSON` must be valid JSON and must carry a `kid` or
  be paired with `OIDC_ACTIVE_SIGNING_KID`.
- `PASSPORT_INTERNAL_API_TOKEN` must be at least 16 characters.
- `PASSPORT_APP_SCOPED_SUBJECT_SECRET` must be held server-side and should be
  treated like pairwise subject custody because rotation changes app-scoped
  subject derivation.
- Prefer canonical uppercase names. Temporary aliases remain supported for
  existing deployments:
  - `NEAR_ISSUER_PRIVATE_KEY` before `private_key_near`
  - `TWILIO_ACCOUNT_SID` before `twilio_sid`
  - `TWILIO_AUTH_TOKEN` before `authToken`

## Readiness Checks

Run the local non-blocking check:

```sh
pnpm check:secrets
```

Run strict mode in deployment smoke checks after secrets are provisioned:

```sh
node scripts/check-operational-secrets.mjs --strict
```

The script reports only present, missing, weak, or optional-missing status. It
does not print secret values.

## Rotation

- OIDC signing key: publish the new private JWK with a new
  `OIDC_ACTIVE_SIGNING_KID`, confirm `/jwks` exposes the public key, wait for
  issued token expiry, then retire the old key.
- Pairwise subject secret: do not rotate casually because it changes pairwise
  subjects. Treat rotation as an incident response requiring relying-party
  coordination.
- Supabase service role: rotate in Supabase, update all Passport/Admin/OIDC
  runtime environments, restart services, and verify server-only DB access.
- Firebase Admin: rotate service account credentials in Google Cloud, update
  app environments, restart, and smoke-test bearer verification.
- Twilio/SMTP/OAuth/NEAR: rotate in the provider console, update Passport
  runtime env, restart, and smoke-test the specific flow.
- `PASSPORT_INTERNAL_API_TOKEN`: rotate producers and consumers together,
  then verify internal cron/webhook routes reject the old token.
- `PASSPORT_APP_SCOPED_SUBJECT_SECRET`: do not rotate casually. Rotation
  changes Allow Page app-scoped subjects and requires a migration plan for
  `app_scoped_subjects` and downstream consumers.

## Incident Response

If a secret is suspected leaked:

1. Revoke or rotate the provider credential first.
2. Update the affected runtime environments.
3. Restart affected services.
4. Check `api_security_events`, `oidc_audit_logs`, provider logs, and request
   IDs for abnormal use.
5. Remove leaked values from local files and rotate again if the leak reached
   shared logs, screenshots, or committed history.
