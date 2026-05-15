# Flexible Messaging Session Log

This log tracks the flexible messaging side-roadmap. It is scoped to the
feature folder and complements, but does not replace, the repo-level
`agent-context/session-log.md` commit log requirement.

### session: fm-v1

- timestamp: 2026-05-14T22:16:35Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`4dbbc3e`**
- session name: **Create flexible messaging PRD roadmap**

#### Objective

Create the initial flexible messaging planning surface so the PRD, roadmap, and
feature-local log live together before implementation begins.

#### Actions Taken

- kept the PRD as the source document for unified notification infrastructure
- created the feature-local todo file with API v3, app-scoped privacy, SDK
  boundary, encrypted channel storage, delivery, Admin, abuse-prevention, and
  production-readiness work items
- created this feature-local session log to mark the PRD/todo/log setup point

#### Verification

- `git diff --check`

#### Follow-up

- start `FM01` when the user is ready to turn the flexible messaging PRD into
  a backend API v3 architecture doc and implementation contract

### session: fm-v2

- timestamp: 2026-05-14T22:22:05Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`d30bce0`**
- session name: **Define flexible messaging API v3 architecture**

#### Objective

Complete `FM01` by translating the PRD into a repo-specific API v3
architecture contract for future flexible messaging implementation.

#### Actions Taken

- created the target-state engineering doc for flexible messaging API v3
- locked the MVP to email and Telegram with `SECURITY`, `TRANSACTIONAL`, and
  `WORKFLOW` categories
- documented route families, privacy boundaries, dapp/user/admin ownership,
  notification send contract, routing flow, status model, and SDK handoff rules
- updated the flexible messaging todo metadata to mark `FM01` completed

#### Verification

- `git diff --check`

#### Follow-up

- start `FM02` by adding the notification domain schema and encrypted channel
  storage foundation

### session: fm-v3

- timestamp: 2026-05-14T22:23:43Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`17f0ba5`**
- session name: **Add flexible messaging schema foundation**

#### Objective

Complete `FM02` by adding the notification domain schema and encrypted channel
destination storage foundation for future Passport/Admin/API v3 work.

#### Actions Taken

- added a Supabase migration for categories, providers, user channel metadata,
  app notification grants, preferences, notification events, and delivery
  attempts
- added `private.notification_channel_destinations` for encrypted retrievable
  email/Telegram destinations using the C05 envelope pattern
- added the Vault helper for
  `passport_notification_channel_wrapping_key_v1`
- updated the architecture doc and todo metadata to reference the storage
  foundation

#### Verification

- `git diff --check`

#### Follow-up

- start `FM03` by adding Passport channel verification and preference
  management APIs/UI on top of the schema

### session: fm-v4

- timestamp: 2026-05-14T22:32:22Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`a6ff751`**
- session name: **Reconcile flexible messaging roadmap before runtime**

#### Objective

Tighten the flexible messaging roadmap before `FM03` so runtime work starts
from decision-complete schema, policy, routing, and SDK-boundary guidance.

#### Actions Taken

- added `FM02.1` for verification challenge/session storage and app
  notification policy/quota storage
- clarified `SECURITY`, `CRITICAL`, channel-selection precedence, provider
  enablement, and delivery-status semantics in the architecture doc
- refined `FM03` through `FM12` so each slice has a safer implementation
  boundary before Passport runtime work begins

#### Verification

- `git diff --check`

#### Follow-up

- implement `FM02.1` as the schema/policy follow-up before starting `FM03`

### session: fm-v5

- timestamp: 2026-05-14T22:33:52Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`47cefab`**
- session name: **Implement flexible messaging policy gaps**

#### Objective

Complete `FM02.1` by adding verification challenge/session and app policy
storage before Passport runtime APIs begin.

#### Actions Taken

- added notification verification challenge storage for email and Telegram
  with hashed challenges, expiry, attempt limits, one-time consumption, and
  replay evidence
- added notification app policy storage for enabled categories, allowed
  priorities/providers, sandbox/disabled state, security-category gating, and
  minute/day caps
- updated the architecture doc and todo metadata to close `FM02.1`

#### Verification

- `git diff --check`

#### Follow-up

- start `FM03` for Passport channel encryption helpers, user APIs, Profile UI,
  and route tests

### session: fm-v6

- timestamp: 2026-05-14T22:48:59Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`ed00cd6`**
- session name: **Implement Passport notification channel management**

#### Objective

Complete `FM03` by adding Passport-owned user channel verification,
encrypted channel destination storage helpers, global preference management,
Profile UI, and route coverage.

#### Actions Taken

- added a Vault-backed challenge hash helper for notification verification
  codes, separate from the channel destination wrapping key
- added Passport server helpers for encrypted email/Telegram destination
  storage, channel verification challenge creation/completion, channel
  updates, and global category preferences
- added user-authenticated Passport routes for notification channel
  list/start verification/complete verification/update and preference
  list/update
- added a Profile card for email and Telegram setup, verification completion,
  safe channel listing, revocation/default controls, and global category
  routing preferences
- added Passport route tests for missing auth, encrypted/redacted channel
  verification, one-time challenge consumption, channel revocation, and
  preference updates
- updated the flexible messaging architecture doc and created an SDK handoff
  note for future user-profile SDK work

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- start `FM04` to add app notification permission and category grants through
  Allow Page-style authorization

### session: fm-v7

- timestamp: 2026-05-14T22:53:33Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`f6ee425`**
- session name: **Implement Allow Page notification grants**

#### Objective

Complete `FM04` by adding app-scoped notification category grants to the
hosted Allow Page flow without mixing them into identity/stamp disclosure
grants.

#### Actions Taken

- added Passport server helpers that validate `uid` and `pageId` belong to the
  same dapp before listing or replacing notification category grants
- added Allow Page routes for listing and updating `SECURITY`,
  `TRANSACTIONAL`, and `WORKFLOW` notification grants
- added Allow Page UI checkboxes explaining that apps do not receive channel
  addresses or delivery guarantees
- added Passport tests for replace-style grant updates and cross-dapp
  rejection
- updated the architecture doc and wrote an SDK handoff note for future
  permission-state modeling

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- start `FM05` for the API v3 app send-notification contract, idempotency,
  grant/policy/preference checks, and delivery orchestration skeleton

### session: fm-v8

- timestamp: 2026-05-14T23:41:22Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`7e7401d`**
- session name: **Implement API v3 notification send contract**

#### Objective

Complete `FM05` by adding the dapp-facing API v3 send-notification route with
app policy, user grant, preference, channel, idempotency, and queued delivery
evidence.

#### Actions Taken

- added `/api/v3/notifications/send` using the Passport dapp actor baseline
- added server-side notification send orchestration for dapp-user ownership,
  app policy checks, category grants, preference mute/pause checks, channel
  selection, event creation, and queued delivery-attempt creation
- preserved response redaction so apps receive event/routing metadata but no
  channel destinations or provider internals
- added route tests for success, idempotent replay, grant denial, malformed
  payloads, and idempotency conflicts
- wrote a public SDK handoff note for future SDK helpers

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`

#### Follow-up

- run final build/lint validation before commit, then continue with `FM06`
  email provider delivery integration

### session: fm-v9

- timestamp: 2026-05-14T23:47:14Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`975fe58`**
- session name: **Implement email notification delivery provider**

#### Objective

Complete `FM06` by adding SMTP-backed email delivery for flexible messaging
events while keeping channel destinations encrypted and hidden from apps.

#### Actions Taken

- added a server-side notification email sender that reuses the existing SMTP
  configuration and supports test injection
- extended `/api/v3/notifications/send` orchestration to decrypt verified
  email destinations only inside the provider adapter
- recorded delivery-attempt success or failure metadata without exposing raw
  email addresses to dapps
- added Passport tests for successful SMTP handoff and provider failure
  redaction
- updated the flexible messaging architecture doc and wrote an SDK handoff note

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM07` to add Telegram channel verification and delivery

### session: fm-v10

- timestamp: 2026-05-14T23:51:38Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`887fd58`**
- session name: **Implement Telegram notification delivery provider**

#### Objective

Complete `FM07` by adding Telegram channel verification coverage and Bot
API-backed notification delivery without exposing chat identifiers to apps.

#### Actions Taken

- added a Telegram notification sender with provider-test injection and
  server-only bot-token loading
- extended API v3 notification send delivery orchestration for verified
  `telegram_bot` channels
- added tests for Telegram setup-code verification, successful delivery,
  provider failure recording, and response redaction
- refreshed Passport Profile copy now that Telegram delivery is wired
- updated env examples, architecture docs, and SDK handoff notes

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM08` Admin notification control plane

### session: fm-v12

- timestamp: 2026-05-15T04:35:21Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`840a15b`**
- session name: **Add notification history and status surfaces**

#### Objective

Complete `FM09` by adding redacted user notification history and dapp-owned
delivery status APIs.

#### Actions Taken

- added a Passport user history helper and `/api/notifications/history/list`
  route for user-visible event and delivery evidence
- added a dapp-authenticated `/api/v3/notifications/status` route scoped to
  the authenticated app and app-scoped user
- added a Profile history section that shows app, category, channel label,
  event status, delivery status, and denial reason without raw destinations
- added route tests for user history redaction, dapp status lookup, and
  cross-dapp status denial
- updated the flexible messaging architecture doc and SDK handoff notes

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM10` rate limits, abuse prevention, and trust controls

### session: fm-v13

- timestamp: 2026-05-15T04:38:17Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`402d207`**
- session name: **Harden notification send abuse controls**

#### Objective

Complete `FM10` by enforcing provider enablement and app/user quota controls
inside API v3 notification sending.

#### Actions Taken

- required selected notification providers to be active before delivery
  attempts are created
- enforced per-app/per-user minute and daily quota caps from
  `notification_app_policies`
- recorded redacted denial events for disabled providers and quota exhaustion
- added Passport route tests for provider-disabled and quota-denied sends
- updated flexible messaging docs and todo/session metadata

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM11` SDK and integration coordination closeout

### session: fm-v14

- timestamp: 2026-05-15T04:39:31Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`1e1b409`**
- session name: **Coordinate flexible messaging SDK handoff**

#### Objective

Complete `FM11` by confirming every implemented flexible messaging backend
contract has a public SDK handoff note.

#### Actions Taken

- reviewed existing SDK handoff notes for Passport channel routes, Allow Page
  grants, API v3 send, email delivery, Telegram delivery, and status/history
- added a missing SDK handoff note for provider-disabled and quota-exceeded
  send denials
- updated flexible messaging docs to record the SDK/repo boundary for the
  implemented contracts
- marked `FM11` complete without adding SDK code to this repository

#### Verification

- `git diff --check`

#### Follow-up

- continue with `FM12` production readiness and smoke validation

### session: fm-v11

- timestamp: 2026-05-14T23:59:38Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`ad3c4a9`**
- session name: **Implement Admin notification control plane**

#### Objective

Complete `FM08` by adding Admin API and UI controls for flexible messaging
categories, providers, app quotas, and redacted delivery evidence.

#### Actions Taken

- added Admin server helpers for notification overview, category updates,
  provider status updates, and app notification policy upserts
- added Admin routes using the shared admin auth, validation, rate-limit, and
  error-envelope baseline
- added a Notifications tab with provider controls, category controls, app
  policy/quota controls, and recent event visibility
- added Admin route baseline tests for read and sensitive notification routes
- updated the flexible messaging architecture doc and todo metadata

#### Verification

- `pnpm --filter @cubid/admin lint`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- continue with `FM09` auditability and delivery-status APIs
