# Flexible Messaging Todo

## Execution Protocol

- Keep this file scoped to the flexible messaging PRD at
  [prd-flexible-messaging.md](./prd-flexible-messaging.md).
- Do not merge these todos into the main `agent-context/todo.md` until the user
  explicitly promotes flexible messaging into the primary roadmap.
- Always build on feature branches and commit after each coherent todo.
- Before each commit, add an entry to both this feature-local
  `session-log.md` and the repo-level `agent-context/session-log.md`.
- Use API v3 for developer-facing notification routes; do not implement the
  PRD's suggested `/api/v2/notifications/*` namespace.
- Keep public SDK implementation in `Cubid-Me/cubid-sdk`; this repo should
  create SDK handoff notes only when backend contracts are implemented.
- Treat sensitive channel identifiers as retrievable encrypted secrets, using
  the private schema and Supabase Vault envelope-encryption patterns from C05.
- Mark a todo `Completed` only after docs, tests, and validation evidence are
  in place for that slice.

This side roadmap turns the flexible messaging PRD into backend-owned Cubid
work: API contracts, migrations, Passport/Admin UX, delivery infrastructure,
auditing, abuse controls, and SDK coordination. The MVP should stay narrow:
email and Telegram delivery, with initial categories `SECURITY`,
`TRANSACTIONAL`, and `WORKFLOW`.

## FM. Unified Notifications Infrastructure

### FM01. Define the API v3 flexible messaging architecture

- Status: Completed
- Timestamp started: 2026-05-14T22:22:05Z
- Timestamp completed: 2026-05-14T22:22:05Z
- Feature branch: codex/vercel-app-root-cleanup
- Head: d30bce0
- Session-log reference(s): session: fm-v2; repo session: v199

Create the target-state engineering doc for flexible messaging before adding
runtime routes or tables. Map the PRD's notification concepts onto Cubid's
current API v3, app-scoped identity, selective disclosure, and dapp-auth
contracts. Decide the canonical route family, minimum request/response
envelopes, category and priority enums, user/app authorization model, and SDK
handoff boundary. Explicitly replace the PRD's `/api/v2/notifications/*`
suggestion with API v3. Lock the MVP to email and Telegram delivery with
`SECURITY`, `TRANSACTIONAL`, and `WORKFLOW` categories unless the user expands
scope. The output should explain what belongs in Passport, Admin, shared
packages, migrations, provider adapters, and the public SDK repo.

Target-state doc:
[docs/engineering/flexible-messaging-api-v3-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/flexible-messaging-api-v3-architecture.md)

### FM02. Add notification domain schema and encrypted channel storage

- Status: Completed
- Timestamp started: 2026-05-14T22:23:43Z
- Timestamp completed: 2026-05-14T22:23:43Z
- Feature branch: codex/vercel-app-root-cleanup
- Head: 17f0ba5
- Session-log reference(s): session: fm-v3; repo session: v200

Add the database foundation for flexible messaging. Create tables for verified
user notification channels, app/category preferences, notification events,
delivery attempts, provider status, rate buckets, and security/audit records.
Store raw channel destinations such as email addresses, Telegram chat IDs, or
provider identifiers only as encrypted private-schema custody data when later
retrieval is required. Public tables should expose opaque channel IDs,
non-secret labels, type, verification status, mute/pause state, and timestamps.
Design indexes for app-scoped lookup and user history without allowing
cross-app channel discovery. The schema should support immediate revocation,
future fallbacks, and provider-specific metadata without leaking contact
details to dapps.

Implementation migration:
`supabase/migrations/20260514222500_flexible_messaging_foundation.sql`

### FM02.1. Reconcile flexible messaging schema and policy gaps before runtime APIs

- Status: Completed
- Timestamp started: 2026-05-14T22:33:52Z
- Timestamp completed: 2026-05-14T22:33:52Z
- Feature branch: codex/vercel-app-root-cleanup
- Head: 47cefab
- Session-log reference(s): session: fm-v5; repo session: v202

Add the missing schema and policy pieces discovered during roadmap review
before Passport runtime APIs begin. Create verification challenge/session
storage for email and Telegram with expiry, attempt limits, one-time
consumption, pending lookup indexes, and replay prevention. Add app
notification policy/quota storage for enabled categories, allowed priorities,
allowed providers, sandbox/disabled state, and minute/day caps. Clarify in docs
that provider registry rows are seeded disabled and real delivery requires
Admin/config enablement. This todo should keep `SECURITY` app-originated
messages policy-gated, define channel-selection precedence, and make clear that
`CRITICAL` priority strengthens audit/rate-limit scrutiny but does not bypass
user revocation or app/category denial.

Implementation migration:
`supabase/migrations/20260514223500_flexible_messaging_policy_gaps.sql`

### FM03. Add user channel verification and preference management

- Status: Completed
- Timestamp started: 2026-05-14T22:48:59Z
- Timestamp completed: 2026-05-14T22:48:59Z
- Feature branch: codex/vercel-app-root-cleanup
- Head: ed00cd6
- Session-log reference(s): fm-v6, v203

Implement the Passport-owned user surface for managing notification channels
and preferences. This slice owns server encryption helpers for notification
channel destinations, authenticated Passport APIs for list/start verification/
complete verification/update, and Profile UI for channel management. Signed-in
users should be able to add, verify, label, set defaults, mute, pause, revoke,
and prioritize channels globally and per app/category. Email verification
should reuse hardened OTP-style semantics where appropriate, while Telegram
should use an explicit bot handshake rather than trusting unverified chat
identifiers. API responses must omit raw channel destinations, encrypted
fields, provider secrets, and service-role metadata.

### FM04. Add app notification permission and category grants

- Status: Completed
- Timestamp started: 2026-05-14T22:53:33Z
- Timestamp completed: 2026-05-14T22:53:33Z
- Feature branch: codex/vercel-app-root-cleanup
- Head: f6ee425
- Session-log reference(s): fm-v7, v204

Extend Cubid's Allow Page model so users explicitly authorize which apps may
send which notification categories through selected channel classes. This slice
owns notification grant UX and persistence, not generic identity/stamp
disclosure grants. Grants should be app-scoped, revocable, auditable, and
separate from identity disclosure even if they share UI patterns. The default
is fail-closed: no app can send notifications until the user has authorized the
app and category. Marketing remains disabled unless a future todo explicitly
adds it. App-facing responses stay limited to allowed categories and delivery
status rather than channel details.

### FM05. Implement API v3 app send-notification contract

- Status: Completed
- Timestamp started: 2026-05-14T23:41:22Z
- Timestamp completed: 2026-05-14T23:41:22Z
- Feature branch: codex/vercel-app-root-cleanup
- Head: 7e7401d
- Session-log reference(s): fm-v8, v206

Add the dapp-authenticated API v3 route for sending structured notifications,
centered on `/api/v3/notifications/send`. This slice owns send-route
validation, idempotency, content limits, dapp-user ownership, app policy,
grant/preference checks, event creation, and delivery orchestration. It should
not implement provider-specific delivery beyond invoking adapter interfaces or
recording queued attempts. Responses should provide stable event and routing
status metadata without exposing channel destinations or provider internals.
Error envelopes should follow the existing Passport API security baseline.

### FM06. Implement email delivery provider integration

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add email as the first flexible messaging provider. Use existing SMTP and
operational-secret loading patterns, but route delivery through the new
notification event and delivery-attempt records rather than ad hoc app email
logic. The provider adapter should format sender identity clearly so the
originating app remains front-and-center while Cubid behaves as infrastructure.
It owns email-specific verification/delivery details, safe retries, provider
error mapping, redacted logs, and delivery-status updates. Security and
critical transactional messages may use stricter templates than workflow
messages. This slice should not introduce
general-purpose newsletter tooling, raw recipient disclosure to apps, or
marketing delivery unless later explicitly approved.

### FM07. Implement Telegram delivery provider integration

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add Telegram as the second MVP provider. Implement a verified channel
handshake, store Telegram chat identifiers as encrypted retrievable channel
data, and route messages through a provider adapter with clear app-originating
copy. The implementation should support shared Telegram destinations across
apps while preserving app-scoped permissions and mute behavior. It should also
leave room for app-specific bots later without requiring that complexity in
the MVP. This slice owns Telegram-specific verification and delivery details.
Delivery attempts must record provider status and errors without logging chat
IDs, bot tokens, or message contents beyond the sanitized event record. This
slice should keep Telegram as notification routing, not a chat platform or
social network.

### FM08. Add Admin notification control plane

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Add Admin APIs and UI for operating flexible messaging. Admin users should be
able to view and manage category registry entries, provider enablement, app
quotas, app suspensions, provider health, delivery analytics, abuse signals,
and temporary channel or app blocks. Sensitive provider credentials and raw
channel destinations must never appear in Admin responses. Admin changes should
use existing admin auth, validation, rate-limit, and security-event patterns.
This slice should also define conservative defaults: only approved providers
enabled, marketing disabled, strict quotas for new apps, and visible evidence
for why a notification was denied, muted, failed, or delivered.

### FM09. Add auditability and delivery-status APIs

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Expose safe history and delivery-status surfaces. Users should be able to see
which app sent a notification, category, timestamp, selected channel label,
delivery status, and revoke or adjust preferences from the same context. Apps
should be able to query notification event status and delivery outcome for
their own app-scoped users, but never access underlying channel addresses,
other apps' events, provider secrets, raw Cubid user IDs, or cross-app channel
bindings. If app delivery updates should be push-based as well as pull-based,
extend the API v3 webhook contract with redacted notification status events in
this slice. This slice should use the existing request-id and structured-error
contract so support teams can trace a failed delivery from user/app evidence
to internal security and provider logs.

### FM10. Add rate limits, abuse prevention, and trust controls

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Harden flexible messaging against spam and abuse before broad enablement.
Enforce per-app, per-user, per-category, and per-priority rate limits, with
stricter defaults for new or low-trust apps. Add denial events for quota
exhaustion, unauthorized category use, muted users, disabled providers,
unverified channels, malformed payloads, and suspicious retry patterns.
Critical notifications may receive special handling only if explicitly allowed
by policy, and marketing should stay blocked by default. This slice should
feed Admin visibility and future app reputation scoring without overbuilding a
full anti-spam product in the MVP.

### FM11. Coordinate SDK and integration impact

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Coordinate all SDK-facing flexible messaging contracts with the public SDK
repo. For each backend route, response shape, error code, category enum,
priority enum, idempotency behavior, and delivery-status contract that becomes
real, write a handoff note in `Cubid-Me/cubid-sdk` under
`agent-context/messages-from-cubid-passport/`. The note should explain whether
the SDK change is additive or breaking, which helpers should be server-side
only, which browser flows should launch Passport-hosted UX, and what example
apps should demonstrate. Create notes immediately after each backend contract
change rather than waiting until the end of the full feature. Do not add SDK
code to this repository. This closes when every implemented backend contract
has a matching SDK-agent instruction.

### FM12. Production readiness and smoke validation

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Close the flexible messaging MVP with operator documentation, hosted validation,
and smoke checks. Add runbooks for provider secret ownership, channel
verification, delivery retries, rate-limit triage, abuse response, and
emergency provider disablement. Verify migrations and Vault/provider secrets in
the dev/preview Supabase and hosted app environments before claiming readiness.
Smoke should cover user channel verification, app grant creation, send
notification, email delivery, Telegram delivery, user history, app status
lookup, muted/unauthorized denial, rate-limit denial, and redaction of channel
destinations. This todo should leave a precise launch checklist rather than a
vague "messaging is done" claim.
