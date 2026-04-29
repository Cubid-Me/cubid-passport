# Actor Identity Model

Cubid supports three self-identified actor types:

- `human`: an individual person and the primary proof-of-personhood subject.
- `agent`: software or automated actor, either standalone, supporting one
  human, or associated with an organization.
- `organization`: a broad category that includes formal incorporated
  organizations, teams, groups, networks, communities, collectives, and other
  loosely organized people.

## Validation Posture

Cubid spends most validation effort on self-identified humans. Humans are
eligible for personhood scoring, identity-depth policy, passkey-backed login,
and stamp-derived humanity claims.

Agents and organizations are intentionally lighter-weight. They may
self-identify, claim social accounts as stamps, and participate in app-scoped
identity flows, but they are not eligible for human personhood score
contribution by default. Cubid does not perform bespoke validation for
standalone agents, organization-owned agents, or organizations unless a future
product slice explicitly adds that policy.

This distinction lets agents and organizations reserve or claim social accounts
without letting those same accounts boost a human score elsewhere. The stamp can
exist in Cubid, but its contribution depends on the actor type and policy.

## Shared Package Contract

`@cubid/identity` owns the shared actor model:

- `CubidActorType`: `human`, `agent`, or `organization`.
- `CubidOrganizationKind`: formal organization, team, group, network,
  community, collective, or other.
- `CubidAgentAffiliationType`: standalone, human-supported, or
  organization-supported.
- `normalizeActorSelfIdentification`: validates and normalizes actor-declared
  metadata.
- `getActorValidationPolicy`: returns the default validation/scoring posture.
- `createMcpTrustResponse`: produces the MCP-compatible trust envelope.

`@cubid/claims` exposes actor claims under `cubid:claims`:

- `cubid_actor_type`
- `cubid_actor_self_identification`
- `cubid_agent_supports_human`
- `cubid_organization_kind`

## MCP Trust Envelope

MCP-compatible clients should consume `cubid-mcp-trust:v1` envelopes. The
envelope is app-scoped, consent-aware, and never exposes raw cross-app
identifiers. It includes:

- subject actor type and self-identification metadata
- validation intensity and personhood-score eligibility
- optional score only when the actor is a human
- stamp claims with explicit `contributesToHumanityScore`

The envelope is intentionally descriptive rather than magical: an agent can say
it supports a human, but that does not make the agent human or grant the agent a
human score. Applications should display actor type clearly whenever they
surface Cubid trust results.

## Runtime Persistence And Onboarding

E04 adds the first runtime persistence layer for actor self-identification.
Passport stores one authenticated actor profile per Firebase user in
`public.actor_profiles`, written only through service-role-backed Passport API
routes. The table is not directly accessible to `anon`, `authenticated`, or
browser clients.

The Profile page now includes an `Identity type` card where signed-in users can
self-identify as a human, agent, or organization. The card explains the default
validation posture inline:

- humans are eligible for personhood scoring and deeper validation
- agents can be standalone, human-supported, or organization-supported
- organizations can represent formal organizations, teams, groups, networks,
  communities, collectives, or other loosely organized actors
- non-human actors may claim stamps to prevent double-counting, but those stamps
  do not contribute to a human score by default

The Passport API surface is:

- `POST /api/actors/profile/get`
- `POST /api/actors/profile/upsert`

Both routes require a Firebase bearer token, use the shared Passport API
baseline for request IDs, CORS, validation, rate limits, and error envelopes,
and never return raw Firebase UIDs or database row IDs.

## Current Boundaries

E03 defines the shared model and claim contracts. E04 persists self-declared
actor profiles and adds Passport onboarding, but existing OIDC login remains
human-first. Token issuance, Admin review surfaces, stamp conflict resolution
UI, and MCP-facing runtime endpoints for non-human actors remain later slices.
