# Cubid Backgrounder For Agents

Read this before making product, design, architecture, or SDK decisions.

Cubid is a proof-of-personhood and identity protocol. It gives apps a unified,
privacy-preserving way to verify that users are human, manage identity data, and
support secure app-scoped interactions without creating cross-app tracking.

Cubid is API-first infrastructure. The product should feel easy for developers,
SDKs, apps, and agents to consume, while still preserving user control and data
minimization.

## Who Cubid Serves

- Developers and apps are the primary customer: they need humanity checks,
  Sybil resistance, identity signals, wallets, secrets, location, webhooks, and
  reliable APIs.
- End users are the protected subject: they build reusable identity depth,
  choose what to disclose, and should not be forced into heavy KYC-style flows.
- Agents and organizations are future identity classes. They must be identified
  honestly as non-human or non-person actors and must not masquerade as humans.

## Core Capabilities

- Identity: create users from email, phone, OAuth, wallet, or other supported
  identifiers; fetch identity data and stamps; provide app-scoped user IDs; and
  release data through explicit selective disclosure.
- Humanity and trust: compute humanity scores, detect duplicate or Sybil-like
  identities, and notify apps when scores or trust signals change.
- Wallets: generate and manage user wallets across supported ecosystems. Chain
  logic must remain isolated by ecosystem.
- Secrets: store and retrieve user-scoped secrets through secure server-side
  APIs. Advanced encryption/custody helpers belong in dedicated packages when
  they grow beyond core API wrappers.
- Location: provide approximate or precise geo data only when permissioned.
- Comms: emerging capability for reaching users through approved channels such
  as email, SMS, or other future user-controlled channels.

## Architectural Principles

- API-first: every durable capability should have a clear HTTP/API contract.
- App-scoped identity: each app gets its own user identifier; never expose raw
  cross-app identifiers to relying parties.
- Minimal app storage: integrators should usually store only Cubid `user_id`
  and fetch current identity, score, and permission state as needed.
- Selective disclosure: users control which identity data each app can see.
- Privacy by default: collect less data, expose less data, and assume breaches
  can happen.
- Modular but coherent: Cubid is one identity protocol exposed through a small
  number of focused SDKs, not a grab bag of unrelated utilities.

## Agent Decision Rules

- Prefer protocol and API clarity over app-specific shortcuts.
- Prefer app-scoped identifiers and consent-aware data release over shared
  identifiers or broad PII exposure.
- Do not hardcode identity assumptions, user traits, or cross-app mappings.
- If a decision conflicts with privacy, user control, or protocol openness,
  privacy, user control, and openness win.
- For SDK/package boundaries, use
  `docs/engineering/sdk-package-target-state.md` as the source of truth.

