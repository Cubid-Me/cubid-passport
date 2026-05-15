# Flexible Messaging API v3 Architecture

Last updated: 2026-05-14
Status: FM01 target-state contract

## Purpose

Flexible messaging lets apps ask Cubid to deliver user-authorized
notifications through user-selected channels without receiving raw contact
details. Cubid remains infrastructure: the originating app stays visible to the
user, while Cubid enforces app-scoped permissions, preferences, channel
verification, rate limits, and delivery auditability.

This document adapts the flexible messaging PRD into the current
`cubid-passport` architecture. New developer-facing routes use API v3. Public
SDK implementation belongs in `Cubid-Me/cubid-sdk`; this repo owns backend
contracts, migrations, Passport/Admin UX, provider delivery, and SDK handoff
notes.

## MVP Boundary

MVP channels:

- `email`
- `telegram`

MVP categories:

- `SECURITY`
- `TRANSACTIONAL`
- `WORKFLOW`

Priority values:

- `LOW`
- `NORMAL`
- `HIGH`
- `CRITICAL`

`MARKETING`, social chat, group messaging, Discord, WhatsApp, push, Matrix,
Signal, Nostr, fallback routing, digests, AI routing, and cross-app bundling
are deferred. `CRITICAL` priority may receive stricter routing and audit
requirements, but it must not become a preference-bypass loophole without an
explicit later policy todo.

`SECURITY` is a high-sensitivity category, not a generic way for apps to send
their own OTP or password-reset systems through Cubid. App-originated security
notifications must be allowed by Admin policy and user grant before delivery.
Cubid-owned auth/recovery messages should continue to use first-party auth
flows unless a later todo explicitly migrates them into this infrastructure.

## Ownership Model

Passport owns user-facing channel and preference management:

- add and verify channels
- set default channels
- configure app/category preferences
- mute, pause, revoke, and inspect history

Admin owns operator controls:

- category registry
- provider enablement
- app quotas and suspensions
- delivery analytics
- abuse and rate-limit visibility

API v3 owns app-facing delivery:

- app requests notification delivery for one app-scoped user
- Cubid validates dapp auth, grants, preferences, rate limits, and channel
  availability
- Cubid records immutable event/delivery evidence and attempts delivery

The public SDK repo owns ergonomic client helpers and examples after this repo
creates a handoff note for each implemented backend contract.

## Privacy And Authorization

Apps never receive raw channel destinations such as email addresses, Telegram
chat IDs, phone numbers, provider tokens, or encrypted custody fields.

Every send request is scoped to the authenticated dapp from `dapp_api_keys`.
Optional `dapp_id` compatibility fields may be accepted in route bodies, but
the authenticated dapp remains the authority.

Users must grant notification access before an app can send. Notification
grants are app-scoped and category-specific. They can share Allow Page and
disclosure UI patterns, but they are a distinct permission family from identity
claim/stamp disclosure. The default is fail-closed.

Channel identifiers that need later retrieval are retrievable secrets and must
use the C05-style custody pattern: private schema storage, Supabase
Vault-backed envelope encryption, service-role-only decrypt paths, redacted
logs, and no browser/API exposure of ciphertext or key metadata.

## Canonical API v3 Route Family

All new developer-facing routes should live under `/api/v3/notifications/*`.
The PRD's suggested `/api/v2/notifications/*` namespace is intentionally not
used.

Initial app-facing routes:

- `POST /api/v3/notifications/send`
- `POST /api/v3/notifications/status`

Initial Passport user routes:

- `POST /api/notifications/channels/list`
- `POST /api/notifications/channels/start-verification`
- `POST /api/notifications/channels/complete-verification`
- `POST /api/notifications/channels/update`
- `POST /api/notifications/preferences/list`
- `POST /api/notifications/preferences/update`
- `POST /api/notifications/history/list`
- `POST /api/notifications/grants/allow-page/list`
- `POST /api/notifications/grants/allow-page/update`

FM03 implemented the channel and preference routes above, excluding history.
They are Passport-user-authenticated routes using Firebase bearer auth, shared
request IDs, CORS, rate limits, and structured error envelopes. Channel
responses expose only metadata such as `channelId`, `channelType`, label,
masked `displayHint`, verification status, default status, and timestamps.
They must never return raw destinations, ciphertext, IVs, auth tags, wrapped
keys, provider secrets, or service-role metadata.

Email channel verification sends a short one-time code through the existing
server SMTP path and stores only an HMAC challenge hash. Telegram verification
starts with a temporary one-time setup code so users can prepare the channel;
FM07 owns the real Telegram bot handshake and provider delivery adapter.

FM04 added the Allow Page notification grant routes. They validate the
`uid`/`pageId` pair against a single dapp, then let the user grant or revoke
category-level app notification permission for `SECURITY`, `TRANSACTIONAL`,
and `WORKFLOW`. These grants are distinct from identity/stamp disclosure
grants and do not reveal channel destinations or app delivery capability.

FM05 added the first dapp-facing send route:
`POST /api/v3/notifications/send`. The route authenticates with hashed dapp
API keys, requires `Idempotency-Key`, validates payload shape and content
limits, confirms the target `dapp_user_uuid` belongs to the authenticated
dapp, enforces `notification_app_policies`, checks active
`notification_app_grants`, applies user preference mute/pause state, selects a
verified eligible channel, records `notification_events`, and creates queued
`notification_delivery_attempts`. FM06 adds SMTP email delivery for verified
email channels; Telegram delivery remains deferred to FM07. `accepted` still
means Cubid accepted and routed the event into the delivery pipeline, not that
every provider has completed delivery.

FM06 delivers email by decrypting the verified channel destination only inside
the server-side provider adapter, sending through the existing SMTP
configuration, and updating the delivery attempt as `sent` or `failed`.
Provider failures are best-effort operational evidence: they update
`notification_delivery_attempts` and the parent event status without exposing
the email address to the app or changing the send route into a raw SMTP proxy.

FM07 adds Telegram as the second provider. Telegram setup uses the same
one-time verification challenge model and stores chat identifiers in
`private.notification_channel_destinations` with the notification-channel
envelope encryption context. Delivery uses the configured Telegram Bot API
token, decrypts the chat id only inside the provider adapter, and records
`sent` or `failed` delivery-attempt evidence without returning chat ids,
bot-token material, or provider internals to apps.

Initial Admin routes:

- `POST /api/admin/notifications/overview`
- `POST /api/admin/notifications/categories/upsert`
- `POST /api/admin/notifications/providers/update`
- `POST /api/admin/notifications/app-policy/upsert`

FM08 implements the Admin control plane for these routes and adds the
Notifications tab in the Admin UI. The overview response is redacted
operator evidence: category registry rows, provider status, per-app policy and
quota controls, recent event status, and delivery-attempt aggregates. Admins
can enable/suspend providers, update category display/default priority/status,
and save app-level category/provider/priority/quota policy. Provider secrets,
raw email addresses, Telegram chat ids, encrypted destinations, and user-owned
channel details are never returned to Admin.

Route implementation must use the shared Passport/Admin API security baselines:
request IDs, explicit methods, zod validation, CORS policy, structured errors,
dapp/user/admin actor guards, rate-limit handling, and security-event logging.

## Send Notification Contract

`POST /api/v3/notifications/send` accepts a structured notification request:

```json
{
  "apikey": "cubid_live_...",
  "dapp_user_uuid": "00000000-0000-4000-8000-000000000000",
  "category": "TRANSACTIONAL",
  "priority": "HIGH",
  "title": "Milestone Approved",
  "body": "Milestone #4 was approved.",
  "deep_link": "smartrust://milestone/4",
  "metadata": {
    "contract_id": "123"
  }
}
```

Rules:

- `Idempotency-Key` is required.
- `dapp_user_uuid` must belong to the authenticated dapp.
- `category` must be enabled for the app and granted by the user.
- `priority` must be allowed for the app/category policy.
- `title` and `body` are short-form transactional content, not long-form email
  or arbitrary marketing copy.
- `metadata` must be JSON, size-limited, and safe to store in event history.
- Delivery is denied when the user has no verified eligible channel, has muted
  the app/category, has paused notifications, or when rate/provider policy
  blocks the request.
- A successful response means Cubid accepted and routed the event. Provider
  delivery may still be queued, pending, delivered, or failed.
- Email delivery is attempted immediately for verified `email_smtp` channels
  when the provider is enabled and SMTP configuration is present. SMTP failure
  records a failed delivery attempt but never returns raw channel destinations.
- Telegram delivery is attempted immediately for verified `telegram_bot`
  channels when the provider is enabled and `TELEGRAM_BOT_TOKEN` is present.
  Bot API failures record failed delivery attempts without returning chat ids.

Success response:

```json
{
  "data": {
    "eventId": "notification event id",
    "status": "accepted",
    "category": "TRANSACTIONAL",
    "priority": "HIGH",
    "selectedChannelType": "telegram",
    "createdAt": "2026-05-14T00:00:00.000Z"
  }
}
```

Responses must never include channel destinations, provider credentials,
ciphertext, wrapped keys, human subject keys, raw Cubid user IDs, or
service-role-only metadata.

## Routing And Delivery Flow

1. Authenticate the dapp.
2. Validate the request and idempotency key.
3. Resolve the app-scoped dapp user.
4. Check app/category policy and user notification grant.
5. Check user preferences, mute/pause state, verified channel state, and
   provider availability.
6. Apply rate limits.
7. Record the notification event.
8. Create delivery attempts for the selected provider.
9. Deliver through the provider adapter when available. Email delivery uses the
   SMTP adapter; Telegram delivery uses the Telegram Bot API adapter.
10. Record success/failure evidence and expose only safe status metadata.

Fallback routing is deferred. The MVP should pick one best eligible channel
from explicit user preference, then global default, then a conservative
provider/category default.

Channel selection precedence for the MVP is:

1. app/category preference
2. app-level preference
3. global category preference
4. verified default channel for the selected channel type
5. deny with a stable no eligible channel error

`CRITICAL` priority may tighten audit, freshness, and rate-limit policy. It
must not bypass revocation, app/category denial, provider disablement, or an
explicit user mute/pause unless a later emergency-delivery policy is designed
and approved.

## Event And Status Model

Notification events are immutable records of app intent and Cubid routing
decision. Delivery attempts are provider-specific records attached to events.

Recommended status values:

- `accepted`
- `denied`
- `queued`
- `delivered`
- `failed`
- `muted`
- `rate_limited`
- `provider_disabled`

Apps may query only their own event status. Users may inspect their own
history. Admin may inspect redacted operational evidence across apps.

## Storage Foundation

The FM02 schema foundation creates these storage groups:

- `notification_categories` and `notification_providers` define the supported
  MVP categories and email/Telegram provider registry.
- `user_notification_channels` stores public, non-secret channel metadata such
  as label, type, verification status, mute/pause state, and default status.
- `private.notification_channel_destinations` stores encrypted retrievable
  channel destinations using the C05 envelope pattern and Vault secret
  `passport_notification_channel_wrapping_key_v1`.
- `notification_app_grants` records app-scoped category authorization for a
  dapp user.
- `notification_preferences` records user routing preferences globally or per
  app/category.
- `notification_events` and `notification_delivery_attempts` record redacted
  send intent, routing decisions, provider attempts, and status evidence.

All tables enable RLS and grant access only to `service_role`; app and browser
access must go through Passport/Admin/API v3 routes.

The FM02.1 reconciliation layer adds the missing runtime prerequisites:

- `notification_verification_challenges` records email and Telegram
  verification sessions with expiry, one-time consumption, attempt limits, and
  replay protection.
- `notification_app_policies` records app-level enablement, allowed
  categories, allowed providers, allowed priorities, sandbox state, and
  send-rate caps.

Provider registry rows are seeded disabled. Real delivery requires Admin/config
enablement plus app policy, user grant, verified channel, and rate-limit
approval.

`notification_verification_challenges` stores only challenge hashes, not raw
email OTPs, Telegram codes, or provider secrets. Challenges default to three
attempts, one-time consumption, and explicit expiry. Runtime code must treat
consumed/replayed/expired challenge reuse as a security event.
Challenge hashing uses the service-role-only Vault secret
`passport_notification_challenge_hash_secret_v1`, separate from the encryption
wrapping key.

`notification_app_policies` is fail-closed. A missing row or `disabled` status
means the app cannot send notifications. `SECURITY` cannot appear in
`allowed_categories` unless `security_category_enabled` is true.

## SDK Handoff Boundary

When any backend route becomes real, create a message in
`/Users/botmaster/src/cubid/cubid-sdk-v2/agent-context/messages-from-cubid-passport/`
covering:

- route paths and request/response shapes
- enum values
- server-only API key requirements
- idempotency behavior
- structured error codes
- browser-hosted Passport flows for user channel/preference management
- example app expectations

No public SDK implementation should be added to this repo.

## Deferred Work

The following are intentionally outside FM01 and the email/Telegram MVP:

- marketing category delivery
- arbitrary newsletters or long-form email hosting
- general chat, group messaging, or social-network features
- fallback channel chains
- Discord, WhatsApp, push, Matrix, Signal, Nostr, or webhook inbox delivery
- AI routing, presence awareness, cross-app digests, and user-agent delivery
