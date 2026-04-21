# Cubid Engineering Todo

## Execution Protocol

- Always build on feature branches.
- When starting a task:
  - update the status to `Started`
  - set `Timestamp started`
  - set `Feature branch`
  - set `Head`
  - reference [agent-context/cubid-backgrounder.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/cubid-backgrounder.md), [docs/engineering/current-state-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/current-state-architecture.md), and the relevant target-state doc before building
  - until a dedicated target-state architecture document exists, use [docs/engineering/monorepo-operating-model.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/monorepo-operating-model.md) as the target-state source of truth for monorepo work
- While building:
  - make underway commits if needed, always with an accompanying session-log entry
  - add unit tests and smoke tests for new features where appropriate
  - smoke test before reporting complete
  - do not write implementation history in this file; write that in `agent-context/session-log.md`
- After implementing each todo:
  - commit immediately once the task is in a coherent state
  - ensure the required session-log entry is already in place before that commit
- At the end of each task:
  - update relevant long-lived engineering docs in `docs/engineering/` whenever architecture, route decisions, workflows, or operating assumptions changed
  - if a dedicated target-state architecture doc was created or changed, reference it from the relevant todo metadata and follow-up session entries
- If a todo needs to be split, or if spillover actions were not completed:
  - remove those words from the current todo
  - create a new smaller todo in the right place in this document, for example `A01.1` immediately after `A01`
  - update any downstream todos that depend on the split work
- Once completed:
  - set status to `Completed`
  - update `Timestamp completed`
  - update `Head`
  - ensure all relevant session-log references are listed
- In every implementation readout:
  - state whether the commit was done
  - state whether the repo is clean
  - propose which todo should be done next
- Use this file to track task state and intent, not as a build diary.

This file turns the current repo scan, the Cubid backgrounder, and the requested platform direction into a working plan. Sections are intended to be owned by different streams in parallel. Within each section, complete todos in order because later items assume the previous item is finished or at least stabilized behind an agreed interface.

## A. Monorepo Foundation

Parallelization note: This section should start first. Once `A01` defines workspace boundaries and shared package contracts, sections `B` through `E` can proceed in parallel.

### A01. Define the target monorepo operating model

- Status: Completed
- Timestamp started: 2026-04-15T13:30:46-0400
- Timestamp completed: 2026-04-15T13:37:32-0400
- Feature branch: codex/repo-cleanup-roadmap
- Head: 9260661
- Session-log reference(s): session: v2, session: v3

Write and ratify the monorepo architecture decision record before moving files. Decide the workspace toolchain, package manager, task runner, shared TypeScript strategy, CI graph, and release model. The output should define top-level folders such as `apps/`, `packages/`, `services/`, `tooling/`, and `docs/`, plus naming conventions for shared libraries. Include how `cubid-passport`, `cubid-admin`, the future OIDC service, shared UI, shared auth, and shared domain packages will interact. Capture server-only versus client-safe package rules, environment variable ownership, and build/test boundaries per workspace. This todo should also define migration principles: preserve behavior first, move code second, improve internals third. Without this, the repo risks becoming a larger version of the current architectural sprawl instead of a true platform monorepo.

### A02. Migrate cubid-passport into the monorepo app structure

- Status: Completed
- Timestamp started: 2026-04-15T13:54:43-0400
- Timestamp completed: 2026-04-15T14:09:02-0400
- Feature branch: codex/a02-passport-monorepo-shell
- Head: 6b865a5
- Session-log reference(s): session: v5, session: v6

Move the current `cubid-passport` codebase into the agreed `apps/passport` workspace while keeping the app runnable throughout the migration. Create shared root configuration for TypeScript, ESLint, Prettier, environment loading, and CI tasks, then trim app-local config down to what is actually specific to Passport. Extract obvious cross-cutting assets into packages only when there is immediate reuse value, especially auth helpers, Supabase access layers, stamp registries, and common UI primitives. Update imports, scripts, and path aliases to use workspace-safe conventions instead of ad hoc relative references. The goal is not yet deep refactoring; it is to make Passport a well-bounded app inside a platform repo, with deterministic local boot, deterministic builds, and clear boundaries between application code and shared platform code.

### A03. Import cubid-admin and normalize the shared platform contracts

- Status: Completed
- Timestamp started: 2026-04-15T14:30:34-0400
- Timestamp completed: 2026-04-15T14:44:29-0400
- Feature branch: codex/a03-import-admin
- Head: 6b29457
- Session-log reference(s): session: v7, session: v8, session: v9

Import the parallel `cubid-admin` repository into the monorepo as `apps/admin` as a preserve-first snapshot, archive the old standalone repo-shell metadata through engineering docs, and normalize the imported app to the shared workspace contract. Align it with the same `pnpm`, Turbo, CI, TypeScript, and environment conventions used by Passport without turning the task into a deeper Admin modernization. Extract only the first foundational shared packages that both apps can use safely now, especially shared env helpers and shared type contracts. End this todo with both apps building from the same repo, Admin booting from `pnpm dev:admin`, root validation covering the active workspaces, and the import source plus omitted-file policy documented clearly enough for later OIDC, claims, and passkey work to build on.

## B. Identity Platform and "Login with Cubid"

Parallelization note: Start after `A01`. This section can run in parallel with `C`, `D`, and `E`, but its implementation should target the monorepo contracts created in section `A`.

Implementation assessment as of 2026-04-19: Section B now has the backend relying-party loop needed for a TCOIN prototype, including `/token`, signed JWTs, `/userinfo`, `/revoke`, `/logout`, active JWKS derivation, access-token persistence, and repo-side TCOIN seeding/configuration. `B01`, `B02.1`, `B02.2`, `B02.3`, `B02.4`, `B02.5`, and `B03` are complete; `B04` has backend passkey foundations in place. Remaining Section B launch work is now narrower: apply migrations and deploy real environments, complete the Passport/Admin consent operations follow-up in `B02.5.1`, and continue the open B04 Passport passkey UI/device lifecycle slices. Do not treat Login with Cubid as broadly production-launched until the live issuer, secrets, DNS, and TCOIN relying-party configuration are verified outside the repo.

### B01. Design the OIDC and trust architecture for Login with Cubid

- Status: Completed
- Timestamp started: 2026-04-15T16:23:27-0400
- Timestamp completed: 2026-04-15T16:50:06-0400
- Feature branch: codex/b01-oidc-architecture
- Head: 7479974
- Session-log reference(s): sessions v10 & v11
- Target-state doc(s): [docs/engineering/login-with-cubid-oidc-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/login-with-cubid-oidc-architecture.md)

Produce a concrete identity architecture for "Login with Cubid" before building endpoints. Define the issuer, audience model, relying-party registration flow, consent UX, supported grant types, token lifetimes, revocation model, and how app-scoped identities will map to OIDC subjects without breaking Cubid’s anti-tracking goals. Specify which claims are standard versus Cubid-specific, including how personhood depth, verification signals, stamp-derived overlays, and selective disclosure rules are represented. Include how Admin manages client apps, scopes, redirect URIs, and identity-depth policies. The design must explicitly preserve backgrounder principles: developers are the core customer, users control disclosure, and Cubid should behave like protocol infrastructure rather than a centralized surveillance identity provider. This todo should end with a signed-off spec and implementation boundary between Admin, Passport, and the new OIDC service.

### B02. Implement the OIDC issuer service in the monorepo

- Status: Started
- Timestamp started: 2026-04-15T20:16:30-0400
- Timestamp completed: TBD
- Feature branch: codex/b02-oidc-foundation
- Head: e89af74
- Session-log reference(s): sessions v14-v16

Create a dedicated OIDC service workspace, likely `services/oidc`, rather than embedding protocol behavior inside Passport UI code. Implement discovery, authorization, token, JWKS, userinfo, client registration or client management hooks, session handling, logout behavior, and audit-ready token issuance. Back the service with shared auth and domain packages from the monorepo instead of duplicating user, stamp, or consent logic. Design it as a clean server application with strong runtime validation, typed configuration, proper key management, and explicit boundaries between public endpoints and internal administrative operations. Passport should become a relying-party and consent experience, while Admin manages issuer metadata and policies. This service becomes the durable platform center of "Login with Cubid" and should be built so other apps, SDKs, and agents can rely on it without depending on Passport internals.

### B02.1 Add the OIDC service foundation, dynamic registration, and schema

- Status: Completed
- Timestamp started: 2026-04-15T20:16:30-0400
- Timestamp completed: 2026-04-15T20:27:09-0400
- Feature branch: codex/b02-oidc-foundation
- Head: e89af74
- Session-log reference(s): session: v14

Create the first issuer workspace and contract layer without trying to finish the full protocol loop. Add `services/oidc`, the initial runtime config, Supabase service-role access, discovery metadata, JWKS response shape, dynamic client registration, registration lookup, root dev/start commands, and explicit placeholders for protocol endpoints that are not implemented yet. Extract the first shared packages needed by later slices: `@cubid/auth` for OIDC request and PKCE contracts, `@cubid/identity` for pairwise subject and consent derivation contracts, and `@cubid/claims` for supported scopes and claim metadata. Add Supabase migrations for OIDC clients, signing keys, human subjects, issuer sessions, authorization codes, refresh tokens, device codes, consents, and audit logs. This slice proves the service exists and has persistence, but it does not make Login with Cubid usable by TCOIN.

### B02.2 Add authorize, interaction challenges, and Passport handoff

- Status: Completed
- Timestamp started: 2026-04-16T00:38:44-0400
- Timestamp completed: 2026-04-16T00:38:44-0400
- Feature branch: codex/b02-oidc-foundation
- Head: c751aac
- Session-log reference(s): session: v15, session: v16

Implement the browser-facing first half of the Authorization Code + PKCE flow. `/authorize` should validate client, redirect URI, response type, scopes, state, nonce, and `S256` PKCE inputs, then persist a login or consent challenge instead of issuing tokens directly. The OIDC service should expose Passport-facing login and consent interaction endpoints so Passport can complete email or phone login, present requested scopes and claims, approve or reject consent, and hand control back to the issuer. Passport may initially reuse the existing login and allow pages, but it must branch cleanly on `login_challenge` and `consent_challenge`. This slice gets Cubid to the point where an authorization code can be issued, but it still does not let TCOIN exchange that code for tokens.

### B02.3 Finish the TCOIN Authorization Code + PKCE token loop

- Status: Started
- Timestamp started: 2026-04-19T21:43:28-0400
- Timestamp completed: 2026-04-19T21:46:40-0400
- Feature branch: codex/b02-relying-party-completion
- Head: 41206f4
- Session-log reference(s): session: v40, session: v41

Finish the blocking relying-party loop for a real TCOIN "Sign in with Cubid" option. Replace the explicit `501` placeholders for `/token` and `/userinfo` in `services/oidc/src/app.ts` with production-grade behavior. `/token` must accept an authorization code plus PKCE verifier, enforce one-time code use, validate the original client and redirect URI, verify `S256`, and return signed ID and access tokens. JWT signing must use real issuer keys, include a `kid`, expose the active public key through `/jwks`, and produce a stable pairwise `sub` for the TCOIN client without leaking Cubid user IDs or cross-app identifiers. `/userinfo` must validate access tokens and return at least `sub`, with `email`, `email_verified`, `name`, or profile claims when allowed by `openid email profile` consent.

### B02.4 Prepare and configure a TCOIN-ready issuer environment

- Status: Started
- Timestamp started: 2026-04-19T21:43:28-0400
- Timestamp completed: 2026-04-19T21:46:40-0400
- Feature branch: codex/b02-relying-party-completion
- Head: 41206f4
- Session-log reference(s): session: v40, session: v41

Make the issuer repo-ready for use outside local development without performing live infrastructure deployment in this todo. Document the stable production issuer target such as `https://id.cubid.me`, the staging issuer target, required runtime secrets, key-rotation expectations, migration checklist, and health checks. Ensure `/.well-known/openid-configuration` advertises only endpoint and grant behavior that works in the repo. Add an idempotent TCOIN client seed path with exact redirect URI configuration supplied by environment variables for local development, preview, staging, and production. Configure TCOIN's first-pass consent policy narrowly around `openid email profile`, leaving `cubid:stamps` and `cubid:verification` for later trust and off-ramp features. Actual hosting, DNS, secret provisioning, and Supabase migration execution remain deployment work outside this repo-only slice.

### B02.5 Add production issuer controls, revocation, and observability

- Status: Started
- Timestamp started: 2026-04-19T21:43:28-0400
- Timestamp completed: 2026-04-19T21:46:40-0400
- Feature branch: codex/b02-relying-party-completion
- Head: 41206f4
- Session-log reference(s): session: v40, session: v41

Add the issuer-side production controls that should exist before broad rollout even if the local prototype works. Implement `/logout` so TCOIN can offer a clean Cubid sign-out experience or at least avoid confusing partial logout behavior. Implement `/revoke` for access tokens now and keep refresh-token issuance disabled for public web clients until a later refresh-token rotation slice. Add rate limits on `/authorize`, `/token`, `/userinfo`, login challenge completion, and passkey challenge endpoints. Add audit events for token issuance failures, token issuance success, userinfo responses, revocation, logout, and rate-limit denials. Expand issuer health output so operators can verify issuer identity and JWKS availability. Keep richer Passport and Admin operations surfaces in `B02.5.1`.

### B02.5.1 Add Passport consent revocation and Admin issuer operations views

- Status: Completed
- Timestamp started: 2026-04-20T13:43:19-0400
- Timestamp completed: 2026-04-20T13:52:22-0400
- Feature branch: codex/b02-5-1-oidc-ops
- Head: 230a203
- Session-log reference(s): session: v51

Build the user-facing and operator-facing surfaces that sit on top of the issuer controls added in `B02.5`. Passport should let authenticated users review active OIDC consents by client, scope, claim set, grant time, and policy version, then revoke a consent without exposing raw human subject keys or Cubid user IDs to browser state. Admin should expose richer visibility for TCOIN and other OIDC clients: redirect URIs, allowed scopes, claim policy, client status, rate-limit tier, recent audit events, token/userinfo failure counts, and suspension controls. This follow-up must use authenticated server routes rather than the existing generic Supabase proxy helpers, because consent revocation and client operations are security-sensitive account-management actions.

### B03. Build the custom claim registry and identity-depth policy controls in cubid-admin

- Status: Completed
- Timestamp started: 2026-04-16T00:54:08-0400
- Timestamp completed: 2026-04-16T08:41:42-04:00
- Feature branch: codex/b03-claims-registry
- Head: ffe1ad2
- Session-log reference(s): session: v17, session: v18, session: v19, session: v20, session: v21, session: v22

Extend `cubid-admin` so it becomes the control plane for Cubid-specific claims and relying-party policy. Implement a claim registry where Admin users can define which claims exist, how they are computed, which are globally available versus partner-specific, and which require explicit consent. Add management for identity-depth rules, such as thresholds or derived assertions based on stamps, scores, or review workflows. The admin UI should let operators connect claims to client apps, scopes, token templates, and webhook behavior without hardcoding policy inside Passport or the OIDC service. Treat claim evaluation as a shared server capability, not just an admin screen feature, so the OIDC service can resolve claims from a typed backend contract. This todo should end with a usable policy console that governs Cubid identity semantics centrally.

### B03.1 Add claim registry schema and shared policy contracts

- Status: Completed
- Timestamp started: 2026-04-16T00:54:08-0400
- Timestamp completed: 2026-04-16T00:57:36-0400
- Feature branch: codex/b03-claims-registry
- Head: 47352af
- Session-log reference(s): session: v17, session: v18

Implement the first registry-first B03 slice by extending the Supabase schema for claim definitions, identity-depth policies, and client bindings, then add the typed shared contracts needed by Admin and later issuer reads. This slice should not yet build Admin APIs or UI. It should leave the repo with a durable persistence shape and shared package surface that the next B03 slices can consume directly.

### B03.2 Add Admin APIs for claims, policies, and client bindings

- Status: Completed
- Timestamp started: 2026-04-16T08:33:45-04:00
- Timestamp completed: 2026-04-16T08:34:52-04:00
- Feature branch: codex/b03-claims-registry
- Head: b66a8ba
- Session-log reference(s): session: v19, session: v20

Add authenticated Admin routes and server-side repositories for claim definitions, threshold-based identity-depth policies, and client claim-policy bindings. Reuse the current Admin request-context and error-handling patterns instead of introducing a new server framework.

### B03.3 Add Admin UI for registry, policies, and bindings

- Status: Completed
- Timestamp started: 2026-04-16T08:40:18-04:00
- Timestamp completed: 2026-04-16T08:41:42-04:00
- Feature branch: codex/b03-claims-registry
- Head: ffe1ad2
- Session-log reference(s): session: v21, session: v22

Extend the existing Admin tab shell with a claims and policies area that lets operators create or edit claims, create or edit threshold-based identity-depth policies, and bind those records to existing OIDC clients. This slice should make the control plane usable without yet changing OIDC token issuance behavior.

### B04. Add passkey support to Login with Cubid

- Status: Started
- Timestamp started: 2026-04-16T09:09:36-04:00
- Timestamp completed: TBD
- Feature branch: codex/b04-passkeys-core
- Head: 1a36f1f
- Session-log reference(s): session: v23, session: v24, session: v25, session: v26

Implement WebAuthn-based passkeys as a first-class authentication method for "Login with Cubid" rather than another side flow bolted onto the app. Support registration, authentication, recovery fallback strategy, device lifecycle management, and risk-aware step-up behavior for sensitive admin actions. Passport should expose a clean user experience for creating and using passkeys, while the shared auth service owns the credential ceremonies, challenge generation, attestation policy, and credential storage. Admin should be able to see passkey status and policy constraints for debugging and support. Make sure passkeys work with app-scoped identity rules and with the OIDC session model so they are a durable platform credential, not a one-off browser convenience. This todo should explicitly include rollout sequencing and migration paths from email or phone-based login.

### B04.1 Add WebAuthn schema and shared auth contracts

- Status: Completed
- Timestamp started: 2026-04-16T09:09:36-04:00
- Timestamp completed: 2026-04-16T09:14:45-04:00
- Feature branch: codex/b04-passkeys-core
- Head: 83587e9
- Session-log reference(s): session: v23, session: v24

Lay down the first B04 slice by adding Supabase persistence for WebAuthn credentials and single-use challenges, then extend the shared auth package with the typed ceremony and session contracts that both Passport and the OIDC service will consume.

### B04.2 Add OIDC passkey ceremony backend

- Status: Completed
- Timestamp started: 2026-04-16T09:34:26-0400
- Timestamp completed: 2026-04-16T09:37:16-0400
- Feature branch: codex/b04-passkeys-core
- Head: 1a36f1f
- Session-log reference(s): session: v25, session: v26

Add OIDC-service-owned endpoints and repositories for passkey registration and authentication challenges, challenge consumption, credential verification, and login-challenge completion using passkey authentication methods.

### B04.3 Add Passport passkey UX and OTP recovery

- Status: Completed
- Timestamp started: 2026-04-20T16:12:17-0400
- Timestamp completed: 2026-04-20T17:17:41-0400
- Feature branch: codex/b04-3-passkey-ux-otp-recovery
- Head: ca28575
- Session-log reference(s): session: v53, session: v57, session: v58

Refactor Passport login so returning users can sign in with a passkey, verified users can register passkeys, and OTP bootstrap or recovery remains available without relying on localStorage as the hidden source of truth.

### B04.4 Add device lifecycle and step-up follow-ups

- Status: Completed
- Timestamp started: 2026-04-21T03:20:33-0400
- Timestamp completed: 2026-04-21T03:33:11-0400
- Feature branch: codex/b04-4-passkey-lifecycle-stepup
- Head: TBD
- Session-log reference(s): session: v59

Build the deferred follow-up capabilities for richer credential lifecycle management, device naming or revocation, and risk-aware step-up or ACR-driven passkey requirements after the core passkey delivery is stable.

## C. Security Hardening and Operational Safety

Parallelization note: This section can begin immediately after `A01` and should be treated as a blocker for any external launch of OIDC or passkeys.

### C01. Remove secrets from source, rotate credentials, and enforce server-only configuration

- Status: Completed
- Timestamp started: 2026-04-15T19:50:31-0400
- Timestamp completed: 2026-04-15T19:51:37-0400
- Feature branch: codex/c01-local-env-and-supabase
- Head: e68bc6a
- Session-log reference(s): session: v12, session: v13

Perform a full secrets incident response sweep, not just a cleanup patch. Inventory hardcoded credentials, leaked service keys, third-party API secrets, and any previously committed private material across Passport and the imported Admin app. Move everything to typed environment configuration with separate scopes for browser-safe values, server-only values, and operator-only values. Add runtime guards so privileged services fail closed when required secrets are missing. Rotate Supabase keys, third-party API keys, webhook secrets, NEAR signing keys, and any other exposed credentials rather than assuming deletion from git is sufficient. Create a shared configuration package in the monorepo that makes insecure patterns harder to reintroduce. Finish by documenting ownership, rotation cadence, and emergency replacement steps so the platform can be operated safely over time.

### C02. Replace generic Supabase CRUD endpoints with typed domain services

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Remove the current pattern of exposing arbitrary table access through generic API wrappers. Replace it with explicit service functions and route handlers for concrete use cases such as user lookup, stamp creation, permission grants, score retrieval, client registration, and consent reads. Every service boundary should validate input, constrain output shape, and apply authorization rules based on actor type and app ownership. Introduce shared repository or service modules for `users`, `stamps`, `dapp_users`, permissions, claims, sessions, and clients so both Passport and Admin stop reaching directly into tables with ad hoc selectors. This will improve security, make code easier to reason about, and prepare the codebase for monorepo-wide testing. The success condition is that direct arbitrary CRUD by table name disappears from the public API surface.

### C03. Add consistent validation, authorization, rate limits, and CORS policy

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Introduce a shared API security baseline for all public-facing endpoints across Passport, Admin, and the new OIDC service. Add request validation with a single library, structured authorization checks for user, dapp, and admin actors, route-level rate limiting for authentication and verification flows, and explicit CORS allowlists instead of `origin: "*"`. Use this todo to standardize error envelopes, request IDs, audit logs, and abuse monitoring so security controls are visible and operable. Prioritize OTP, email verification, user creation, score lookup, claim issuance, token issuance, and webhook endpoints because they are the most attractive abuse surfaces. The objective is to move from route-by-route improvisation to a shared security contract enforced across the monorepo. This work should ship with automated tests for failure paths, not just happy-path validation.

### C04. Redesign custody for generated wallets, private keys, and sensitive disclosures

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Audit and redesign every feature that stores, returns, or displays sensitive key material. Today the platform generates EVM wallets, interacts with NEAR account creation, and exposes private-key-like artifacts in user-facing flows. Decide which custody model Cubid actually wants: no custody, encrypted custody, or delegated custody with explicit export controls. If Cubid must hold keys, store them encrypted at rest with clear key hierarchy, access policy, and logging, and never treat them as ordinary application data. If Cubid should not hold them, remove storage and restructure flows to keep keys user-controlled from creation onward. Align this work with backgrounder principles around user control and data minimization. The end result should be a documented, auditable custody posture that eliminates ambiguous or casually unsafe key handling across apps.

## D. Shared Domain and Application Refactor

Parallelization note: This section can run in parallel with `B`, `C`, and `E` after `A02` starts, because it mostly defines reusable internals that other workstreams will consume.

### D01. Create shared domain packages for identity, stamps, permissions, and claims

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Extract the core Cubid concepts into shared packages with stable interfaces: identity subjects, app-scoped users, stamps, stamp permissions, scores, claims, consents, and client apps. Move duplicated constants like stamp registries and shared hashing or derivation logic into these packages so both Passport and Admin depend on one canonical implementation. Each package should separate pure domain logic from persistence adapters, making it possible to test business rules without booting the full app stack. This is also the right place to define event payload contracts, claim shapes, subject identifiers, and shared types used by the OIDC service. Do not over-abstract everything at once; focus on the concepts already duplicated or clearly central to platform behavior. The outcome should be fewer magic numbers, fewer duplicate mappings, and more trustworthy reuse across the monorepo.

### D02. Refactor Passport and Admin into feature modules with thin UI shells

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Break apart the giant orchestration components and page files into feature modules that own one domain slice at a time. In Passport, that means separate modules for authentication, allow flows, stamp providers, wallet flows, profile, and on-chain minting. In Admin, it should mean separate modules for client management, claim registry, user review, app integrations, and operational tooling. Each feature should contain its UI, form state, route loaders, and server interaction layer, while shared components remain presentation-focused. As part of this, reduce `localStorage` dependence for security-sensitive flow state and replace it with signed server state, typed query contracts, or dedicated session storage where appropriate. This todo is about maintainability as much as security: thinner shells make OIDC, passkeys, and policy work much easier to implement correctly.

## E. Protocol Product Surface from the Cubid Backgrounder

Parallelization note: This section can run in parallel with `B`, `C`, and `D` once the shared package direction from `A01` is established.

### E01. Rebuild app-scoped identity and selective disclosure as first-class platform services

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Take the backgrounder’s core ideas seriously by making app-scoped identity and selective disclosure explicit platform capabilities instead of incidental behavior buried in Passport flows. Build a consent and disclosure service that owns per-app subject identifiers, claim release decisions, stamp-sharing permissions, and revocation behavior. Relying parties should never need raw cross-app identifiers or unnecessary PII; they should request scopes and receive only the allowed app-scoped values. This service should back the Allow Page, the OIDC consent model, SDK calls, and webhook payload filtering. Treat it as a foundational protocol service with strong typing, auditability, and user-visible history, not just a UX screen. Finishing this todo would align Cubid much more closely with the backgrounder’s privacy, protocol, and anti-tracking principles.

### E02. Productize the developer platform: REST API v2, React SDK, and webhook contracts

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Turn the current mixed bag of legacy routes into a coherent developer platform. Define the canonical REST API v2 surface for app onboarding, user creation, score lookup, identity queries, consent status, claim retrieval, and webhook registration. Build a first-party React SDK on top of those stable contracts so integrators stop depending on internal UI code or undocumented route behavior. Standardize webhook events around meaningful protocol events such as consent granted, claim updated, score changed, stamp blacklisted, and subject revoked, with signed payloads and replay protection. This todo should also add clear versioning and deprecation rules so Cubid can evolve without breaking partner apps. The goal is adoption: developers should experience Cubid as a clean trust platform, not as a fragile app they need to reverse engineer.

### E03. Add agent and organization identity support, including MCP-compatible interfaces

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Expand the platform beyond human passports in a way that matches the backgrounder without diluting the human proof-of-personhood core. Define how non-human actors such as agents and organizations are represented, authenticated, disclosed, and clearly labeled so they never masquerade as human identities. Build this into the shared identity domain model, the OIDC subject model where appropriate, and the developer API contracts. Add MCP-compatible integration surfaces so agent systems can query Cubid trust signals and identify themselves through supported protocols. The implementation should preserve app-scoped identity, consent boundaries, and data minimization, while making explicit which signals are human-only, agent-only, or organization-only. This todo gives Cubid a broader protocol footprint while staying honest about what personhood and trust mean in different actor classes.

### E04. Improve global onboarding, accessibility, and low-friction trust progression

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Translate the backgrounder’s product constraints into concrete engineering work. Redesign onboarding and verification journeys so they remain accessible, globally usable, and low-friction for users with limited documentation, limited bandwidth, or limited digital literacy. Establish an accessibility bar of WCAG 2.1 AA across Passport and Admin, including keyboard support, semantic structure, announcement behavior, color contrast, and readable step flows. Replace hard assumptions about phone, email, or wallet availability with progressive trust accumulation so users can start with minimal identity signals and deepen later. This work should include telemetry that measures abandonment at each step without capturing unnecessary personal data. The outcome should be a trust platform that grows identity depth without turning into a heavy KYC product, which is central to the Cubid mission.
