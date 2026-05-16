# Flexible Messaging Operations Runbook

Last updated: 2026-05-15
Status: FM12 production-readiness checklist

## Purpose

This runbook describes how to operate and smoke-test the flexible messaging
MVP after the backend code and migrations are deployed. It does not claim that
hosted readiness has passed. Operators should record real environment evidence
before enabling app traffic.

Flexible messaging lets dapps ask Cubid to deliver user-authorized
notifications through verified user channels without exposing raw email
addresses, Telegram chat ids, encrypted channel metadata, provider secrets, or
cross-app notification history.

## Required Runtime Inputs

Supabase migrations must be applied through the protected deployment workflow:

- `20260514222500_flexible_messaging_foundation.sql`
- `20260514223500_flexible_messaging_policy_gaps.sql`
- `20260514224500_notification_channel_challenge_hash_secret.sql`

Supabase Vault must contain these service-role-only secrets:

- `passport_notification_channel_wrapping_key_v1`: base64/base64url encoded
  32-byte wrapping key for encrypted channel destinations.
- `passport_notification_challenge_hash_secret_v1`: high-entropy secret for
  HMAC hashing email and Telegram verification challenges.

Passport runtime environment must contain:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_API_BASE_URL`, optional, defaults to `https://api.telegram.org`

Admin/runtime prerequisites:

- At least one active `notification_providers` row for `email_smtp` before
  email delivery can succeed.
- At least one active `notification_providers` row for `telegram_bot` before
  Telegram delivery can succeed.
- A dapp-specific `notification_app_policies` row with `status = 'enabled'`,
  positive minute/day caps, allowed categories, allowed priorities, and allowed
  providers.
- User-level `notification_app_grants` rows for each dapp/category pair.
- Verified user channels with encrypted destinations present in
  `private.notification_channel_destinations`.

## Launch Gates

Do not claim flexible messaging is production-ready until all gates have live
evidence:

- Migrations are present in the hosted Supabase migration history.
- Vault helper functions resolve both notification secrets without logging
  secret values.
- Passport can start and complete email channel verification.
- Passport can start and complete Telegram channel verification.
- Admin can enable/suspend providers and update per-app policy.
- Allow Page can grant and revoke notification categories.
- API v3 send accepts an authorized notification and records event/delivery
  evidence.
- Email delivery succeeds or records a redacted provider failure.
- Telegram delivery succeeds or records a redacted provider failure.
- User history and dapp status routes return redacted evidence only.
- Denial paths are visible for missing grant, muted preference, disabled
  provider, quota exhaustion, malformed payload, and invalid dapp auth.

## Smoke Checklist

1. Confirm hosted migrations include the three flexible messaging migrations.
2. Confirm Supabase Vault contains both notification secrets and that the
   service-role helper functions execute successfully.
3. In Admin, enable `email_smtp` and `telegram_bot` only for the target test
   environment.
4. In Admin, create or update a test dapp policy with:
   allowed categories `TRANSACTIONAL` and `WORKFLOW`, allowed priorities
   `LOW`, `NORMAL`, `HIGH`, positive minute/day caps, and the provider being
   tested.
5. In Passport Profile, add and verify an email channel. Confirm the UI shows
   only masked destination evidence.
6. In Passport Profile, add and verify a Telegram channel through the bot
   handshake. Confirm the UI shows only masked destination evidence.
7. On Allow Page, grant the test dapp one notification category, then revoke
   and re-grant it to confirm revocation works.
8. Call `POST /api/v3/notifications/send` with a fresh `Idempotency-Key` for
   the granted dapp user and category.
9. Confirm the response returns an event id and routing status, not raw channel
   destinations or provider internals.
10. Confirm `notification_events` and `notification_delivery_attempts` contain
    redacted evidence for the event.
11. Call `POST /api/v3/notifications/status` as the dapp and confirm only
    app-scoped event status is returned.
12. Call `POST /api/notifications/history/list` as the user and confirm the
    history is user-visible, redacted, and includes app/category/status.
13. Trigger denials for muted preference, missing grant, disabled provider,
    quota exhaustion, malformed payload, and invalid dapp key.
14. Confirm denials return structured error envelopes with `X-Request-Id` and
    do not expose destinations, ciphertext, wrapped keys, provider secrets, raw
    user ids, or cross-app events.

## Triage Guide

Origin or auth denial:

- Use the response `X-Request-Id` to find matching Passport API security
  events.
- Confirm the dapp API key is active in `dapp_api_keys`.
- Confirm optional `dapp_id` body fields match the authenticated key.

No eligible channel:

- Confirm the user has a verified channel for the requested provider/category.
- Confirm the channel is not revoked, paused, muted, or app/category-denied.
- Confirm the app/category grant is active.

Provider disabled:

- Confirm `notification_providers.status` is `active`.
- Confirm the app policy `allowed_providers` includes the provider key.
- Confirm Admin did not intentionally suspend the provider for incident
  response.

Quota exceeded:

- Check the app policy `minute_limit` and `daily_limit`.
- Inspect recent `notification_events` for the same dapp and dapp user.
- A `0` limit currently means no explicit cap for an already-enabled policy,
  but production policies should use positive caps.

Provider failure:

- Email failures usually point to SMTP env/config, provider outage, or
  recipient rejection.
- Telegram failures usually point to bot-token configuration, user chat
  lifecycle, or Telegram Bot API response errors.
- Delivery failures should update attempts and parent event status without
  leaking channel destinations.

## Emergency Controls

To stop delivery without code changes:

- Suspend the affected provider in Admin or set
  `notification_providers.status = 'suspended'`.
- Disable the affected dapp policy or remove the provider/category from the
  policy allowlist.
- Lower policy minute/day caps for abusive apps.
- Revoke a user's affected channel or app/category grant.

Do not delete encrypted channel destination rows during an incident unless a
separate privacy/data-removal action is required. Suspension and revocation are
safer first responses because they preserve audit evidence.

## Known Boundaries

- FM12 provides the runbook and smoke contract. It does not by itself prove
  hosted launch readiness.
- Marketing delivery is intentionally out of scope.
- Provider delivery is best-effort after Cubid accepts and routes the event.
- Public SDK implementation belongs in `Cubid-Me/cubid-sdk`; this repo only
  owns backend contracts and handoff notes.
