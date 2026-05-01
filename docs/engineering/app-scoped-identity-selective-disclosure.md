# App-Scoped Identity and Selective Disclosure

Last updated: 2026-04-30
Status: E01 foundation

## Purpose

Cubid should behave like identity protocol infrastructure, not a shared user
database for relying parties. Apps should receive stable identifiers and
consented claims that are scoped to their relationship with the subject. They
should not receive raw Cubid user IDs, internal human subject keys, Firebase
UIDs, dapp user UUIDs, token hashes, or other values that enable cross-app
tracking.

E01 makes this explicit by introducing a shared app-scoped identity and
selective-disclosure contract that can be reused by the Allow Page, OIDC
consent, SDK-facing API routes, and webhook payload filtering.

## Source Of Truth

`@cubid/identity` owns the pure domain contract:

- `deriveAppScopedSubject`: derives an opaque per-app subject from an app
  identifier, actor type, stable subject key, and server-held secret.
- `SelectiveDisclosureRequest`: describes what an app or OIDC client is asking
  to receive.
- `SelectiveDisclosureGrant`: records the normalized scope and claim set that a
  subject approved for a specific app-scoped subject.
- `filterDisclosedClaimValues`: releases only values covered by an active grant.
- raw identifier claim guards: prevent accidental release of internal IDs.

The database migration `20260430214000_app_scoped_identity_disclosure.sql`
creates the first persistence layer:

- `public.app_scoped_subjects`
- `public.selective_disclosure_grants`
- `public.selective_disclosure_events`

All three tables are service-role-only. Browser, dapp, and authenticated
Supabase clients must go through Passport, Admin, or OIDC server routes.

## Runtime Adoption

OIDC consent approval now mirrors `oidc_consents` into the shared disclosure
contract. Each approved or reused consent creates or reuses an
`app_scoped_subjects` row for `oidc:<client_id>`, then stores the granted scopes
and classified claims in `selective_disclosure_grants` with source `oidc`.
OIDC pairwise `sub` remains the protocol-facing identifier, while the shared
app-scoped subject lets non-OIDC disclosure tooling reason about the same grant.

Allow Page stamp permissions now also create or reuse an app-scoped subject for
`dapp:<id>` and persist a source `allow_page` disclosure grant for the shared
stamp scope. Legacy `stamp_dappuser_permissions` remains in place for existing
reads, but new grants are durably represented in the selective-disclosure
contract as well.

SDK-facing Passport identity routes now consult active source `allow_page`
disclosure grants before returning stamp values to a dapp. Legacy response
shapes are preserved where practical, but undisclosed stamps are removed from
the result set and email/phone fields are nulled unless the matching stamp claim
was granted. This is intentionally stricter than the old table-permission
behavior: `stamp_dappuser_permissions` remains a legacy compatibility table, but
new grants are evaluated through the selective-disclosure contract. During the
rollout period, routes retain a compatibility fallback to existing
`stamp_dappuser_permissions` rows so pre-migration grants are not silently
revoked before a production backfill has run.
Score and score-detail endpoints also calculate only from disclosed stamps so a
dapp cannot infer undisclosed credentials from score contributions.

Profile and location values are now treated as explicit non-stamp disclosure
claims. The current taxonomy is:

- `profile:name`: releases display-name or nickname-style profile values.
- `profile:*`: releases all current profile claims in this namespace.
- `location:rough`: releases country-level or rough location values.
- `location:approximate`: releases approximate location values and satisfies
  rough-location reads.
- `location:exact`: releases exact address or coordinate values and satisfies
  approximate and rough-location reads.
- `location:*`: releases all current location granularities.

The `profile` and `cubid:profile` scopes are accepted as profile-name grants
for compatibility with standard profile-style consent. Location reads require a
location claim; a broad `cubid:location` scope alone is not enough to release
exact, approximate, or rough location data. Approximate location routes must not
return raw address objects, and legacy dapp identity routes must sanitize user
objects instead of spreading raw database rows.

Webhook delivery is also grant-gated. Internal webhook trigger jobs look up the
dapp user's active disclosure grants before sending credential events to a dapp
subscription, and skip delivery when the changed stamp has not been disclosed to
that dapp. The first pass preserves the existing webhook payload shape while
preventing undisclosed stamp events from being sent.

Passport requires `PASSPORT_APP_SCOPED_SUBJECT_SECRET` for Allow Page subject
derivation. OIDC currently derives its broader app-scoped subject from the same
server-held secret used for pairwise subject derivation so the two OIDC subject
contracts remain tied to the issuer custody boundary.

## App-Scoped Subject Rules

An app-scoped subject is opaque and stable for one app or client. It is derived
from:

- app identifier, such as `dapp:<id>` or `oidc:<client_id>`
- actor type: `human`, `agent`, or `organization`
- stable subject key
- the app-scoped subject master secret

The same human, agent, or organization gets different public subject values at
different apps. The same app gets a stable value for the same subject unless a
future rotation migration intentionally changes the derivation contract.

OIDC pairwise `sub` remains the OIDC-specific subject identifier. E01's
app-scoped subject contract is broader: it also covers Allow Page, REST APIs,
SDKs, and webhook filtering.

## Disclosure Grant Rules

A disclosure grant is the durable record of what a subject allowed one app to
receive. Grants include:

- source: `allow_page`, `oidc`, `api`, or `webhook`
- normalized granted scopes
- normalized granted claims with data classification
- policy and consent version
- grant fingerprint
- revocation metadata

Claims must be classified as one of:

- `identity`
- `hashed`
- `boolean`
- `score`
- `json`

Internal identifiers are never valid disclosure claims. If a downstream app
needs a stable ID, it receives the app-scoped subject or OIDC pairwise `sub`,
not raw Cubid storage identifiers.

## Runtime Adoption Sequence

E01 does not rewrite every route in one pass. Current and remaining adoption
sequence is:

1. Use `@cubid/identity` disclosure helpers in new API and webhook code.
2. Route Allow Page stamp permissions through `selective_disclosure_grants`.
3. Mirror OIDC consent records into disclosure grants or make OIDC consume the
   disclosure grant service directly.
4. Update SDK-facing identity routes to return only app-scoped subject and
   granted claims.
5. Use disclosure grants to filter webhook payloads.
6. Extend the grant taxonomy beyond stamps to profile and location claims.
7. Add user-facing disclosure history and revocation views that cover both OIDC
   and non-OIDC app grants.

## Non-Goals In This Slice

- No destructive migration of legacy `stamp_dappuser_permissions`.
- No breaking change to the existing v2 identity routes.
- No full Allow Page redesign.
- No live deployment, backfill, or production migration execution.
- No new browser-readable Supabase grants.
