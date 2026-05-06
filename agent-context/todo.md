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

Implementation assessment as of 2026-04-30: Section B has the repo-side Login with Cubid implementation slices completed, including the OIDC relying-party loop, issuer controls, Passport/Admin consent operations, claim-policy controls, and passkey UX/device lifecycle work. Remaining Section B launch work is operational rather than roadmap-build metadata: apply migrations, provision secrets, deploy stable issuer environments, configure DNS, and verify TCOIN relying-party settings outside the repo. Do not treat Login with Cubid as broadly production-launched until the live issuer, secrets, DNS, and relying-party configuration are verified in the target environments.

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

- Status: Completed
- Timestamp started: 2026-04-15T20:16:30-0400
- Timestamp completed: 2026-04-20T13:52:22-0400
- Feature branch: codex/b02-5-1-oidc-ops
- Head: 230a203
- Session-log reference(s): sessions v14-v16, session: v40, session: v41, session: v51

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

- Status: Completed
- Timestamp started: 2026-04-19T21:43:28-0400
- Timestamp completed: 2026-04-19T21:46:40-0400
- Feature branch: codex/b02-relying-party-completion
- Head: 41206f4
- Session-log reference(s): session: v40, session: v41

Finish the blocking relying-party loop for a real TCOIN "Sign in with Cubid" option. Replace the explicit `501` placeholders for `/token` and `/userinfo` in `services/oidc/src/app.ts` with production-grade behavior. `/token` must accept an authorization code plus PKCE verifier, enforce one-time code use, validate the original client and redirect URI, verify `S256`, and return signed ID and access tokens. JWT signing must use real issuer keys, include a `kid`, expose the active public key through `/jwks`, and produce a stable pairwise `sub` for the TCOIN client without leaking Cubid user IDs or cross-app identifiers. `/userinfo` must validate access tokens and return at least `sub`, with `email`, `email_verified`, `name`, or profile claims when allowed by `openid email profile` consent.

### B02.4 Prepare and configure a TCOIN-ready issuer environment

- Status: Completed
- Timestamp started: 2026-04-19T21:43:28-0400
- Timestamp completed: 2026-04-19T21:46:40-0400
- Feature branch: codex/b02-relying-party-completion
- Head: 41206f4
- Session-log reference(s): session: v40, session: v41

Make the issuer repo-ready for use outside local development without performing live infrastructure deployment in this todo. Document the stable production issuer target such as `https://id.cubid.me`, the staging issuer target, required runtime secrets, key-rotation expectations, migration checklist, and health checks. Ensure `/.well-known/openid-configuration` advertises only endpoint and grant behavior that works in the repo. Add an idempotent TCOIN client seed path with exact redirect URI configuration supplied by environment variables for local development, preview, staging, and production. Configure TCOIN's first-pass consent policy narrowly around `openid email profile`, leaving `cubid:stamps` and `cubid:verification` for later trust and off-ramp features. Actual hosting, DNS, secret provisioning, and Supabase migration execution remain deployment work outside this repo-only slice.

### B02.5 Add production issuer controls, revocation, and observability

- Status: Completed
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

- Status: Completed
- Timestamp started: 2026-04-16T09:09:36-04:00
- Timestamp completed: 2026-04-21T03:33:11-0400
- Feature branch: codex/b04-4-passkey-lifecycle-stepup
- Head: 94068c1
- Session-log reference(s): session: v23, session: v24, session: v25, session: v26, session: v53, session: v57, session: v58, session: v59, session: v60

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
- Head: 94068c1
- Session-log reference(s): session: v59, session: v60

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

- Status: Superseded by C03.4/C03.5
- Timestamp started: 2026-04-26T21:45:17-0400
- Timestamp completed: 2026-04-30T23:33:11Z
- Feature branch: codex/c03-api-security-baseline
- Head: 3ef1410
- Session-log reference(s): session: v71, session: v72, session: v136

Superseded on 2026-04-30: the C03.4 and C03.5 security-baseline work replaced first-party `/api/supabase/*` usage with typed Passport-owned routes under `/api/passport/data/*`, hard-disabled the legacy generic CRUD endpoints with `410 endpoint_removed` responses, and added Passport tests covering the disabled behavior. This todo remains as historical context for why arbitrary table-oriented CRUD is no longer an acceptable public API pattern. Any remaining direct Supabase access should be handled as ordinary server-side repository/module cleanup under future feature-specific todos, not as a live public CRUD replacement task.

Remove the current pattern of exposing arbitrary table access through generic API wrappers. Replace it with explicit service functions and route handlers for concrete use cases such as user lookup, stamp creation, permission grants, score retrieval, client registration, and consent reads. Every service boundary should validate input, constrain output shape, and apply authorization rules based on actor type and app ownership. Introduce shared repository or service modules for `users`, `stamps`, `dapp_users`, permissions, claims, sessions, and clients so both Passport and Admin stop reaching directly into tables with ad hoc selectors. This will improve security, make code easier to reason about, and prepare the codebase for monorepo-wide testing. The success condition is that direct arbitrary CRUD by table name disappears from the public API surface.

### C03. Add consistent validation, authorization, rate limits, and CORS policy

- Status: Completed
- Timestamp started: 2026-04-26T17:52:11-0400
- Timestamp completed: 2026-04-27T09:59:57-0400
- Feature branch: codex/c03-api-security-baseline
- Head: be70126
- Session-log reference(s): session: v63, session: v64, session: v65, session: v66, session: v67, session: v69, session: v70, session: v71, session: v72
- Target-state doc(s): [docs/engineering/api-security-baseline.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/api-security-baseline.md)

Introduce a shared API security baseline for all public-facing endpoints across Passport, Admin, and the new OIDC service. Add request validation with a single library, structured authorization checks for user, dapp, and admin actors, route-level rate limiting for authentication and verification flows, and explicit CORS allowlists instead of `origin: "*"`. Use this todo to standardize error envelopes, request IDs, audit logs, and abuse monitoring so security controls are visible and operable. Prioritize OTP, email verification, user creation, score lookup, claim issuance, token issuance, and webhook endpoints because they are the most attractive abuse surfaces. The objective is to move from route-by-route improvisation to a shared security contract enforced across the monorepo. This work should ship with automated tests for failure paths, not just happy-path validation.

### C03.1 Define the shared API security contract

- Status: Completed
- Timestamp started: 2026-04-26T17:52:11-0400
- Timestamp completed: 2026-04-26T17:53:38-0400
- Feature branch: codex/c03-api-security-baseline
- Head: 7519f0f
- Session-log reference(s): session: v63, session: v64
- Target-state doc(s): [docs/engineering/api-security-baseline.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/api-security-baseline.md)

Write the decision-complete target-state contract for Cubid API security before changing route code at scale. Define the shared request lifecycle, request ID rules, error-envelope rules, CORS ownership, actor types, validation library, and rate-limit model that Passport, Admin, and OIDC must all adopt. Be explicit about which legacy wire contracts may change, which OIDC contracts must remain RFC-compliant, which routes are public versus internal-only, and where shared primitives will live in the monorepo. This slice should also lock the required environment variables, event logging fields, and adoption order across route families so later implementation work does not fork into competing patterns. The output is the new target-state engineering doc plus roadmap updates that sequence the remaining C03 work.

### C03.2 Adopt the shared baseline in OIDC

- Status: Completed
- Timestamp started: 2026-04-26T18:03:27-0400
- Timestamp completed: 2026-04-26T18:27:42-0400
- Feature branch: codex/c03-api-security-baseline
- Head: d7a1afd
- Session-log reference(s): session: v65, session: v67

Refit `services/oidc` onto the shared API security baseline without breaking OIDC protocol semantics. Keep the issuer’s RFC and OIDC wire formats stable, but make request IDs universal, align error plumbing to the shared helper layer, and move its current rate limiting, validation, and CORS behavior behind shared `@cubid/auth` server-side primitives. Browser-driven login, consent, and passkey flows should receive explicit origin allowlists, while discovery and token-facing endpoints stay spec-driven rather than browser-open APIs. Use this slice to prove the shared security contract works on a non-Next runtime and to lock how OIDC-specific audit logging coexists with the generic baseline. End with OIDC tests covering unchanged protocol errors, request ID propagation, and rate-limit denial behavior.

### C03.3 Adopt the shared baseline in Admin

- Status: Completed
- Timestamp started: 2026-04-26T18:27:09-0400
- Timestamp completed: 2026-04-26T18:27:42-0400
- Feature branch: codex/c03-api-security-baseline
- Head: c2e078b
- Session-log reference(s): session: v66, session: v67

Apply the shared API baseline to every `apps/admin/pages/api/admin/*` route so Admin stops relying on thin one-off method guards and ad hoc Firebase verification. Introduce shared request-context, validation, and authorization helpers for admin actors, require request IDs on every response, and enforce an explicit Admin CORS allowlist rather than assuming the browser shell is always the caller. Normalize mutation and read routes onto the same structured error contract, then add DB-backed rate limiting for sensitive control-plane operations such as API-key rotation, webhook management, OIDC client operations, and claims or policy mutation. The success condition is that every Admin route consumes the same security primitives, rejects malformed bodies consistently, and logs abuse-relevant denials with enough context for operator debugging and later incident review.

### C03.4 Normalize and harden Passport public APIs

- Status: Completed
- Timestamp started: 2026-04-27T14:37:00-0400
- Timestamp completed: 2026-04-27T17:12:00-0400
- Feature branch: codex/c03-api-security-baseline
- Head: 91214ce
- Session-log reference(s): session: v69, session: v70

Bring the sprawling Passport API surface under the shared security baseline, including `/api/oidc/*`, `/api/dapp/*`, `/api/v2/*`, `/api/verify/*`, `/api/allow/*`, `/api/wallet/*`, `/api/cubid-webhook/*`, cron-style routes, and the current first-party data access layer. Remove wildcard CORS, add structured validation for body, query, and header inputs, and replace route-by-route authorization with shared `user`, `dapp`, and `internal` actor guards. Internal job endpoints should reject browser CORS entirely and require a server-to-server bearer token. Replace the generic `/api/supabase/*` CRUD surface with a smaller Passport-owned data API for the production app use cases, then hard-disable the old arbitrary table endpoints. End with focused tests around OTP, dapp identity, webhook, and arbitrary CRUD abuse paths.

### C03.5 Close with tests, CI, and observability updates

- Status: Completed
- Timestamp started: 2026-04-27T09:47:34-0400
- Timestamp completed: 2026-04-27T09:59:57-0400
- Feature branch: codex/c03-api-security-baseline
- Head: be70126
- Session-log reference(s): session: v71, session: v72

Finish C03 by validating the shared baseline as a platform-wide contract rather than a set of local refactors. Add unit tests in `@cubid/auth` for request ID handling, validation wrappers, actor guards, CORS decisions, and shared error serialization. Extend workspace test coverage so OIDC, Admin, and Passport all prove failure-path behavior, not just happy paths. Update CI expectations where needed so the route families touched by C03 are exercised in the normal monorepo validation graph. Document the new environment variables, security event fields, and monitoring expectations in long-lived engineering docs so operators know what signals now exist and how to use them. Close the parent todo only after the docs, tests, and validation story match the implemented baseline.

### C04. Hash non-retrievable secrets

- Status: Completed
- Timestamp started: 2026-04-27T14:49:01-0400
- Timestamp completed: 2026-04-27T15:04:22-0400
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: 6732c16
- Session-log reference(s): session: v74, session: v76

Replace plaintext storage for secrets that only need possession verification, not later recovery. This parent track covers credentials where Cubid should never need to reconstruct the original value after issuance or submission. The target posture is hash-at-rest with strong one-way hashing, explicit prefixes or lookup identifiers where needed, show-once issuance, safe rotation, and no leakage through API responses, Admin tables, logs, errors, or analytics. Document the difference between verification-only secrets and retrievable operational secrets so later engineers do not accidentally encrypt values that should be hashed, or hash values that must be used for outbound signing. Finish this track only after dapp API keys and email OTP codes use clear hash verification paths, existing callers are migrated, and legacy plaintext fields are either removed, ignored, or retained only behind a documented migration window.

### C04.1 Hash dapp API keys

- Status: Completed
- Timestamp started: 2026-04-27T14:49:01-0400
- Timestamp completed: 2026-04-27T14:53:23-0400
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: 43e63f8
- Session-log reference(s): session: v74
- Target-state doc: [docs/engineering/dapp-api-key-hardening.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/dapp-api-key-hardening.md)

Migrate dapp API keys from plaintext `dapps.apikey` lookup to a verification-only model. Generate new keys with a non-secret prefix for lookup and a high-entropy secret body shown only once on create or rotate. Store only the prefix, hash, hash algorithm, version, creation timestamp, and last-rotated metadata needed for operations. Update Passport dapp actor authentication, Admin app creation, Admin key rotation, and any displayed app tables so operators can identify a key without copying a recoverable secret from the database. Preserve a safe migration path for existing plaintext keys: either accept them temporarily through a legacy verifier while writing hashed replacements, or force rotation with clear Admin messaging. Add tests proving plaintext keys are not returned after creation/rotation, invalid keys fail consistently, and existing dapp-facing routes still authenticate through the shared Passport baseline.

### C04.1.1 Remove legacy `dapps.apikey` after production smoke

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Physically remove the legacy `dapps.apikey` column only after the C04.1 migration and app changes have been deployed and production smoke confirms that existing Cubid dapps authenticate through `dapp_api_keys`. This follow-up should query or otherwise verify that every active dapp has exactly one active hashed key row, that Passport dapp-auth logs show successful new-table verification, and that Admin create/rotate/list no longer reads or returns plaintext keys. Once confirmed, add a migration that drops the old unique constraint and column, remove any remaining compatibility types or seed data references, and update engineering docs to state that dapp API keys are permanently non-retrievable. This is intentionally separate from C04.1 so deployment validation can happen before destructive schema cleanup.

### C04.2 Hash email OTP codes

- Status: Completed
- Timestamp started: 2026-04-27T15:01:11-0400
- Timestamp completed: 2026-04-27T15:04:22-0400
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: 6732c16
- Session-log reference(s): session: v76

Move email OTP storage from plaintext `email_otp.otp` values to short-lived hash verification. Generate OTP codes as before for user delivery, but store only a keyed hash or slow hash plus expiration, attempt count, consumed timestamp, request metadata, and any rate-limit correlation needed for abuse triage. Verification should compare against the stored hash, reject expired or consumed codes, increment failed attempts, and delete or mark the code consumed after success so replay is not possible. Keep Twilio Verify phone OTP out of this database migration because the provider already owns that challenge state. Update tests for send, verify, expired, replayed, malformed, and over-attempted OTP flows, and document the retry-safe behavior so downstream apps understand which failures can be retried without generating confusing duplicate challenges.

### C05. Envelope-encrypt retrievable secrets with Supabase Vault

- Status: Completed
- Timestamp started: 2026-04-27T15:31:54-0400
- Timestamp completed: 2026-04-27T22:41:24Z
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: f3e8b02
- Session-log reference(s): session: v79, session: v81, session: v83, session: v84, session: v86, session: v87

Create the retrievable-secret custody track for values Cubid must later recover in order to perform a server-side action. Use envelope encryption with data-key secrets managed in Supabase Vault as the default implementation model. Each encrypted row should carry ciphertext, nonce or IV, authentication tag, algorithm, key identifier, key version, purpose, and enough authenticated context to prevent ciphertext swapping across tenants or users. Decryption must happen only in server-side code after explicit actor authorization, with request IDs and audit/security events for sensitive access, rotation, and failure cases. This track should produce a target-state document for encrypted database secrets, a reusable server helper, migration patterns for legacy plaintext columns, and tests proving decrypted values never appear in generic API responses, Admin lists, logs, or error envelopes.

### C05.1 Envelope-encrypt dapp user secrets

- Status: Completed
- Timestamp started: 2026-04-27T15:31:54-0400
- Timestamp completed: 2026-04-27T16:25:06-0400
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: f3e8b02
- Session-log reference(s): session: v79, session: v86, session: v87

Migrate dapp user secret custody away from plaintext storage using the C05 Supabase Vault envelope-encryption helper. Introduce `/api/v3/save_secret` as the encrypted replacement backed by `private.dapp_user_secrets`; the earlier `/api/v2/save_secret` compatibility path has since been removed by `C05.1.1` so new plaintext rows are not written to `public.dapp_user_secrets`. The v3 route must authenticate the dapp, validate that `user_id` belongs to that dapp, encrypt the submitted secret before writing the private-schema table, and store only a non-secret sentinel in the private legacy `secret` column. Provide a careful migration path that reads existing public plaintext rows and inserts encrypted private copies without logging raw values. No public decrypt endpoint should be added in this slice; decryption helpers are server-only for future explicit internal workflows.

### C05.1.1 Remove legacy dapp user secret plaintext column

- Status: Completed
- Timestamp started: 2026-05-03T21:25:01Z
- Timestamp completed: 2026-05-03T21:26:52Z
- Feature branch: codex/c05-2-1-sui-v3-custody
- Head: 99e8c4e
- Session-log reference(s): session: v155, session: v156

Permanently quarantine the legacy `public.dapp_user_secrets` plaintext table while preserving already-existing rows as service-role-only backfill/audit input. `/api/v2/save_secret` must no longer write plaintext rows and should return a clear removed-endpoint response that points callers at `/api/v3/save_secret`. The database should revoke broad public, anon, and authenticated grants, leave only the minimum `service_role` read access needed by the backfill script, and reject all new inserts, updates, or deletes against the public table. Keep physical table removal deferred until production confirms all historical rows have been backfilled into `private.dapp_user_secrets` and legacy retention/export needs are resolved.

### C05.2 Redesign blockchain private-key custody

- Status: Completed
- Timestamp started: 2026-04-27T21:59:47Z
- Timestamp completed: 2026-04-27T22:07:15Z
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: dde73b0
- Session-log reference(s): session: v83, session: v84

Remove ambiguous plaintext custody for blockchain private keys across EVM, NEAR, SUI, and legacy generated-wallet tables. Start by inventorying all `private_key` columns, wallet-generation routes, minting routes, UI disclosure paths, and server signing paths. Lock the preferred posture for user wallet keys as no-custody unless an explicit product requirement proves otherwise: Cubid should store public addresses, stamp metadata, and transaction references, not exportable user private keys. For any remaining operational signing keys or unavoidable retrievable private keys, require C05 envelope encryption, server-only access, and audit events. Add migrations that quarantine or null legacy plaintext fields where safe, update generated-wallet routes so they no longer insert recoverable private keys as ordinary data, and add regression checks preventing “private key” export copy from returning to Profile or wallet flows.

### C05.2.1 Add Sui support to v3 blockchain account custody

- Status: Completed
- Timestamp started: 2026-05-03T21:18:25Z
- Timestamp completed: 2026-05-03T21:21:07Z
- Feature branch: codex/c05-2-1-sui-v3-custody
- Head: 07417d1
- Session-log reference(s): session: v153, session: v154

Add Sui to the v3 blockchain account custody surface after selecting and validating the repo-supported Sui SDK. Extend `public.ref_chains` with Sui metadata, add the Sui keypair generator, normalize Sui public-address handling, and add route/helper tests proving `/api/v3/accounts/generate` and `/api/v3/accounts/list` work without returning private-key material. Keep the same C05 Vault envelope-encryption model and `private.private_keys` storage contract used for EVM, NEAR, and Solana. This follow-up should not alter legacy v2 wallet APIs; it should only expand the v3 route surface once the Sui dependency and address format are intentionally locked.

### C05.3 Envelope-encrypt webhook signing secrets

- Status: Completed
- Timestamp started: 2026-04-27T16:43:32-0400
- Timestamp completed: 2026-04-27T16:55:20-0400
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: 89ae627
- Session-log reference(s): session: v81

Move webhook signing secrets into the retrievable-secret track because Passport must recover the raw secret to HMAC-sign outbound webhook payloads. Replace plaintext `dapp_webhook_subscriptions.secret` storage with Supabase Vault envelope-encrypted ciphertext and metadata. Admin should return the generated secret only during create or rotate flows, then display a redacted identifier, creation time, rotation time, and status in list and detail views. Passport webhook delivery code should decrypt only inside the internal delivery path, bind decryption context to the dapp and webhook subscription, and audit signing failures, rotations, and suspicious access attempts without logging secret material. Preserve compatibility for existing subscriptions through a migration window or forced rotation plan, and add tests proving Admin cannot repeatedly reveal stored webhook secrets while delivery signatures still verify.

### C06. Harden env-backed operational secrets

- Status: Completed
- Timestamp started: 2026-04-27T22:47:00Z
- Timestamp completed: 2026-04-27T22:56:40Z
- Feature branch: codex/c04-c06-secrets-hardening-split
- Head: b29831b
- Session-log reference(s): session: v88

Harden runtime secrets that are already environment-backed rather than stored in application tables. This includes the OIDC signing private JWK, pairwise subject master secret, Firebase private keys, Supabase service role keys, Twilio credentials, SMTP credentials, Instagram and Fractal client secrets, NEAR issuer keys, internal Passport bearer tokens, and similar integration credentials. The goal is not to move these into user-facing storage; it is to define ownership, required environments, rotation procedures, leak response, local-development handling, and deployment checks. Update config helpers where needed so required secrets fail closed with clear messages and never appear in client-safe bundles. Add docs and smoke checks for secret presence, key rotation readiness, and safe redaction in logs. Finish with an operator runbook that separates routine rotation from incident-driven revocation.

## D. Shared Domain and Application Refactor

Parallelization note: This section can run in parallel with `B`, `C`, and `E` after `A02` starts, because it mostly defines reusable internals that other workstreams will consume.

### D01. Create shared domain packages for identity, stamps, permissions, and claims

- Status: Completed
- Timestamp started: 2026-04-30T23:09:49Z
- Timestamp completed: 2026-04-30T23:14:04Z
- Feature branch: codex/e01-app-scoped-identity-disclosure
- Head: b3d5539
- Session-log reference(s): session: v129, session: v130, session: v131

Extract the core Cubid concepts into shared packages with stable interfaces: identity subjects, app-scoped users, stamps, stamp permissions, scores, claims, consents, and client apps. Move duplicated constants like stamp registries and shared hashing or derivation logic into these packages so both Passport and Admin depend on one canonical implementation. Each package should separate pure domain logic from persistence adapters, making it possible to test business rules without booting the full app stack. This is also the right place to define event payload contracts, claim shapes, subject identifiers, and shared types used by the OIDC service. Do not over-abstract everything at once; focus on the concepts already duplicated or clearly central to platform behavior. The outcome should be fewer magic numbers, fewer duplicate mappings, and more trustworthy reuse across the monorepo.

### D02. Refactor Passport and Admin into feature modules with thin UI shells

- Status: Completed
- Timestamp started: 2026-04-30T23:29:43Z
- Timestamp completed: 2026-04-30T23:32:30Z
- Feature branch: codex/e01-app-scoped-identity-disclosure
- Head: fedad4a
- Session-log reference(s): session: v133, session: v134, session: v135

Break apart the giant orchestration components and page files into feature modules that own one domain slice at a time. In Passport, that means separate modules for authentication, allow flows, stamp providers, wallet flows, profile, and on-chain minting. In Admin, it should mean separate modules for client management, claim registry, user review, app integrations, and operational tooling. Each feature should contain its UI, form state, route loaders, and server interaction layer, while shared components remain presentation-focused. As part of this, reduce `localStorage` dependence for security-sensitive flow state and replace it with signed server state, typed query contracts, or dedicated session storage where appropriate. This todo is about maintainability as much as security: thinner shells make OIDC, passkeys, and policy work much easier to implement correctly.

## E. Protocol Product Surface from the Cubid Backgrounder

Parallelization note: This section can run in parallel with `B`, `C`, and `D` once the shared package direction from `A01` is established.

### E01. Rebuild app-scoped identity and selective disclosure as first-class platform services

- Status: Completed
- Timestamp started: 2026-04-30T21:38:40Z
- Timestamp completed: 2026-05-03T13:44:24Z
- Feature branch: codex/e01-app-scoped-identity-disclosure; codex/e01-disclosure-claim-taxonomy; codex/e01-closeout-reconciliation
- Head: 87013e2
- Session-log reference(s): session: v126, session: v127, session: v137, session: v138, session: v140, session: v141, session: v149

Take the backgrounder’s core ideas seriously by making app-scoped identity and selective disclosure explicit platform capabilities instead of incidental behavior buried in Passport flows. Build a consent and disclosure service that owns per-app subject identifiers, claim release decisions, stamp-sharing permissions, and revocation behavior. Relying parties should never need raw cross-app identifiers or unnecessary PII; they should request scopes and receive only the allowed app-scoped values. This service should back the Allow Page, the OIDC consent model, SDK calls, and webhook payload filtering. Treat it as a foundational protocol service with strong typing, auditability, and user-visible history, not just a UX screen. Finishing this todo would align Cubid much more closely with the backgrounder’s privacy, protocol, and anti-tracking principles.

### E01.1 Backfill disclosure grants and retire legacy stamp-permission fallback

- Status: Completed
- Timestamp started: 2026-05-03T13:49:32Z
- Timestamp completed: 2026-05-03T13:54:17Z
- Feature branch: codex/e01-closeout-reconciliation
- Head: d483ab1
- Session-log reference(s): session: v150

Complete the production rollout tail for app-scoped disclosure by backfilling legacy `stamp_dappuser_permissions` rows into `selective_disclosure_grants`, validating that active relying-party access is represented in the new grant table, and then removing the temporary compatibility fallback from SDK-facing identity, score, and webhook paths. This should be treated as a deployment-safe migration task, not a product redesign. Add a dry-run script or SQL report that counts legacy permissions by dapp, dapp user, and stamp type; write encrypted or private data nowhere; and confirm revocation semantics still remove access after the fallback is disabled. Once production smoke passes, update the engineering doc and tests so the selective-disclosure contract is the only authorization source for new app-facing stamp release.

### E01.2 Promote disclosure-grant operations into Admin/Ops visibility

- Status: Completed
- Timestamp started: 2026-05-03T17:15:29Z
- Timestamp completed: 2026-05-03T17:20:46Z
- Feature branch: codex/e01-closeout-reconciliation
- Head: 44e6eb5
- Session-log reference(s): session: v151

Add operator visibility for app-scoped subjects and selective-disclosure grants without exposing raw internal identifiers or secret material. Admin should be able to inspect aggregate grant counts, recent grant/revoke events, source split between Allow Page and OIDC, revoked versus active grants, and dapp/client-level disclosure health. Keep controls conservative: read-only observability first, with any operator-driven revocation or repair flow requiring a separate authorization design. This follow-up helps support production rollout and debugging after E01, especially when an integrator reports missing identity, stamp, score, location, or webhook data. It should reuse existing security-event and audit patterns, redact human subject keys and raw Cubid user IDs, and document how operators trace a user-facing revocation from Profile to route filtering and webhook suppression.

### E02. Productize the developer platform: API v3 contracts, review, and hardening

- Status: Completed
- Timestamp started: 2026-04-28T08:28:44Z
- Timestamp completed: 2026-05-03T00:43:54Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository for SDK work; codex/e01-disclosure-claim-taxonomy for backend API v3 review
- Head: see Cubid-Me/cubid-sdk SDK repo history for SDK work; backend API v3 review completed at 5b0504b
- Session-log reference(s): session: v94, session: v95, session: v99, session: v100, session: v101, session: v102, session: v103, session: v104, session: v105, session: v106, session: v107, session: v114, session: v115, session: v116, session: v119, session: v120, session: v123, session: v142, session: v143, session: v144, session: v145, session: v146; Cubid-Me/cubid-sdk session: s01-core-adoption

Reframe E02 around the current architecture split. `cubid-passport` owns the backend runtime: API behavior, route contracts, migrations, security, disclosure enforcement, v3 custody routes, and webhook delivery. `Cubid-Me/cubid-sdk` owns public SDK/API client implementation, examples, package publication, and external integration docs. The earlier E02 SDK package work has been ingested into the public SDK repo and remains historical context here. The active backend track is now API v3 review and hardening: inventory the canonical `/api/v3/*` surfaces, document which legacy `/api/v2/*` routes remain compatibility-only, tighten auth/validation/disclosure/idempotency/error behavior, and standardize webhook contracts around signed, replay-safe, disclosure-filtered protocol events. Any SDK-impacting backend change must create a handoff note for the public SDK agents instead of adding SDK code to this repo.

### E02.1 Publish `@cubid/core` as a dual-target runtime-agnostic package

- Status: Ingested into cubid-sdk
- Timestamp started: 2026-04-28T08:28:44Z
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): session: v94, session: v95, session: v119, session: v120; Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; do not continue SDK publication work from `cubid-passport`.

Package `@cubid/core` as the required public integration foundation that works cleanly from both npm and JSR, so downstream apps can import `@cubid/core` in Next.js and `jsr:@cubid/core` in Supabase Edge or other Deno runtimes without mirrors, tarballs, or path hacks. Keep the package strictly runtime-agnostic: no React, no browser-only helpers, no Node-only assumptions, no chain SDKs, and no wagmi. All request logic should rely on `fetch`, `RequestInit`, `Headers`, and plain JSON contracts, with callers able to inject `fetch` and server-held credentials explicitly. The output of this todo is a package layout, export map, build/publish setup, and usage contract that makes Cubid’s core API client feel native in both Node and Deno environments.

### E02.1.1 Complete `@cubid/core` registry-side first release

- Status: Ingested into cubid-sdk
- Timestamp started: TBD
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; do not continue registry-side `@cubid/core` release work from `cubid-passport`.

Complete the human-owned registry setup and first official `@cubid/core` release from the canonical public SDK repo, not from `cubid-passport`. Confirm the npm `cubid` organization exists, that the right maintainers belong to the `developers` team, and that `@cubid/core` is owned by the org rather than a personal account. If npm allows trusted-publisher setup before first publication, configure GitHub Actions trusted publishing from `Cubid-Me/cubid-sdk` directly; if not, perform the one-time owner-controlled bootstrap publish from a clean SDK-repo release commit, then immediately configure trusted publishing and restrict token access. Also create/link the JSR `@cubid/core` package to `Cubid-Me/cubid-sdk`, run the SDK repo's manual publish workflow, verify npm/JSR installs, and record package URLs plus version metadata in the SDK repo.

### E02.2 Add a stable server-facing identity sync contract to `@cubid/core`

- Status: Ingested into cubid-sdk
- Timestamp started: 2026-04-29T16:07:42Z
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): session: v99, session: v100, session: v101; Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; future SDK-facing identity-sync work should continue there rather than in `cubid-passport`.

Make `@cubid/core` easier to adopt by exposing a small, typed, high-level server integration surface instead of forcing every app to compose low-level Cubid route calls by hand. The package should provide stable helpers such as `ensureUserByEmail`, `fetchIdentity`, `fetchScore`, and `fetchStamps`, plus an optional normalized identity snapshot result for systems that want one typed view of Cubid user state. As part of this, explicitly document the current “resolve or create by email” semantics so integrators know whether the operation is idempotent, what canonical user identifier is returned, what happens when the user already exists, and which failures are retry-safe. Add structured error modeling for auth/config failures, validation problems, transient upstream errors, rate limits, and identity-not-found versus not-yet-verified states.

### E02.2.1 Port the best runtime-agnostic SDK ergonomics from older SDK prototypes

- Status: Ingested into cubid-sdk
- Timestamp started: 2026-04-29T17:27:43Z
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): session: v102, session: v103, session: v104; Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; use this Passport todo as historical context only.

Use the older SDK prototype material now ingested into `Cubid-Me/cubid-sdk` as a comparison source when expanding `@cubid/core`, but do not copy it blindly. Cherry-pick the stronger developer ergonomics: normalized camelCase response models, malformed-response detection, endpoint-aware error metadata, optional custom headers if still safe, and broader low-level wrappers for `addStamp`, location, user-data, search-location, and OTP routes where those routes remain part of the supported API story. Keep the newer `@cubid/core` security posture: no plaintext OTP exposure, no framework or Node-only assumptions, no broad legacy defaults that obscure the target origin, and no chain or React dependencies. The success condition is that `@cubid/core` becomes more pleasant and safer to consume without inheriting old package naming, insecure response shapes, or deprecated route assumptions.

### E02.3 Publish `@cubid/react` and chain SDK packages with profile-completion primitives

- Status: Ingested into cubid-sdk
- Timestamp started: 2026-04-29T19:27:57Z
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): session: v114, session: v115, session: v116; Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; continue React and chain package publication work there, not from `cubid-passport`.

Turn the browser-side and ecosystem-specific integration layers into publishable packages that downstream apps can consume without local tarballs or repo-coupled wrappers. `@cubid/react` should own React hooks, components, AllowPage integration helpers, and profile-completion primitives, while chain packages such as `@cubid/evm`, `@cubid/wagmi`, `@cubid/solana`, `@cubid/cardano`, `@cubid/sui`, and `@cubid/near` isolate wallet and signing dependencies. The React flow should make inline phone capture, provider/stamp connection, and post-return refresh patterns easy without each app owning Cubid OAuth and callback complexity. Provide primitives such as a `PhoneOtpForm`, provider connect buttons or hooks, success/failure/cancel callbacks, and helpers that report available, verified, and missing recommended credentials in one normalized shape.

### E02.3.1 Adapt the older web2, React, and wallet SDK prototypes into the new package model

- Status: Ingested into cubid-sdk
- Timestamp started: 2026-04-29T19:27:57Z
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): session: v114, session: v115, session: v116; Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; keep this Passport note as prototype provenance only.

Review the SDK prototype material now ingested into `Cubid-Me/cubid-sdk` as source material for the new `@cubid/react` and chain-package ecosystem. Preserve the useful boundaries: headless AllowPage URL builders and callback-state helpers, provider stamp normalization, verified-stamp persistence callbacks, simple phone/email completion forms, provider connect buttons, and wallet adapter interfaces that keep chain-specific dependencies outside React and core. Translate them into the new target package names instead of reviving `@cubid/web2`, `@cubid/web2-react`, or `@cubid/web3`. Avoid copying bare prototype UI as final design; use the callback and adapter contracts as the valuable part. This todo should produce package-ready primitives that support downstream profile-completion flows without leaking OAuth, wallet, or chain complexity into application code.

### E02.4 Add Deno validation, integration guides, examples, and stability notes

- Status: Ingested into cubid-sdk
- Timestamp started: 2026-04-29T17:41:47Z
- Timestamp completed: 2026-04-30T14:00:53Z
- Feature branch: Cubid-Me/cubid-sdk public SDK repository
- Head: see Cubid-Me/cubid-sdk SDK repo history
- Session-log reference(s): session: v105, session: v106, session: v107; Cubid-Me/cubid-sdk session: s01-core-adoption

Ingested into `Cubid-Me/cubid-sdk` on 2026-04-30; continue Deno, publishing, and public-integration guidance there rather than from `cubid-passport`.

Back the published packages with the DX and compatibility work needed for real external adoption. Add CI that proves `@cubid/core` is importable in Deno and usable in a Supabase-Edge-like environment, including a smoke import from the JSR form and a Deno-focused validation step in the normal package workflow. Write a dedicated integration guide for Next.js plus Supabase Edge that covers browser versus server usage, secret handling, phone OTP, provider handoff flows, and the post-return refresh pattern. Add copy-paste examples for resolving a Cubid user from an authenticated email, syncing an identity snapshot in an Edge Function, rendering linked or pending credential states in React, and collecting phone plus provider stamps after signup. Close with versioned API stability notes so downstream apps understand Cubid’s compatibility guarantees and deprecation posture.

### E02.5 Inventory and define the canonical API v3 backend contract

- Status: Completed
- Timestamp started: 2026-05-03T00:05:30Z
- Timestamp completed: 2026-05-03T00:05:30Z
- Feature branch: codex/e01-disclosure-claim-taxonomy
- Head: 4c1a9ca
- Session-log reference(s): session: v143

Create the backend source of truth for Cubid API v3 in `cubid-passport`, centered on `docs/engineering/api-v3-developer-platform.md`. Inventory every current `/api/v3/*` route, including encrypted dapp user secrets and blockchain account custody, and define the minimum canonical request/response contract for each route without moving SDK implementation into this repo. Explicitly classify `/api/v2/*` routes as legacy compatibility unless a specific future todo promotes a route into v3. Record shared expectations for dapp authentication, app-scoped identity, disclosure grants, non-exposure of secret material, structured errors, and idempotency. Before writing the contract, check for incoming SDK-agent notes in `agent-context/messages-from-cubid-sdk/`; after writing it, create outbound SDK notes only if the contract changes public SDK assumptions.

### E02.6 Harden API v3 route behavior

- Status: Completed
- Timestamp started: 2026-05-03T00:23:24Z
- Timestamp completed: 2026-05-03T00:35:03Z
- Feature branch: codex/e01-disclosure-claim-taxonomy
- Head: 6dd342e
- Session-log reference(s): session: v144

Review and harden the active API v3 routes so they are production-grade backend contracts rather than one-off feature endpoints. Keep the current route family small: `/api/v3/save_secret`, `/api/v3/accounts/generate`, and `/api/v3/accounts/list` unless the E02.5 contract intentionally adds more. Ensure every v3 route uses shared Passport API security helpers, dapp API-key authentication, explicit request schemas, ownership checks against the target dapp user, disclosure-aware behavior where relevant, stable error envelopes, request IDs, and no raw secret or private-key exposure. Add or tighten tests for malformed payloads, invalid dapp credentials, cross-dapp user attempts, unsupported chains, duplicate or retry behavior, and failure cleanup. Do not modify public SDK code here; document any SDK-visible behavior changes through the SDK handoff process.

### E02.7 Standardize API v3 webhook contracts

- Status: Completed
- Timestamp started: 2026-05-03T00:40:34Z
- Timestamp completed: 2026-05-03T00:40:34Z
- Feature branch: codex/e01-disclosure-claim-taxonomy
- Head: 7f8aa93
- Session-log reference(s): session: v145

Define and harden the API v3 webhook runtime contract so downstream apps can consume Cubid events safely. Review current webhook trigger paths, signing-secret custody, disclosure filtering, retry behavior, and audit/security events, then document the canonical event families for v3: disclosure granted or revoked, stamp or claim updated, score changed, credential blacklisted, subject revoked, and custody/account lifecycle events where appropriate. Standardize signed payload fields, timestamp and nonce or event-id replay protection, delivery attempt metadata, failure recording, and redaction rules. Ensure webhook payloads never bypass app-scoped identity or disclosure grants, and ensure revoked grants stop future delivery. Add representative tests for signature generation, replay-protection inputs, disclosure-filtered payloads, failed delivery bookkeeping, and redaction of internal identifiers.

### E02.8 Coordinate public SDK impact for API v3

- Status: Completed
- Timestamp started: 2026-05-03T00:43:54Z
- Timestamp completed: 2026-05-03T00:43:54Z
- Feature branch: codex/e01-disclosure-claim-taxonomy
- Head: 5b0504b
- Session-log reference(s): session: v146

Keep the public SDK repo aligned with API v3 without reintroducing SDK implementation into `cubid-passport`. For every E02.5-E02.7 change that affects public route shape, response semantics, error categories, disclosure states, webhook payloads, examples, or migration guidance, create a concise message in `Cubid-Me/cubid-sdk` under `agent-context/messages-from-cubid-passport/`. The message should identify the backend commit or PR, describe the changed contract, say whether SDK consumers should treat it as additive, breaking, or documentation-only, and list expected SDK follow-ups. Also check `agent-context/messages-from-cubid-sdk/` in this repo before beginning each API v3 hardening slice. This todo closes when all known SDK-impact notes are created and no incoming SDK notes remain unaddressed.

### E03. Add agent and organization identity support, including MCP-compatible interfaces

- Status: Completed
- Timestamp started: 2026-04-29T17:57:47Z
- Timestamp completed: 2026-04-29T18:01:00Z
- Feature branch: codex/e03-actor-identity-model
- Head: 7437c4c
- Session-log reference(s): session: v108, session: v109, session: v110

Expand the platform beyond human passports in a way that matches the backgrounder without diluting the human proof-of-personhood core. Define how non-human actors such as agents and organizations are represented, authenticated, disclosed, and clearly labeled so they never masquerade as human identities. Build this into the shared identity domain model, the OIDC subject model where appropriate, and the developer API contracts. Add MCP-compatible integration surfaces so agent systems can query Cubid trust signals and identify themselves through supported protocols. The implementation should preserve app-scoped identity, consent boundaries, and data minimization, while making explicit which signals are human-only, agent-only, or organization-only. This todo gives Cubid a broader protocol footprint while staying honest about what personhood and trust mean in different actor classes.

### E04. Improve global onboarding, accessibility, and low-friction trust progression

- Status: Completed
- Timestamp started: 2026-04-29T19:10:46Z
- Timestamp completed: 2026-04-29T19:18:41Z
- Feature branch: codex/e03-actor-identity-model
- Head: 4b42692
- Session-log reference(s): session: v111, session: v112, session: v113

Translate the backgrounder’s product constraints into concrete engineering work. Redesign onboarding and verification journeys so they remain accessible, globally usable, and low-friction for users with limited documentation, limited bandwidth, or limited digital literacy. Establish an accessibility bar of WCAG 2.1 AA across Passport and Admin, including keyboard support, semantic structure, announcement behavior, color contrast, and readable step flows. Replace hard assumptions about phone, email, or wallet availability with progressive trust accumulation so users can start with minimal identity signals and deepen later. This work should include telemetry that measures abandonment at each step without capturing unnecessary personal data. The outcome should be a trust platform that grows identity depth without turning into a heavy KYC product, which is central to the Cubid mission.

### SIWC. Build Sign In With Cubid custody, signing, and wallet-adjacent product surfaces

- Status: Started
- Timestamp started: 2026-05-05T01:21:18Z
- Timestamp completed: TBD
- Feature branch: codex/siwc-roadmap-cleanup
- Head: TBD
- Session-log reference(s): session: v160

Promote the SIWC side-roadmap into the main execution backlog as the next wallet-adjacent platform track. The already-landed Cubid foundation covers OIDC Login with Cubid, passkey-first auth, app-scoped identity, selective disclosure, API v3 encrypted dapp-user secrets, generated app-scoped blockchain accounts, and signed webhook infrastructure. The remaining product gap is explicit signing: dapps need a safe way to request message or transaction signatures, humans need Passport-hosted visibility and approval, Admin needs policy controls, and operators need runbooks before any custody signer can be exposed broadly. SIWC work must stay backend/API-contract first in this repo, with public SDK implementation handled through `Cubid-Me/cubid-sdk` handoff notes whenever route or webhook contracts change.

### SIWC01. Define the v3 signing and transaction authorization architecture

- Status: Completed
- Timestamp started: 2026-05-05T01:21:18Z
- Timestamp completed: 2026-05-05T01:23:41Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 008934d
- Session-log reference(s): session: v160, session: v161

Design the first decision-complete signing architecture for app-scoped custody accounts in `docs/engineering/siwc-v3-signing-architecture.md`. The architecture should decide whether v3 signing starts as server-side custodial signing with Supabase Vault-backed private keys, smart-account signing, a future external signer, or a phased hybrid. It must preserve the separation between authentication credentials and blockchain signing keys: passkeys authorize user intent, while wallet private keys or smart-account signer keys perform blockchain signing. Define the signing request lifecycle, approval state machine, actor model, replay/idempotency requirements, audit events, and which chains are included in the first slice. The design should explicitly say that generated accounts are not enough for SIWC wallet parity until users can safely approve signatures or transactions.

### SIWC02. Add Admin policy controls for app-scoped account custody and signing

- Status: Completed
- Timestamp started: 2026-05-05T01:23:41Z
- Timestamp completed: 2026-05-05T23:41:40Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: a968016
- Session-log reference(s): session: v161, session: v162, session: v163

Add Admin-side controls that let operators configure whether an app may request generated accounts, which chains are enabled, whether signing is enabled, and which approval rules apply. This should extend the existing Admin control-plane pattern rather than creating a separate wallet dashboard. Include fields for allowed chains, custody mode, signing status, allowed signature types, transaction limits, optional contract allowlists, required passkey ACR, webhook event subscriptions, and sandbox/production behavior. Admin list/detail views must not expose private keys, ciphertext, wrapped data keys, Vault key material, or cross-app user identifiers. This todo should also decide how policy names and versions are surfaced to API v3 responses and audit logs, and should treat policy changes as SDK-impacting only when they alter public route or webhook semantics.

### SIWC03. Add Passport user-facing app account visibility

- Status: Completed
- Timestamp started: 2026-05-05T23:41:40Z
- Timestamp completed: 2026-05-06T08:31:22Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 774cd64
- Session-log reference(s): session: v163, session: v164

Add user-facing visibility for app-scoped custody accounts in Passport, likely inside the existing Profile and disclosure-management surface. Users should be able to see which apps have generated accounts for them, which chain each account belongs to, public addresses, labels, creation dates, custody status, and whether signing is enabled for that app. The UI should reinforce the privacy model: these accounts are scoped to individual apps, and other apps should not be able to correlate them. This slice should not add private-key export, signing, or cross-app wallet portability. It should only make the already-created v3 account metadata understandable and auditable for the human user, with no exposure of private or encrypted custody fields.

### SIWC04. Implement v3 signing request lifecycle

- Status: Completed
- Timestamp started: 2026-05-06T08:31:22Z
- Timestamp completed: 2026-05-06T08:57:01Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: a41f6ee
- Session-log reference(s): session: v165, session: v166

Implement the backend lifecycle for signing requests after SIWC01 chooses the architecture. Add API v3 routes for creating a signing request, reading request status, approving or rejecting through Passport, and returning the resulting signature or transaction hash when complete. Requests must be app-scoped, dapp-authenticated, idempotent where appropriate, bound to a specific `dapp_user_uuid` and `user_account_id`, and checked against Admin signing policy before user approval. Approval should be hosted in Passport and require passkey step-up when policy or ACR requires it. Responses must never return private keys, raw decrypted material, Vault wrapping keys, or internal human subject keys. All state changes should write audit/security events and be safe to retry.

### SIWC05. Add transaction risk, policy evaluation, and passkey step-up

- Status: Completed
- Timestamp started: 2026-05-06T08:57:01Z
- Timestamp completed: 2026-05-06T09:22:33Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 313f4a5
- Session-log reference(s): session: v167, session: v168

Add the first transaction-policy and risk layer before broad transaction signing is considered production-ready. The initial version can be conservative: human-readable request summaries, chain/account matching, requested operation type, recipient or contract metadata where available, amount thresholds, contract allowlist checks, and mandatory passkey step-up for high-risk requests. The goal is not full transaction simulation across every chain in v1; it is to prevent blind signing from becoming the default. Passport approval screens should make the app, chain, public account, action, and risk posture clear. Admin should be able to configure policy strictness. Failed policy checks, rejected approvals, and passkey step-up failures should be auditable and webhook-eligible.

### SIWC06. Add signing and wallet webhook contracts plus SDK handoff notes

- Status: Completed
- Timestamp started: 2026-05-06T09:22:33Z
- Timestamp completed: 2026-05-06T10:25:43Z
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 82fcdd6
- Session-log reference(s): session: v169, session: v170

Extend the API v3 webhook contract for app-scoped custody and signing events. Candidate events include `wallet.created`, `wallet.signing_request.created`, `wallet.signing_request.approved`, `wallet.signing_request.rejected`, `wallet.signature.completed`, `wallet.transaction.submitted`, `wallet.transaction.failed`, and `wallet.policy.denied`. Payloads must follow the existing API v3 webhook direction: stable event IDs, timestamps, HMAC signatures, replay-safe delivery semantics, retry metadata, and disclosure-safe payloads that do not leak cross-app identifiers or custody secrets. Because these events affect developer-facing SDK behavior, each implemented contract change must create a handoff note in the public SDK repo. Do not add SDK implementation code to `cubid-passport`.

### SIWC07. Evaluate smart-account, session-key, and paymaster roadmap

- Status: Started
- Timestamp started: 2026-05-06T10:25:43Z
- Timestamp completed: TBD
- Feature branch: codex/siwc-roadmap-cleanup
- Head: 82fcdd6
- Session-log reference(s): session: v171

Evaluate whether Cubid should support smart accounts, scoped session keys, and paymaster/gas sponsorship after the basic signing lifecycle is secure. This should be a design and sequencing task, not an implementation shortcut. Compare the app-scoped privacy model against user expectations for portable wallets, recovery, gasless onboarding, and asset fragmentation. Decide whether smart accounts should wrap existing app-scoped custodial keys, replace generated EOAs for some chains, or remain a later optional custody mode. Define what would need to change in Admin policy, Passport approval UX, API v3 signing routes, webhook events, and SDK contracts. The output should be a recommendation with explicit "not yet" criteria if the platform is not ready.

### SIWC08. Build production readiness runbook for SIWC custody and signing

- Status: Not started
- Timestamp started: TBD
- Timestamp completed: TBD
- Feature branch: TBD
- Head: TBD
- Session-log reference(s): TBD

Create the operator runbook for SIWC custody and signing before exposing signing broadly. The runbook should cover Vault key ownership and rotation, generated-account custody boundaries, migration rollback, audit-log inspection, signing request triage, webhook replay, incident response, abuse monitoring, emergency app suspension, user support, and privacy review for app-scoped account visibility. It should explicitly document what is safe to expose to users and dapps, what is Admin-only, what is service-role-only, and what must never leave server memory. Include local/staging/prod environment requirements, smoke tests, and launch blockers. This todo should close the gap between a technically working signer and an operable platform surface.
