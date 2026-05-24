### session: v186

- timestamp: 2026-05-07T13:30:57Z
- agent: **OpenAI Codex**
- branch: **codex/hosted-readiness-metadata**
- head: **`4bb17b2`**
- session name: **Address PR 162 workspace transpilation review**

#### Objective

Address Codex review feedback on missing workspace package transpilation in
the Admin and Passport Next builds.

#### Actions Taken

- added `@cubid/claims` and `@cubid/auth` to the Admin Next
  `transpilePackages` list alongside existing shared packages
- added Passport workspace imports `@cubid/auth`, `@cubid/config`,
  `@cubid/identity`, and `@cubid/stamps` to Passport
  `transpilePackages`

#### Verification

- ran `pnpm --filter @cubid/admin build`
- ran `pnpm --filter @cubid/passport build`
- ran `git diff --check`

#### Follow-up

- reply to and resolve the two PR #162 review threads, then re-check CI after
  pushing the fix

### session: v185

- timestamp: 2026-05-07T11:48:24Z
- agent: **OpenAI Codex**
- branch: **codex/hosted-readiness-metadata**
- head: **`b9b652f`**
- session name: **Guard shared Supabase promotion checks**

#### Objective

Prepare for a `dev` to `main` promotion while preview and production still
share the same `CubidDev` Supabase project.

#### Actions Taken

- added a shared-project guard to `.github/workflows/supabase-deploy.yml` so
  pull requests into `main` skip remote Supabase migration drift checks when
  the configured project ref is still `cggycnbvljcdptzyjpju`
- added a matching manual-dispatch no-op path for `Production – cubid-passport`
  when it is still configured to the shared dev/preview Supabase project
- updated the hosted Supabase delivery runbook with the temporary shared
  Supabase promotion posture

#### Verification

- ran `git diff --check`
- parsed `.github/workflows/supabase-deploy.yml` with Ruby YAML loading

#### Follow-up

- publish this guard to `dev`, then open the `dev` to `main` promotion PR and
  confirm the Supabase workflow reports the shared-project skip

### session: v184

- timestamp: 2026-05-07T11:30:11Z
- agent: **OpenAI Codex**
- branch: **codex/hosted-readiness-metadata**
- head: **`eb96754`**
- session name: **Reconcile hosted readiness metadata**

#### Objective

Update stale hosted-readiness metadata now that CubidDev migrations are applied
and the OIDC staging issuer is live on Fly.

#### Actions Taken

- marked `F01` completed in `agent-context/todo.md`
- updated `agent-context/repo-status.md` so Supabase migrations, the protected
  deployment workflow, and OIDC staging reflect current hosted status
- updated the Supabase hosted-delivery runbook to record the successful apply
  and follow-up check state
- updated the OIDC Fly deployment runbook to state that `staging-id.cubid.me`
  is deployed, certificated, and smoke-checked

#### Verification

- confirmed `supabase migration list --linked` reports local and remote
  migrations aligned through `20260506093000`
- confirmed recent `Supabase Deploy` workflow dispatches completed
  successfully, including apply and follow-up check
- planned docs-only validation with `git diff --check`

#### Follow-up

- run full Passport/Admin/API v3/SIWC/TCOIN OIDC smoke checks before claiming
  broader staging or production readiness

### session: v140

- timestamp: 2026-05-07T11:16:13Z
- agent: **OpenAI Codex**
- branch: **codex/oidc-fly-staging-deploy**
- head: **`37a76cd`**
- session name: **Address OIDC Fly deployment review comments**

#### Objective

Address remaining review feedback on PR #161 without changing the hosted OIDC protocol surface.

#### Actions Taken

- removed unused `OIDC_STAGING_ISSUER_URL` from the Fly staging runtime config
- changed the OIDC Fly Docker build from `build` to `typecheck` because the runtime intentionally starts the TypeScript service with `tsx`
- documented that the container validates TypeScript without producing unused `dist/` output

#### Verification

- planned follow-up validation with focused OIDC checks, Docker build, Fly redeploy, and hosted issuer smokes

#### Follow-up

- reply to and resolve the Copilot and Codex review threads after the fix is pushed

### session: v139

- timestamp: 2026-05-07T11:13:16Z
- agent: **OpenAI Codex**
- branch: **codex/oidc-fly-staging-deploy**
- head: **`732ab7d`**
- session name: **Address OIDC Fly passkey RP review**

#### Objective

Fix the staging Fly passkey configuration so both production and preview Passport origins can use hosted OIDC passkey ceremonies.

#### Actions Taken

- set `OIDC_PASSKEY_RP_ID` to the shared suffix `cubid.me` in the Fly staging config
- documented that the staging issuer uses the shared RP ID to support `passport.cubid.me` and `passport-preview.cubid.me`

#### Verification

- planned follow-up validation with `pnpm --filter @cubid/oidc typecheck`, `pnpm --filter @cubid/oidc build`, Fly redeploy, and hosted discovery/JWKS smokes

#### Follow-up

- reply to and resolve the Codex review thread after the fix is pushed

### session: v138

- timestamp: 2026-05-07T08:52:27Z
- agent: **OpenAI Codex**
- branch: **codex/oidc-fly-staging-deploy**
- head: **`a0cee16`**
- session name: **Deploy OIDC staging issuer to Fly**

#### Objective

Finish the staging Fly deployment path for the OIDC issuer and record the deployment-command correction discovered during the live deploy.

#### Actions Taken

- created the Fly app `cubid-oidc-staging`
- staged and deployed required OIDC runtime secrets for Supabase, Firebase, pairwise subject derivation, and JWT signing
- deployed the OIDC service to Fly and verified discovery plus JWKS on the Fly hostname
- added the Fly certificate request for `staging-id.cubid.me`
- corrected the Fly deploy command so the Dockerfile is resolved from the monorepo root while keeping the config under `services/oidc`
- bound the OIDC server explicitly to `0.0.0.0` for hosted proxy compatibility

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc build`
- `docker build -f services/oidc/Dockerfile -t cubid-oidc-staging:local .`
- `flyctl deploy . -c services/oidc/fly.staging.toml --dockerfile services/oidc/Dockerfile --app cubid-oidc-staging`
- `curl -fsS https://cubid-oidc-staging.fly.dev/.well-known/openid-configuration`
- `curl -fsS https://cubid-oidc-staging.fly.dev/jwks`

#### Follow-up

- add DNS records for `staging-id.cubid.me`: A `66.241.124.238` and AAAA `2a09:8280:1::112:476f:0`
- rerun `flyctl certs check staging-id.cubid.me --app cubid-oidc-staging` and smoke `https://staging-id.cubid.me` after DNS propagates

### session: v137

- timestamp: 2026-05-07T08:43:12Z
- agent: **OpenAI Codex**
- branch: **codex/oidc-fly-staging-deploy**
- head: **`d98028f`**
- session name: **Add OIDC Fly staging deployment adapter**

#### Objective

Prepare the standalone OIDC issuer service for hosted staging deployment on Fly.io at `https://staging-id.cubid.me`.

#### Actions Taken

- added a Fly-oriented OIDC Dockerfile that builds and runs the `@cubid/oidc` workspace from the monorepo root
- added a staging Fly config for the `cubid-oidc-staging` app, `yyz` region, HTTPS service routing, and staging issuer environment defaults
- added an OIDC Fly deployment runbook covering required runtime secrets, DNS/certificate wiring, staging smoke checks, TCOIN client seeding, and rollback
- linked the Fly deployment runbook from the existing TCOIN OIDC readiness document

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc build`
- `docker build -f services/oidc/Dockerfile -t cubid-oidc-staging:local .`
- `git diff --check`

#### Follow-up

- provision Fly app secrets, deploy `cubid-oidc-staging`, add the `staging-id.cubid.me` Fly certificate, configure DNS, and run hosted issuer smoke checks

### session: v136

- timestamp: 2026-04-30T23:33:11Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`6dcb43c`**
- session name: **Reconcile C02 with completed security baseline**

#### Objective

Reconcile the stale C02 todo against the completed C03.4/C03.5 work that already removed the live generic Supabase CRUD surface.

#### Actions Taken

- verified `/api/supabase/select`, `/insert`, `/update`, and `/delete` now return `410 endpoint_removed`
- verified first-party `/api/supabase/*` references are limited to tests and commented historical code
- marked C02 as superseded by C03.4/C03.5 in `agent-context/todo.md`
- updated the API security baseline doc so it no longer claims C02 owns final replacement of generic Supabase CRUD

#### Verification

- reviewed current route handlers, repo references, C03 session-log entries, and Passport route tests for hard-disabled behavior
- planned follow-up validation with `git diff --check`

#### Follow-up

- treat any remaining direct Supabase table access as feature-specific repository cleanup rather than a public generic CRUD replacement task

### session: v135

- timestamp: 2026-04-30T23:32:30Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`fedad4a`**
- session name: **Close D02 feature-module metadata**

#### Objective

Close D02 after the first Passport and Admin feature-module extraction landed and passed focused validation.

#### Actions Taken

- marked `D02` completed in `agent-context/todo.md`
- recorded implementation head `fedad4a`
- attached the D02 start, implementation, and closeout session-log references

#### Verification

- relied on the focused D02 validation recorded in `session: v134`

#### Follow-up

- create narrower future todos if more feature modules need extraction beyond the first Allow/OIDC Ops boundary

### session: v134

- timestamp: 2026-04-30T23:32:09Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`2418c44`**
- session name: **Implement D02 feature-module extraction**

#### Objective

Land a bounded D02 refactor that moves behavior-preserving Passport and Admin orchestration into feature-owned modules.

#### Actions Taken

- extracted Passport Allow Page OIDC consent rendering into `features/allow/OidcConsentPanel`
- extracted legacy Allow Page browser-state helpers into `features/allow/legacyAllowState`
- extracted Admin OIDC Ops API calls, rate-tier constants, and API error mapping into `features/oidc-ops/api`
- kept product behavior unchanged and avoided broad UI modernization in this slice

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport typecheck && pnpm --filter @cubid/admin typecheck'`
- `git diff --check`

#### Follow-up

- continue with narrower feature-module follow-ups for Profile, stamp providers, client management, and webhook administration if needed

### session: v133

- timestamp: 2026-04-30T23:29:43Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`2e91522`**
- session name: **Start D02 feature-module refactor**

#### Objective

Start D02 on the current branch and keep the first refactor bounded to thin feature modules around existing Passport and Admin behavior.

#### Actions Taken

- marked `D02` started in `agent-context/todo.md`
- scoped the implementation to extracting Passport Allow/OIDC consent and Admin OIDC Ops module boundaries without changing product behavior
- kept larger UI modernization and localStorage removal as future narrower follow-ups

#### Verification

- confirmed the branch was clean before starting D02 metadata changes

#### Follow-up

- implement feature modules, run focused typechecks, and close D02 metadata if the extracted boundaries land cleanly

### session: v132

- timestamp: 2026-04-30T23:28:46Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`544af88`**
- session name: **Document SDK repo coordination rules**

#### Objective

Update repo-agent guidance so future work respects the separation between this private app/backend repo and the public Cubid SDK repo.

#### Actions Taken

- added startup guidance to check `agent-context/messages-from-cubid-sdk/` for incoming SDK-agent messages
- documented that public API and SDK implementation belongs in `Cubid-Me/cubid-sdk`, with local checkout `/Users/botmaster/src/cubid/cubid-sdk-v2`
- documented that SDK-impacting backend changes must be evaluated against the SDK and accompanied by an outbound note in the SDK repo message folder

#### Verification

- planned follow-up validation with `git diff --check`

#### Follow-up

- evaluate this branch's E01/D01 changes for SDK impact and create an outbound SDK-agent note if needed

### session: v131

- timestamp: 2026-04-30T23:14:04Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`b3d5539`**
- session name: **Close D01 shared domain package metadata**

#### Objective

Close D01 after the identity, claims, and stamps shared package boundaries exist and Passport consumes the extracted stamp registry.

#### Actions Taken

- marked `D01` completed in `agent-context/todo.md`
- recorded implementation head `b3d5539`
- attached the D01 start, implementation, and closeout session-log references

#### Verification

- confirmed `@cubid/identity`, `@cubid/claims`, and `@cubid/stamps` now provide the requested shared domain package boundary
- relied on the focused D01 validation recorded in `session: v130`

#### Follow-up

- extract persistence adapters and feature modules later under narrower follow-up todos rather than broadening D01

### session: v130

- timestamp: 2026-04-30T23:13:38Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`26ef1e3`**
- session name: **Implement D01 shared stamps package**

#### Objective

Extract the duplicated Passport stamp registry and app-safe stamp helpers into a shared domain package as the first D01 implementation slice.

#### Actions Taken

- added `@cubid/stamps` with canonical stamp type IDs, reverse lookup helpers, stamp permission validation, and app-safe disclosed stamp normalization
- switched Passport server routes, utility exports, and stamp UI barrels away from local duplicated stamp maps
- added `@cubid/stamps` as a Passport workspace dependency and refreshed the pnpm lockfile
- preserved legacy import surfaces such as `pages/api/utils/stampKey.ts` and `lib/stampInsertion.ts` as thin compatibility re-exports

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/stamps test && pnpm --filter @cubid/stamps typecheck && pnpm --filter @cubid/stamps build && pnpm --filter @cubid/passport typecheck'`
- `git diff --check`

#### Follow-up

- continue D01 by extracting score/event/client-app contracts or by wiring E01 disclosure grants into Allow Page and OIDC consent persistence

### session: v129

- timestamp: 2026-04-30T23:09:49Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`a30878a`**
- session name: **Start D01 shared domain extraction**

#### Objective

Start D01 on the current E01 branch so the app-scoped disclosure work can share canonical identity, stamps, and claims domain primitives.

#### Actions Taken

- marked `D01` started in `agent-context/todo.md`
- scoped the first implementation slice to extracting duplicated stamp registry and permission-domain helpers into a shared `@cubid/stamps` package
- kept the broader Passport/Admin feature-module refactor out of scope for this D01 slice

#### Verification

- confirmed the branch was clean before starting D01 metadata changes

#### Follow-up

- add the shared stamps package, switch duplicated Passport stamp maps to it, validate focused package/app checks, then update D01 metadata

### session: v128

- timestamp: 2026-04-30T21:42:48Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`96ac1ff`**
- session name: **Update E01 implementation metadata**

#### Objective

Point the in-progress E01 todo at the first implementation head after the app-scoped disclosure foundation landed.

#### Actions Taken

- updated `E01` metadata to reference implementation commit `96ac1ff`
- added the E01 foundation session-log reference while keeping E01 open for route adoption work

#### Verification

- confirmed implementation commit `96ac1ff` contains the shared identity helpers, migration, tests, and engineering doc

#### Follow-up

- continue E01 by wiring Allow Page and OIDC consent persistence into the new disclosure grant contract

### session: v127

- timestamp: 2026-04-30T21:42:23Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`2e6d13f`**
- session name: **Implement E01 disclosure foundation**

#### Objective

Land the first E01 foundation slice for app-scoped identity and selective disclosure without rewriting existing Passport or OIDC flows in one broad pass.

#### Actions Taken

- extended `@cubid/identity` with app-scoped subject derivation, selective-disclosure grant contracts, raw identifier guards, claim normalization, and claim-value filtering helpers
- added focused identity package tests for app-scoped subject stability, cross-app separation, disclosure normalization, raw identifier rejection, and active-grant filtering
- added service-role-only Supabase tables for app-scoped subjects, disclosure grants, and disclosure audit events
- documented the E01 target contract and runtime adoption sequence in `docs/engineering/app-scoped-identity-selective-disclosure.md`

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/identity test && pnpm --filter @cubid/identity typecheck && pnpm --filter @cubid/identity build'`
- `git diff --check`

#### Follow-up

- wire Allow Page and OIDC consent persistence into the shared disclosure grant service in the next E01 slice

### session: v126

- timestamp: 2026-04-30T21:38:40Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`64c0da4`**
- session name: **Start E01 app-scoped identity and disclosure**

#### Objective

Start E01 as the platform slice for first-class app-scoped identity and selective disclosure.

#### Actions Taken

- created the E01 feature branch from the current clean roadmap-metadata head
- marked `E01` started in `agent-context/todo.md`
- scoped the work to consent/disclosure services, app-scoped subject identifiers, claim-release decisions, revocation behavior, and user-visible/auditable history

#### Verification

- confirmed the branch was clean before updating E01 metadata

#### Follow-up

- inspect the current Allow Page, OIDC consent, SDK-facing routes, webhook filtering, and shared identity packages before implementing the first E01 service slice

### session: v125

- timestamp: 2026-04-30T21:34:05Z
- agent: **OpenAI Codex**
- branch: **codex/sdk-ingestion-private-repo-cleanup**
- head: **`055e888`**
- session name: **Reconcile completed roadmap metadata**

#### Objective

Clean up stale roadmap metadata for B02, B04, C05, and E02 after the implementation and SDK-ingestion work had already landed.

#### Actions Taken

- marked the B02 parent and B02.3 through B02.5 as completed to match their recorded completion timestamps and implementation sessions
- marked the B04 parent as completed now that B04.1 through B04.4 are all closed
- marked the C05 parent as completed while keeping deployment-gated follow-ups open as separate todos
- changed E02 parent and child statuses from the stale local `cubid-sdk-v2` wording to `Ingested into cubid-sdk`, pointing future SDK work at `Cubid-Me/cubid-sdk`

#### Verification

- reviewed `agent-context/todo.md` and `agent-context/session-log.md` evidence for the target sections
- planned follow-up validation with `git diff --check` after editing

#### Follow-up

- commit the metadata-only cleanup once diff validation passes

### session: v64

- timestamp: 2026-04-26T17:53:38-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`7519f0f`**
- session name: **Record C03.1 completion metadata**

#### Objective

Close the roadmap metadata for `C03.1` after the API security baseline doc and C03 split landed on the branch.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so the parent `C03` item points at the landed kickoff commit
- marked `C03.1` completed with its completion timestamp, landed head, and the two kickoff metadata sessions

#### Verification

- metadata-only follow-up after the documentation kickoff commit recorded in `session: v63`

#### Follow-up

- implement `C03.2` next by moving `services/oidc` onto the shared request ID, CORS, validation, and rate-limit primitives without changing OIDC wire shapes

### session: v63

- timestamp: 2026-04-26T17:52:11-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`8f1f43c`**
- session name: **Start C03 and define the API security baseline**

#### Objective

Start `C03` as a repo-wide hardening stream by splitting it into sequential subtodos and writing the dedicated target-state API security contract for Passport, Admin, and OIDC.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) to mark the parent `C03` workstream started on `codex/c03-api-security-baseline`
- split `C03` into `C03.1` through `C03.5` with ordered descriptions covering contract definition, OIDC adoption, Admin adoption, Passport adoption, and closeout validation
- added [docs/engineering/api-security-baseline.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/api-security-baseline.md) as the target-state source of truth for shared request IDs, `zod` validation, actor guards, CORS allowlists, error envelopes, rate-limit storage, internal-only route rules, and migration order

#### Verification

- reviewed the new roadmap and engineering doc content locally to confirm the C03 sequencing, metadata, and target-state rules are internally consistent

#### Follow-up

- commit the C03 kickoff artifacts, then record the C03.1 completion metadata once the target-state doc lands on the branch

### session: v62

- timestamp: 2026-04-26T05:20:33-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-4-passkey-lifecycle-stepup**
- head: **`d74488e`**
- session name: **Address PR #148 Codex review feedback**

#### Objective

Address the `chatgpt-codex-connector` review findings on PR #148 covering passkey ACR trust boundaries and Admin passkey metric accuracy.

#### Actions Taken

- filtered hosted Firebase-backed login completion methods to a server-approved non-passkey set so only the dedicated WebAuthn completion path can satisfy passkey ACR
- added OIDC regression coverage proving caller-supplied `passkey` is stripped from hosted login completion input
- moved Admin 7-day passkey counters off the 200-row sampled event lists and onto aggregate count queries, while keeping the recent-event feed capped for display only
- updated Admin helper coverage to reflect aggregate-driven passkey totals

#### Verification

- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/admin typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/admin test`

#### Follow-up

- push the Codex-review fixes, respond on the two Codex review threads, resolve them, and confirm the rerun checks stay green

### session: v61

- timestamp: 2026-04-26T04:52:25-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-4-passkey-lifecycle-stepup**
- head: **`f6a27ae`**
- session name: **Address PR #148 Copilot review feedback**

#### Objective

Address the four Copilot review comments on PR #148 covering token claim shape, migration rollout safety, Admin passkey redaction assurances, and Passport cookie parsing hardening.

#### Actions Taken

- updated OIDC session authentication claims to omit `amr` when the normalized method list is empty and added unit coverage for that contract
- hardened the passkey lifecycle migration with a transitional `device_id` default so rolling writers do not fail before all application nodes are updated
- added Admin passkey-ops test coverage that locks the current omission of `actorIdentifier` from redacted passkey audit payloads
- wrapped Passport OIDC session cookie decoding in a safe `try/catch` so malformed cookie values fail closed instead of throwing

#### Verification

- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/admin test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/passport typecheck`

#### Follow-up

- push the PR-review fixes, respond on each Copilot review thread, resolve them, and recheck CI before requesting Codex review

### session: v60

- timestamp: 2026-04-21T03:33:56-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-4-passkey-lifecycle-stepup**
- head: **`94068c1`**
- session name: **Complete B04.4 roadmap metadata**

#### Objective

Record the completed B04.4 todo state after the passkey lifecycle and OIDC ACR implementation landed on the feature branch.

#### Actions Taken

- set the B04.4 implementation head in [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md)
- added the metadata closure session reference for the completed todo

#### Verification

- metadata-only change following the B04.4 validation suite recorded in `session: v59`

#### Follow-up

- publish the stacked B04.4 branch for review when ready

### session: v59

- timestamp: 2026-04-21T03:33:11-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-4-passkey-lifecycle-stepup**
- head: **`94068c1`**
- session name: **Implement B04.4 passkey lifecycle and ACR step-up**

#### Objective

Complete B04.4 on the stacked passkey branch by adding passkey device lifecycle management, read-only Admin passkey operations visibility, and OIDC ACR semantics for passkey-required Login with Cubid authorization requests.

#### Actions Taken

- added a Supabase migration for opaque passkey `device_id` values, revocation actor/reason metadata, and active-device lookup indexes
- added Passport Firebase-authenticated passkey management APIs for list, rename, and revoke, with safe browser response shapes and token/session revocation on device revoke
- expanded Passport Profile Login & Security with passkey device listing, rename controls, revoke confirmation, recovery copy, and refresh behavior
- added Admin OIDC Ops passkey aggregates, redacted recent passkey audit events, supported ACR visibility, and passkey step-up failure metrics
- added OIDC `acr_values=urn:cubid:acr:passkey` parsing/persistence, passkey-only login completion enforcement for passkey-required challenges, discovery metadata, and ID-token `amr`/`acr` claims
- updated OIDC architecture docs for device lifecycle ownership, opaque device IDs, ACR behavior, and deferred Admin-action step-up enforcement

#### Verification

- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/admin typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/admin test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/admin build`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/passport typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/passport build`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm lint`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm build`

#### Follow-up

- record the resulting implementation commit hash in the B04.4 todo metadata after the commit lands

### session: v58

- timestamp: 2026-04-20T17:17:41-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-3-passkey-ux-otp-recovery**
- head: **`ca28575`**
- session name: **Complete B04.3 roadmap metadata**

#### Objective

Record the completed B04.3 todo state after the integrated passkey UX implementation landed on the feature branch.

#### Actions Taken

- marked `B04.3` completed in [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md)
- set the completed timestamp, feature branch, implementation head, and session-log references

#### Verification

- metadata-only change following the B04.3 validation suite recorded in `session: v57`

#### Follow-up

- publish the B04.3 branch for review when ready

### session: v57

- timestamp: 2026-04-20T17:16:15-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-3-passkey-ux-otp-recovery**
- head: **`53253be`**
- session name: **Integrate B04.3 passkey UX with current dev**

#### Objective

Bring the B04.3 Passport passkey UX branch forward onto current `dev`, preserving the newer OIDC Ops/Profile consent work while finishing the user-facing passkey and OTP recovery behavior.

#### Actions Taken

- resolved the `dev` merge conflicts in Passport Profile and package dependencies by keeping both passkey support and OIDC consent-management support
- added a shared Passport browser helper for WebAuthn/OIDC passkey authentication and registration ceremonies
- adjusted Login with Cubid behavior so passkey authentication redirects immediately, while OwnID email or Firebase phone OTP fallback login shows a skippable passkey setup prompt when an issuer session is returned
- removed the login flow's localStorage-backed email identity dependency and kept phone OTP positioned as the explicit recovery fallback
- retained Passport server proxy routes for OIDC passkey ceremonies so browser code stays same-origin and the issuer session ID stays in an HTTP-only Passport cookie

#### Verification

- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/passport typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc typecheck`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/oidc test`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm --filter @cubid/passport build`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm exec turbo run lint --force`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm exec turbo run typecheck --force`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm exec turbo run test --force`
- `NODE20_BIN=$(npx -y -p node@20 node -p 'require("path").dirname(process.execPath)') && PATH="$NODE20_BIN:$PATH" pnpm exec turbo run build --force`

#### Follow-up

- commit the integrated implementation, then record the final B04.3 completion metadata against the resulting feature head

### session: v54

- timestamp: 2026-04-20T16:20:18-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-3-passkey-ux-otp-recovery**
- head: **`06e6633`**
- session name: **Complete B04.3 roadmap metadata**

#### Objective

Record the completed B04.3 todo state after the implementation commit produced the final feature head.

#### Actions Taken

- marked `B04.3` completed in [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md)
- set the completed timestamp, feature branch, implementation head, and session-log reference

#### Verification

- metadata-only change following the already completed B04.3 validation suite

#### Follow-up

- publish the branch when ready and continue with the next passkey follow-up todo

### session: v53

- timestamp: 2026-04-20T16:19:51-0400
- agent: **OpenAI Codex**
- branch: **codex/b04-3-passkey-ux-otp-recovery**
- head: **`bd828d4`**
- session name: **Implement Passport passkey UX and OTP recovery**

#### Objective

Add the Passport-facing passkey experience for Login with Cubid while keeping OIDC passkey challenge and session truth in `services/oidc`.

#### Actions Taken

- added Passport server proxy routes for OIDC login challenge reads, login completion, passkey authentication options/completion, and passkey registration options/completion
- set the issuer session ID in an HTTP-only Passport cookie after OIDC login completion instead of storing it in browser state
- added passkey sign-in and post-login passkey registration prompts to the Passport login screen, with email/phone recovery paths still visible
- added Profile passkey registration using the same HTTP-only issuer-session proxy path
- added `@simplewebauthn/browser` to Passport and documented the B04.3 ceremony/session boundary

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`

#### Follow-up

- complete B04.3 roadmap metadata after this implementation commit records the feature head

### session: v0

- timestamp: 2026-04-15T12:04:00-0400
- agent: **OpenAI-Codex**
- branch: **main**
- head: **`8641012d0129fdb47487d45a471ce12692624407`**
- session name: **Bootstrap repo cleanup baseline**

#### Objective

Establish a safer, clearer maintenance baseline for the repository by cleaning tracked junk, normalizing tooling, and adding missing repo-operating documentation.

#### Actions Taken

- removed tracked `.DS_Store` files and the committed TypeScript incremental build cache from version control
- standardized the repo on `npm` by keeping `package-lock.json` as the canonical lockfile and updating local dev config to match
- deleted committed NEAR key files that should not live in the repository
- added root repo guidance in `AGENTS.md`
- expanded the `README.md` with setup, verification, and repository structure notes
- added pull request CI for lint, typecheck, and build

#### Verification

- `npx -y -p node@20 -p npm@10 npm ci --legacy-peer-deps`
- `npx -y -p node@20 -p npm@10 npm run lint` (passes with existing warnings)
- `npx -y -p node@20 -p npm@10 npm run typecheck`
- `npx -y -p node@20 -p npm@10 npm run build` (succeeds with existing runtime/build warnings)

#### Follow-up

- rotate any NEAR or third-party secrets that were previously committed
- move remaining hardcoded provider credentials into environment variables
- investigate the `localStorage is not defined` prerender warnings and the `@celo/contractkit` `fs` resolution warning that appear during `next build`
- add test coverage if the repo needs stronger regression protection than lint, typecheck, and build

### session: v1

- timestamp: 2026-04-15T13:21:21-0400
- agent: **OpenAI-Codex**
- branch: **codex/repo-cleanup-roadmap**
- head: **`8641012d0129fdb47487d45a471ce12692624407`**
- session name: **Document current architecture and roadmap**

#### Objective

Capture the current-state architecture, translate repo and product findings into an actionable engineering roadmap, and commit the full maintenance bundle on a feature branch.

#### Actions Taken

- added [docs/engineering/current-state-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/current-state-architecture.md) to document the current runtime architecture, route model, integration surface, and technical debt
- created [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) with parallel workstreams for monorepo migration, OIDC, passkeys, hardening, shared-domain refactors, and backgrounder-driven product work
- added execution metadata fields to every todo so future sessions can track status, timestamps, branch, head, and session-log references consistently
- prepared the full set of repo-cleanup, architecture, and planning changes for commit on a dedicated feature branch

#### Verification

- documentation-only changes reviewed in working tree
- no additional runtime validation beyond the earlier repo-cleanup verification in `v0`

#### Follow-up

- split the roadmap into implementation epics once `cubid-admin` import strategy is confirmed
- begin with monorepo foundation, secrets remediation, and typed service boundaries before building OIDC
- update each todo metadata block and append a new session entry before every future implementation commit

### session: v2

- timestamp: 2026-04-15T13:30:46-0400
- agent: **OpenAI-Codex**
- branch: **codex/repo-cleanup-roadmap**
- head: **`0b538d7ba551a269b501e830bfbdc657a64bec96`**
- session name: **Lock monorepo operating model**

#### Objective

Implement A01 by defining the target monorepo operating model, creating future-facing workspace/tasking artifacts, and marking the roadmap state for the completed planning milestone.

#### Actions Taken

- added [docs/engineering/monorepo-operating-model.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/monorepo-operating-model.md) as the source of truth for repo root choice, workspace layout, package naming, dependency rules, environment ownership, CI contracts, and migration sequencing
- added [pnpm-workspace.yaml](/Users/botmaster/src/cubid/cubid-passport/pnpm-workspace.yaml) to lock the future workspace boundaries for `apps`, `services`, `packages`, and `tooling`
- added [turbo.json](/Users/botmaster/src/cubid/cubid-passport/turbo.json) to lock the shared task contract for `dev`, `build`, `lint`, `typecheck`, `test`, and `format`
- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) to mark `A01` completed with branch, head, timestamps, and session-log reference metadata

#### Verification

- confirmed the current repo and sibling `cubid-admin` repo shapes before locking the operating model
- reviewed the new operating-model document and workspace artifacts for consistency with the approved A01 decisions
- no runtime validation was required because A01 intentionally stops short of app relocation or root script rewiring

#### Follow-up

- rewire the root `package.json` scripts to Turbo only after Passport is moved into `apps/passport` in A02
- keep `cubid-admin` preserve-first during import and use the locked workspace contract as the normalization target
- treat this document as the authoritative contract for A02 and later workstreams

### session: v3

- timestamp: 2026-04-15T13:37:32-0400
- agent: **OpenAI-Codex**
- branch: **codex/repo-cleanup-roadmap**
- head: **`0b538d7ba551a269b501e830bfbdc657a64bec96`**
- session name: **Finalize A01 and execution protocol**

#### Objective

Commit the A01 operating-model artifacts and make the todo execution protocol durable in both the roadmap and standing agent instructions.

#### Actions Taken

- added commit-and-clean-readout expectations to [AGENTS.md](/Users/botmaster/src/cubid/cubid-passport/AGENTS.md) so future sessions treat them as standing repo memory
- updated the execution protocol in [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) to require an immediate commit after each implemented todo, with the required session-log entry already present
- prepared the A01 monorepo operating-model artifacts and workflow-protocol changes for commit together on the active feature branch

#### Verification

- reviewed the modified workflow instructions and todo protocol for consistency
- confirmed the working tree contents before staging and commit

#### Follow-up

- commit this full A01 documentation bundle immediately after this session entry
- begin A02 next, using the locked operating-model document as the migration contract

### session: v4

- timestamp: 2026-04-15T13:37:32-0400
- agent: **OpenAI-Codex**
- branch: **codex/repo-cleanup-roadmap**
- head: **`9260661`**
- session name: **Align A01 todo metadata**

#### Objective

Bring the completed A01 todo metadata into sync with the actual implementation commit so the roadmap reflects the final branch, head, completion time, and session references.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `A01` now references the actual implementation commit head and both relevant session-log entries
- corrected `A01` completion metadata to reflect the point at which the operating-model artifacts were committed

#### Verification

- reviewed the `A01` metadata block after the operating-model commit to confirm head and session references were accurate
- confirmed the follow-up commit contains only roadmap metadata alignment

#### Follow-up

- start `A02` next on a new feature branch once ready to relocate Passport into `apps/passport`

### session: v5

- timestamp: 2026-04-15T14:08:05-0400
- agent: **OpenAI-Codex**
- branch: **codex/a02-passport-monorepo-shell**
- head: **`4051e81`**
- session name: **Relocate Passport into the monorepo app shell**

#### Objective

Implement A02 by moving the live Passport app into `apps/passport`, turning the repo root into a real `pnpm` plus Turbo monorepo shell, and preserving the root developer workflow for Passport during the transition.

#### Actions Taken

- moved the existing Passport application source and app-owned config into `apps/passport`, including the App Router tree, `pages/api`, shared components, hooks, config, Redux state, static assets, and deploy/config files
- replaced the root package contract with a monorepo shell using `pnpm`, Turbo-driven root scripts, a shared TypeScript base config, and updated CI and Gitpod commands
- preserved the Passport app as `@cubid/passport`, added workspace-local env and ESLint entrypoints, and updated docs in [README.md](/Users/botmaster/src/cubid/cubid-passport/README.md), [AGENTS.md](/Users/botmaster/src/cubid/cubid-passport/AGENTS.md), [docs/engineering/current-state-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/current-state-architecture.md), and [docs/engineering/monorepo-operating-model.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/monorepo-operating-model.md)
- deleted the unrelated root `mac.py` artifact and replaced the legacy npm lock with a root `pnpm-lock.yaml` generated from the prior committed dependency graph

#### Verification

- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- install --frozen-lockfile --reporter append-only`
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- lint` (passes with existing warnings)
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- typecheck`
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- test`
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- build` (passes with existing `@celo/contractkit` `fs` and `localStorage is not defined` warnings)
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- dev` plus `HEAD /login 200` from the running app, with the same existing `localStorage is not defined` runtime warning surfacing during SSR

#### Follow-up

- update the `A02` todo metadata after the implementation commit so it references the exact final head
- start `A03` next to import `cubid-admin` into `apps/admin` against the new workspace shell

### session: v6

- timestamp: 2026-04-15T14:09:02-0400
- agent: **OpenAI-Codex**
- branch: **codex/a02-passport-monorepo-shell**
- head: **`6b865a5`**
- session name: **Align A02 completion metadata**

#### Objective

Sync the completed `A02` roadmap metadata to the actual implementation commit so the todo state and session log reference the exact branch head that contains the monorepo migration.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `A02` now references the implementation commit head, final completion timestamp, and both relevant session-log entries

#### Verification

- confirmed the working tree was clean immediately after the A02 implementation commit
- reviewed the `A02` metadata block after updating the final head and session references

#### Follow-up

- begin `A03` next to import `cubid-admin` into `apps/admin` on top of the new workspace shell

### session: v7

- timestamp: 2026-04-15T14:44:29-0400
- agent: **OpenAI-Codex**
- branch: **codex/a03-import-admin**
- head: **`faa4dc7`**
- session name: **Import Admin into the monorepo workspace graph**

#### Objective

Implement A03 by importing `cubid-admin` as `apps/admin`, normalizing it to the monorepo shell, introducing the minimum shared packages needed for cross-workspace contracts, and validating the resulting two-app repository from the root.

#### Actions Taken

- imported the `cubid-admin` snapshot from sibling repo head `60080e4` into [apps/admin](/Users/botmaster/src/cubid/cubid-passport/apps/admin), excluding the old standalone repo shell and documenting the import policy in [docs/engineering/admin-import-record.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/admin-import-record.md)
- converted the root monorepo shell to validate both apps, added `dev:admin`, updated CI to run tests, and refreshed the long-lived docs in [README.md](/Users/botmaster/src/cubid/cubid-passport/README.md), [AGENTS.md](/Users/botmaster/src/cubid/cubid-passport/AGENTS.md), [docs/engineering/current-state-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/current-state-architecture.md), and [docs/engineering/monorepo-operating-model.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/monorepo-operating-model.md)
- created [packages/config](/Users/botmaster/src/cubid/cubid-passport/packages/config) and [packages/types](/Users/botmaster/src/cubid/cubid-passport/packages/types), wired Admin server env helpers through `@cubid/config`, and reused `@cubid/types` from both Admin and Passport
- fixed imported Admin workspace compatibility issues for pnpm, Turbo, Jest, TypeScript, ESLint, Firebase dependency pinning, and Next build behavior, and moved Passport’s exported wallet singleton out of `app/layout.tsx` into [apps/passport/lib/wallet.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/wallet.ts) so the App Router type contract remains valid under the expanded root checks

#### Verification

- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- install --no-frozen-lockfile --reporter append-only`
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- lint` (passes with existing warnings in both apps)
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- typecheck`
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- test`
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- build` (passes with existing Passport `@celo/contractkit` `fs` and `localStorage is not defined` warnings, plus Admin `caniuse-lite` warnings)
- `npx -y -p node@20 -p npm@10 npm exec --package=pnpm@10 pnpm -- dev:admin` plus `HEAD /sign-in 200`

#### Follow-up

- align the `A03` todo metadata to the exact implementation commit head once this work is committed
- start `B01` next to define the OIDC and trust architecture on top of the now-stable two-app monorepo baseline

### session: v8

- timestamp: 2026-04-15T14:47:30-0400
- agent: **OpenAI-Codex**
- branch: **codex/a03-import-admin**
- head: **`5b23674`**
- session name: **Trim unintended Admin import artifacts**

#### Objective

Remove stray repo-shell and generated artifacts that slipped into the A03 implementation commit so the imported Admin workspace matches the documented snapshot policy.

#### Actions Taken

- removed the accidentally tracked `apps/admin/.vscode/settings.json` file from the imported Admin workspace
- removed generated sitemap artifacts under `apps/admin/public/` that came from local build output rather than source intent
- updated [.gitignore](/Users/botmaster/src/cubid/cubid-passport/.gitignore) to keep those Admin-local repo-shell and generated files from reappearing in future commits

#### Verification

- reviewed the cleaned Admin workspace paths against the omit list in [docs/engineering/admin-import-record.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/admin-import-record.md)
- confirmed the cleanup targets were limited to repo-shell and generated artifacts, not runtime source files

#### Follow-up

- align the `A03` todo metadata to the final post-cleanup head and include both A03 session-log references

### session: v9

- timestamp: 2026-04-15T14:48:01-0400
- agent: **OpenAI-Codex**
- branch: **codex/a03-import-admin**
- head: **`6b29457`**
- session name: **Align A03 completion metadata**

#### Objective

Bring the completed `A03` roadmap metadata into sync with the actual post-cleanup implementation head so the todo points at the real task commit history.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `A03` now references the post-cleanup implementation head and all three relevant session-log entries
- kept the completion timestamp tied to the point where the implementation work itself finished, rather than the metadata-only follow-up commit

#### Verification

- reviewed the `A03` metadata block after the cleanup follow-up commit
- confirmed the task head now points at the final non-metadata A03 commit

#### Follow-up

- start `B01` next to define the OIDC and trust architecture on top of the stabilized two-app monorepo baseline

### session: v10

- timestamp: 2026-04-15T16:28:29-0400
- agent: **OpenAI-Codex**
- branch: **codex/b01-oidc-architecture**
- head: **`c5b2d28`**
- session name: **Lock Login with Cubid OIDC trust architecture**

#### Objective

Implement B01 by producing the decision-complete OIDC and trust architecture for Login with Cubid, including pairwise subject semantics, open dynamic client registration, scope and claim policy, and the implementation boundary between Passport, Admin, and the future issuer service.

#### Actions Taken

- added [docs/engineering/login-with-cubid-oidc-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/login-with-cubid-oidc-architecture.md) as the B01 source of truth for issuer responsibilities, stable issuer URL, client model, grant support, pairwise subject derivation, claims and consent policy, revocation behavior, shared package boundaries, and the initial OIDC data contracts
- included sequence flows in the new architecture document for web login, native login, device authorization, backend registration plus client credentials, consent grant, consent revocation, and token revocation so B02 can implement from an explicit protocol contract
- updated [docs/engineering/monorepo-operating-model.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/monorepo-operating-model.md) so the future `services/oidc` workspace now points to the dedicated B01 target-state architecture doc
- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) to mark `B01` completed and reference the new target-state architecture document directly

#### Verification

- reviewed the new OIDC architecture spec against the B01 acceptance criteria to confirm it explicitly answers pairwise `sub`, client types, supported grants, dynamic registration behavior, unverified-client capabilities, consent ownership, claim taxonomy, and the Passport/Admin/OIDC split
- reviewed the sequence-flow coverage to confirm every required flow for B01 is documented
- no runtime validation was required because this task is design-only and changed architecture documentation only

#### Follow-up

- start `B02` next by scaffolding `services/oidc` against the contracts locked in the new B01 architecture document
- use `@cubid/auth`, `@cubid/identity`, and `@cubid/claims` as the first package boundaries to extract while building the issuer runtime

### session: v11

- timestamp: 2026-04-15T16:50:06-0400
- agent: **OpenAI-Codex**
- branch: **codex/b01-oidc-architecture**
- head: **`7479974`**
- session name: **Align B01 completion metadata**

#### Objective

Sync the completed `B01` roadmap metadata to the actual implementation commit so the todo points at the real committed OIDC architecture baseline.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `B01` now references the actual implementation commit head and final commit timestamp
- kept the target-state document reference in the B01 metadata block and expanded the session-log references to include both the implementation-design entry and this metadata-alignment follow-up

#### Verification

- confirmed the implementation commit hash for the B01 documentation bundle before updating the todo metadata
- limited the follow-up change to roadmap metadata only

#### Follow-up

- start `B02` next by scaffolding `services/oidc` and the first shared auth, identity, and claims contracts against the accepted B01 design

### session: v12

- timestamp: 2026-04-15T19:50:31-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/c01-local-env-and-supabase**
- head: **`7479974`**
- session name: **Local Supabase baseline and env hardening**

#### Objective

Stand up a safe local Supabase-backed Passport development baseline, remove hardcoded third-party configuration from runtime code, and verify the local signup flow still persists users end to end.

#### Actions Taken

- added local Supabase project files under [supabase/config.toml](/Users/botmaster/src/cubid/cubid-passport/supabase/config.toml), [supabase/.gitignore](/Users/botmaster/src/cubid/cubid-passport/supabase/.gitignore), [supabase/migrations/20260331020028_remote_schema.sql](/Users/botmaster/src/cubid/cubid-passport/supabase/migrations/20260331020028_remote_schema.sql), and [supabase/seed.sql](/Users/botmaster/src/cubid/cubid-passport/supabase/seed.sql) so Passport can run safely against a local schema baseline with synthetic seed data
- replaced hardcoded Supabase configuration with env-driven client selection in [apps/passport/lib/supabase.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/supabase.ts) and simplified [apps/passport/pages/api/utils/supabase.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/utils/supabase.ts) to share that configuration
- moved remaining hardcoded Firebase, OwnID, WalletConnect, Worldcoin, Instagram, Fractal, Google Maps, and PII test configuration into env-backed code paths across Passport and Admin, and expanded [apps/passport/.env.example](/Users/botmaster/src/cubid/cubid-passport/apps/passport/.env.example), [apps/admin/.env.example](/Users/botmaster/src/cubid/cubid-passport/apps/admin/.env.example), and [.gitignore](/Users/botmaster/src/cubid/cubid-passport/.gitignore) to support local-only configuration
- fixed [apps/passport/pages/api/v2/create_user.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/v2/create_user.ts) so it only checks existing users against identifiers that were actually supplied, which unblocked local user creation after the schema import
- fixed Passport SSR startup by deferring wallet initialization in [apps/passport/app/layout.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/layout.tsx), [apps/passport/lib/wallet.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/wallet.ts), [apps/passport/config/web3Config.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/config/web3Config.ts), and [apps/passport/app/allow/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/allow/page.tsx) so the login route no longer trips browser-storage access during server render

#### Verification

- started local Supabase and reset the local database against the imported schema and synthetic seed
- ran `pnpm dev` for Passport with local env configuration and confirmed `GET /login 200`
- smoke-tested the login route after the SSR wallet fix and confirmed it still served successfully
- posted to `/api/v2/create_user` with the seeded local dapp and confirmed a new user was returned and persisted in local Postgres via direct `psql` lookup

#### Follow-up

- align `C01` todo metadata to the implementation commit head in a small follow-up commit
- start `C02` next by replacing the generic Supabase CRUD endpoints with typed domain services

### session: v13

- timestamp: 2026-04-15T19:51:37-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/c01-local-env-and-supabase**
- head: **`e68bc6a`**
- session name: **Align C01 completion metadata**

#### Objective

Sync the completed `C01` roadmap metadata to the actual implementation commit so the security-hardening plan points at the correct branch head and session-log references.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `C01` now references the implementation commit head, completion timestamp, active feature branch, and both relevant session-log entries

#### Verification

- confirmed the implementation commit hash for the local Supabase plus env-hardening work before updating the roadmap metadata
- limited the follow-up change to todo metadata alignment only

#### Follow-up

- start `C02` next by replacing the generic Supabase CRUD endpoints with typed domain services

### session: v14

- timestamp: 2026-04-15T20:27:09-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b02-oidc-foundation**
- head: **`e89af74`**
- session name: **Lay down the first OIDC issuer foundation slice**

#### Objective

Implement the first coherent B02 slice by creating the new OIDC service workspace, extracting the initial shared auth, identity, and claims contracts, and adding the backing Supabase schema needed for client registration and future authorization state.

#### Actions Taken

- added [packages/auth](/Users/botmaster/src/cubid/cubid-passport/packages/auth/package.json), [packages/identity](/Users/botmaster/src/cubid/cubid-passport/packages/identity/package.json), and [packages/claims](/Users/botmaster/src/cubid/cubid-passport/packages/claims/package.json) as the first shared platform packages for PKCE and OIDC request contracts, pairwise-subject plus consent derivation, and Cubid scope plus claim metadata, each with focused unit tests
- added the new [services/oidc](/Users/botmaster/src/cubid/cubid-passport/services/oidc/package.json) workspace with typed runtime config, Supabase service-role access, discovery and JWKS endpoints, dynamic client registration plus registration lookup, and explicit `501` placeholders for the remaining protocol endpoints so later B02 slices can fill them in against a stable service boundary
- added [supabase/migrations/20260416001000_oidc_foundation.sql](/Users/botmaster/src/cubid/cubid-passport/supabase/migrations/20260416001000_oidc_foundation.sql) to persist OIDC clients, signing keys, human subjects, sessions, authorization codes, refresh tokens, device codes, consents, and audit logs locally in Supabase
- updated [package.json](/Users/botmaster/src/cubid/cubid-passport/package.json) to expose root `dev:oidc` and `start:oidc` workflows, and refreshed [pnpm-lock.yaml](/Users/botmaster/src/cubid/cubid-passport/pnpm-lock.yaml) for the new workspaces
- fixed the initial compile issues in the new workspaces by making the claims metadata readonly-safe and moving the new package plus service tsconfigs to `moduleResolution: "bundler"`

#### Verification

- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/identity test`
- `pnpm --filter @cubid/claims test`
- `pnpm --filter @cubid/auth typecheck`
- `pnpm --filter @cubid/identity typecheck`
- `pnpm --filter @cubid/claims typecheck`
- `pnpm --filter @cubid/oidc build`
- editor diagnostics for the new B02 files return no remaining errors

#### Follow-up

- implement the real `/authorize` and Passport handoff flow next, including OTP bootstrap for first-time Cubid users who verify email or phone inside the OIDC login journey
- add token issuance, consent persistence, and JWKS-backed signing once the login challenge contract is wired through Passport

### session: v15

- timestamp: 2026-04-16T00:38:44-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b02-oidc-foundation**
- head: **`bad7b87`**
- session name: **Add authorize and interaction challenge flow**

#### Objective

Extend B02 past the service skeleton by validating `/authorize` requests, persisting authorization challenge state, and exposing the Passport-facing interaction endpoints needed to complete login and consent in later UI slices.

#### Actions Taken

- added [services/oidc/src/authorize.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/authorize.ts) to validate authorization requests, enforce exact redirect and scope rules plus PKCE `S256`, persist login and consent challenge state, resolve or create Cubid users from verified email or phone login results, create issuer sessions, reuse or create consent grants, and issue authorization codes after consent approval
- updated [services/oidc/src/app.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/app.ts) so `/authorize` now redirects into Passport login challenges and the service now exposes `GET /interaction/login/:challenge`, `POST /interaction/login/:challenge/complete`, `GET /interaction/consent/:challenge`, `POST /interaction/consent/:challenge/approve`, and `POST /interaction/consent/:challenge/reject`
- updated [services/oidc/src/index.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/index.ts) and [services/oidc/package.json](/Users/botmaster/src/cubid/cubid-passport/services/oidc/package.json) to export the new authorize helpers and run real service tests instead of the earlier placeholder test command
- added [services/oidc/src/authorize.test.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/authorize.test.ts) to cover prompt parsing, scope parsing, and authorization redirect helpers
- added [supabase/migrations/20260416004000_oidc_authorization_requests.sql](/Users/botmaster/src/cubid/cubid-passport/supabase/migrations/20260416004000_oidc_authorization_requests.sql) to persist authorization request and challenge lifecycle state separately from sessions and authorization codes

#### Verification

- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc build`

#### Follow-up

- wire Passport login and allow UI to these new interaction endpoints so OTP verification can complete login challenges and consent grants in-browser
- implement `/token` so the issued authorization codes can be exchanged for signed ID and access tokens

### session: v16

- timestamp: 2026-04-16T00:38:44-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b02-oidc-foundation**
- head: **`c751aac`**
- session name: **Bridge Passport login and consent to OIDC challenges**

#### Objective

Connect the existing Passport login and allow pages to the new OIDC interaction endpoints so OIDC browser flows can reuse verified email and phone login instead of waiting for a full UI rewrite.

#### Actions Taken

- updated [apps/passport/app/login/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/login/page.tsx) to detect `login_challenge`, load the challenge from the OIDC service, adjust the page copy for relying-party login, and complete the login challenge after successful OwnID email login or Firebase phone OTP verification before redirecting back into the OIDC flow
- updated [apps/passport/app/allow/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/allow/page.tsx) to detect `consent_challenge`, bypass the legacy dapp allow flow when present, fetch the requested scopes and claims from the OIDC service, and expose approve or deny actions that redirect back through the issuer challenge lifecycle
- updated [apps/passport/.env.example](/Users/botmaster/src/cubid/cubid-passport/apps/passport/.env.example) with `NEXT_PUBLIC_OIDC_ORIGIN` so Passport can call the OIDC service explicitly in local and deployed environments

#### Verification

- editor diagnostics for the touched Passport files report no errors
- `pnpm --filter @cubid/passport typecheck` still fails, but only in pre-existing unrelated files [apps/passport/components/stamps/index.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/stamps/index.tsx) and [apps/passport/config/web3Config.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/config/web3Config.ts); no new type errors were reported in the OIDC bridge files

#### Follow-up

- implement `/token` and signing-key-backed JWT issuance so the browser authorization flow can complete the final OAuth exchange
- add a dedicated Passport OIDC consent UI later if the new challenge branch needs richer disclosure text than the current minimal bridge screen

### session: v17

- timestamp: 2026-04-16T00:56:56-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b03-claims-registry**
- head: **`c3343c1`**
- session name: **Lay down the B03 registry foundation**

#### Objective

Start B03 by splitting the oversized roadmap item into concrete execution slices, then implement the first coherent slice: Supabase persistence for the claim registry and threshold-based identity-depth policies plus the shared claim package contracts those later Admin APIs and screens will consume.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) to mark `B03` started on `codex/b03-claims-registry` and split it into `B03.1`, `B03.2`, and `B03.3` so schema and shared contracts can land independently from the later Admin API and UI work
- extended [packages/claims/src/index.ts](/Users/botmaster/src/cubid/cubid-passport/packages/claims/src/index.ts) with registry-first shared types for claim records, threshold-based identity-depth policies, client claim-policy bindings, seeded registry overlays, and simple threshold satisfaction helpers while keeping the existing static claim taxonomy as the seed source of truth
- expanded [packages/claims/src/index.test.ts](/Users/botmaster/src/cubid/cubid-passport/packages/claims/src/index.test.ts) to cover the new seeded registry overlays and threshold helper behavior
- added [supabase/migrations/20260416011000_claim_registry_foundation.sql](/Users/botmaster/src/cubid/cubid-passport/supabase/migrations/20260416011000_claim_registry_foundation.sql) to create `oidc_claim_registry`, `oidc_identity_depth_policies`, and `oidc_client_claim_policy_bindings`, seed the built-in OIDC and Cubid claims into the registry table, and support soft-archived binding replacement through a partial unique index

#### Verification

- `pnpm --filter @cubid/claims test`
- `pnpm --filter @cubid/claims typecheck`
- editor diagnostics for the touched claims package files and new migration report no errors

#### Follow-up

- implement `B03.2` next by adding Admin repositories and authenticated API routes for claim definitions, threshold policies, and client bindings
- keep `services/oidc` out of scope until the registry-first Admin control plane exists and the schema settles

### session: v18

- timestamp: 2026-04-16T00:57:36-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b03-claims-registry**
- head: **`47352af`**
- session name: **Align B03.1 completion metadata**

#### Objective

Sync the new `B03.1` roadmap metadata to the actual implementation commit so the first claim-registry slice references the real branch head and completion point.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `B03.1` now references the implementation commit head and completion timestamp while leaving the parent `B03` item marked in progress for the later API and UI slices
- updated the in-progress `B03` metadata to point at the current branch head after the foundation commit and expanded its session references to include the metadata alignment follow-up

#### Verification

- confirmed the implementation commit hash for the B03.1 foundation slice before updating the roadmap metadata
- limited the follow-up change to roadmap metadata alignment only

#### Follow-up

- implement `B03.2` next by adding Admin repositories and authenticated API routes for claims, threshold policies, and client bindings

### session: v19

- timestamp: 2026-04-16T08:33:45-04:00
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b03-claims-registry**
- head: **`dd5f286`**
- session name: **Add Admin APIs for the claim registry**

#### Objective

Implement the B03.2 control-plane slice by adding authenticated Admin repositories and POST-only API routes for OIDC claim definitions, threshold-based identity-depth policies, client claim-policy bindings, and the metadata that the later B03.3 UI will need.

#### Actions Taken

- added [apps/admin/lib/server/oidcPolicyRegistry.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/lib/server/oidcPolicyRegistry.ts) as the shared Admin repository layer for listing, creating, updating, and archiving claim-registry records, identity-depth policies, client claim-policy bindings, and OIDC client metadata while validating scopes, protecting seeded claims, and checking live client and policy references
- added POST-only Admin routes under [apps/admin/pages/api/admin/oidc/claims/list.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/claims/list.ts), [apps/admin/pages/api/admin/oidc/claims/upsert.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/claims/upsert.ts), [apps/admin/pages/api/admin/oidc/claims/archive.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/claims/archive.ts), [apps/admin/pages/api/admin/oidc/policies/list.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/policies/list.ts), [apps/admin/pages/api/admin/oidc/policies/upsert.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/policies/upsert.ts), [apps/admin/pages/api/admin/oidc/policies/archive.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/policies/archive.ts), [apps/admin/pages/api/admin/oidc/bindings/list.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/bindings/list.ts), [apps/admin/pages/api/admin/oidc/bindings/upsert.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/bindings/upsert.ts), [apps/admin/pages/api/admin/oidc/bindings/archive.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/bindings/archive.ts), and [apps/admin/pages/api/admin/oidc/metadata.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/pages/api/admin/oidc/metadata.ts)
- updated [apps/admin/package.json](/Users/botmaster/src/cubid/cubid-passport/apps/admin/package.json) to depend on `@cubid/claims` and refreshed [pnpm-lock.yaml](/Users/botmaster/src/cubid/cubid-passport/pnpm-lock.yaml) so the Admin workspace can compile against the shared B03.1 contracts instead of duplicating them locally

#### Verification

- `pnpm install --filter @cubid/admin...`
- `pnpm --filter @cubid/admin typecheck`
- editor diagnostics for the new Admin OIDC repository helper and metadata route report no errors

#### Follow-up

- implement `B03.3` next by adding an Admin UI surface that consumes the new OIDC metadata, claims, policies, and bindings endpoints
- keep `services/oidc` out of this slice so registry management stabilizes before runtime claim evaluation is wired in

### session: v20

- timestamp: 2026-04-16T08:34:52-04:00
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b03-claims-registry**
- head: **`b66a8ba`**
- session name: **Align B03.2 completion metadata**

#### Objective

Sync the B03 and B03.2 roadmap metadata to the implementation commit that landed the Admin OIDC registry APIs so the todo state points at the actual finished slice.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `B03.2` is marked completed with the implementation commit head and completion timestamp
- updated the parent `B03` metadata to point at the latest branch head after landing the Admin API slice and expanded its session references to include the metadata follow-up

#### Verification

- confirmed the post-commit branch head and clean working tree before editing roadmap metadata
- limited the follow-up change to metadata alignment only

#### Follow-up

- implement `B03.3` next by adding the Admin UI on top of the new OIDC registry API surface

### session: v21

- timestamp: 2026-04-16T08:40:18-04:00
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b03-claims-registry**
- head: **`824dc5d`**
- session name: **Add the Admin claim-registry UI**

#### Objective

Implement the B03.3 UI slice by extending the Admin tab shell with a usable claim and policy console that consumes the B03.2 APIs for registry claims, threshold policies, and client bindings.

#### Actions Taken

- updated [apps/admin/app/admin/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/admin/app/admin/page.tsx) to add a dedicated `Claims & Policies` tab inside the existing Admin shell instead of introducing a separate route surface
- extended [apps/admin/app/admin/shared.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/app/admin/shared.ts) with client-side OIDC registry payload types so the new screen can consume the B03.2 metadata and binding responses without duplicating ad hoc shapes
- added [apps/admin/app/admin/oidcRegistry.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/admin/app/admin/oidcRegistry.tsx) to render the registry dashboard, active-claim and policy summaries, editable claim forms, editable threshold-policy forms, editable client-binding forms, and the list tables backed by the new OIDC Admin endpoints

#### Verification

- `pnpm --filter @cubid/admin typecheck`
- editor diagnostics for the new Admin OIDC registry screen and its updated shared types report no errors

#### Follow-up

- decide whether the next highest-leverage step is returning to `B02` token and userinfo work or starting `B04` passkeys now that the Admin control plane exists

### session: v22

- timestamp: 2026-04-16T08:41:42-04:00
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b03-claims-registry**
- head: **`ffe1ad2`**
- session name: **Align B03 completion metadata**

#### Objective

Sync the roadmap metadata to the implementation commit that finished the Admin claim-registry UI and mark the overall B03 control-plane todo completed now that the schema, APIs, and UI slices have all landed.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `B03.3` is marked completed with the UI implementation commit head and completion timestamp
- marked the parent `B03` todo completed because the registry schema, Admin APIs, and Admin UI slices are all now landed on the same feature branch

#### Verification

- confirmed the post-commit branch head and clean working tree before editing roadmap metadata
- limited the follow-up change to metadata alignment only

#### Follow-up

- return to `B02` next and finish `/token`, JWT issuance, and `/userinfo` now that the Admin-side registry control plane exists

### session: v23

- timestamp: 2026-04-16T09:13:10-04:00
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core**
- head: **`af54cd3`**
- session name: **Lay down the B04 passkey foundation**

#### Objective

Start B04 by splitting the broad passkey todo into coherent delivery slices, then implement the first foundation slice: WebAuthn persistence in Supabase plus shared auth contracts for passkey ceremonies and user-handle encoding that later OIDC and Passport work will consume.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) to mark `B04` started on `codex/b04-passkeys-core` and split it into `B04.1` through `B04.4` so schema, OIDC backend, Passport UX, and later lifecycle follow-ups can land independently
- added [supabase/migrations/20260416020000_webauthn_foundation.sql](/Users/botmaster/src/cubid/cubid-passport/supabase/migrations/20260416020000_webauthn_foundation.sql) to create `oidc_webauthn_credentials`, `oidc_webauthn_challenges`, and the session-to-credential link needed for passkey-backed OIDC sessions
- extended [packages/auth/src/index.ts](/Users/botmaster/src/cubid/cubid-passport/packages/auth/src/index.ts) with passkey authentication-method constants, typed WebAuthn challenge and credential contracts, and reusable helpers to encode and decode the Cubid WebAuthn user handle
- expanded [packages/auth/src/index.test.ts](/Users/botmaster/src/cubid/cubid-passport/packages/auth/src/index.test.ts) to cover the new base64url decoding and WebAuthn user-handle helpers

#### Verification

- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/auth typecheck`
- editor diagnostics for the touched auth package files, roadmap file, and new migration report no errors

#### Follow-up

- implement `B04.2` next by adding OIDC-service-owned passkey challenge issuance, verification, and login-challenge completion flows
- keep the first passkey delivery global to the Cubid account and leave rich device lifecycle management and ACR step-up for the later `B04.4` follow-up

### session: v24

- timestamp: 2026-04-16T09:14:45-04:00
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core**
- head: **`83587e9`**
- session name: **Align B04.1 foundation metadata**

#### Objective

Sync the new B04 roadmap metadata to the implementation commit that landed the WebAuthn schema and shared auth contracts so the first passkey slice references the real completion point.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `B04.1` is marked completed with the foundation commit head and completion timestamp
- updated the in-progress `B04` parent metadata to point at the latest branch head after the foundation slice and expanded its session references to include the alignment follow-up

#### Verification

- confirmed the post-commit branch head and clean working tree before editing roadmap metadata
- limited the follow-up change to metadata alignment only

#### Follow-up

- implement `B04.2` next by adding OIDC-service-owned passkey challenge issuance, verification, and login-challenge completion flows

### session: v25

- timestamp: 2026-04-16T09:34:26-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core**
- head: **`e2ab34b`**
- session name: **Add the OIDC passkey ceremony backend**

#### Objective

Implement `B04.2` by adding issuer-owned WebAuthn challenge and verification flows for passkey authentication and registration, while reusing the existing login-challenge completion path for passkey-backed OIDC sessions.

#### Actions Taken

- added [services/oidc/src/passkeys.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/passkeys.ts) as the OIDC-owned WebAuthn backend for authentication challenge issuance, registration challenge issuance, challenge consumption, credential verification, credential persistence, and audit logging
- updated [services/oidc/src/authorize.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/authorize.ts) to expose a reusable subject-based login completion helper so passkey authentication can feed the existing consent and redirect flow without duplicating OIDC session logic
- extended [services/oidc/src/app.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/app.ts), [services/oidc/src/index.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/index.ts), [services/oidc/src/config.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/config.ts), and [services/oidc/.env.example](/Users/botmaster/src/cubid/cubid-passport/services/oidc/.env.example) with passkey routes, passkey RP configuration derived from Passport origin, exported backend APIs, and the environment contract for core WebAuthn delivery
- added [services/oidc/src/passkeys.test.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/passkeys.test.ts), updated [services/oidc/package.json](/Users/botmaster/src/cubid/cubid-passport/services/oidc/package.json), refreshed [pnpm-lock.yaml](/Users/botmaster/src/cubid/cubid-passport/pnpm-lock.yaml), and updated [docs/engineering/login-with-cubid-oidc-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/login-with-cubid-oidc-architecture.md) so the backend slice ships with focused config tests, an explicit WebAuthn server dependency, and durable architecture notes about Passport-hosted RP identity

#### Verification

- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/oidc typecheck`
- editor diagnostics for the touched OIDC files report no errors

#### Follow-up

- align the `B04.2` roadmap metadata to the implementation commit that lands this backend slice
- implement `B04.3` next by wiring Passport login and recovery UX to the new OIDC passkey routes and removing the localStorage-backed hidden auth state assumptions

### session: v26

- timestamp: 2026-04-16T09:37:16-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core**
- head: **`1a36f1f`**
- session name: **Align B04.2 completion metadata**

#### Objective

Sync the roadmap metadata to the implementation commit that landed the OIDC passkey ceremony backend so the B04.2 slice and the parent B04 item reference the actual branch head.

#### Actions Taken

- updated [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) so `B04.2` is marked completed with the implementation commit head and completion timestamp
- updated the parent `B04` metadata to point at the latest branch head after landing the OIDC passkey backend slice and expanded its session references to include the metadata alignment follow-up

#### Verification

- confirmed the post-commit branch head and clean working tree before editing roadmap metadata
- limited the follow-up change to metadata alignment only

#### Follow-up

- implement `B04.3` next by wiring Passport login and recovery UX to the new OIDC passkey routes and reducing the localStorage-backed auth state assumptions in Passport

### session: v27

- timestamp: 2026-04-16T10:10:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`3796ffb`**
- session name: **Fix nullable NEAR wallet access in Passport**

#### Objective

Address the Passport typecheck and build failure caused by calling NEAR wallet methods through a nullable singleton reference inside the stamps UI.

#### Actions Taken

- updated [apps/passport/components/stamps/index.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/stamps/index.tsx) to narrow the imported NEAR wallet once, read `accountId` through a guarded local value, and only call `viewMethod`, `signOut`, or `signIn` after a real runtime check

#### Verification

- `pnpm --dir apps/passport typecheck` now clears the wallet-related errors and only fails on the separate `config/web3Config.ts` connector typing issue
- `pnpm --dir apps/passport build` previously failed at the same wallet call site and no longer reports that component error before reaching the remaining connector typing failure

#### Follow-up

- fix the wagmi connector typing error in [apps/passport/config/web3Config.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/config/web3Config.ts) as the second follow-up commit

### session: v28

- timestamp: 2026-04-16T10:16:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`19b1d1c`**
- session name: **Fix Passport wagmi connector typing**

#### Objective

Address the remaining Passport typecheck failure by constructing the wagmi connector list without mutating a narrowly inferred connector tuple.

#### Actions Taken

- updated [apps/passport/config/web3Config.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/config/web3Config.ts) to build the connector list in one typed expression, conditionally including `walletConnect` only when the browser and WalletConnect project id are both available

#### Verification

- `pnpm --dir apps/passport typecheck`
- `CI=1 pnpm typecheck`

#### Follow-up

- address the root Vercel preview build mismatch as the third separate follow-up commit

### session: v29

- timestamp: 2026-04-16T10:24:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`e5ddd9c`**
- session name: **Restore root Vercel monorepo deployment config**

#### Objective

Address the preview deployment failures caused by Vercel building from the monorepo root after Passport moved into `apps/passport`.

#### Actions Taken

- added [vercel.json](/Users/botmaster/src/cubid/cubid-passport/vercel.json) at the repo root so root-based Vercel projects install with `pnpm`, build the Passport app from `apps/passport`, and retain the existing Passport API cron and header settings that were previously only defined in the app-local Vercel config

#### Verification

- `pnpm --dir apps/passport build`
- confirmed [vercel.json](/Users/botmaster/src/cubid/cubid-passport/vercel.json) has no editor diagnostics

#### Follow-up

- push the follow-up branch and re-check remote PR status, noting that the separate `cubid-passport` blocked-account deployment remains an external Vercel account issue

### session: v30

- timestamp: 2026-04-16T10:37:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`64c29e3`**
- session name: **Make passkey challenge consumption atomic**

#### Objective

Address the PR review finding that concurrent passkey completions could reuse the same WebAuthn challenge.

#### Actions Taken

- updated [services/oidc/src/passkeys.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/passkeys.ts) so `consumeChallenge` now updates only rows whose `consumed_at` is still null, selects the updated row, and returns a typed challenge-not-found error when a completion races with an already-consumed challenge

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `CI=1 pnpm typecheck`

#### Follow-up

- address the nullable registration `user_handle` review comment in the passkey registration path next

### session: v31

- timestamp: 2026-04-16T10:42:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`15c3fcb`**
- session name: **Guard passkey registration user handles**

#### Objective

Address the PR review finding that a malformed or legacy registration challenge with a null `user_handle` could crash the credential insert path.

#### Actions Taken

- updated [services/oidc/src/passkeys.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/passkeys.ts) to require a non-empty challenge `user_handle` before parsing or persisting a registration result, and to raise a typed `invalid_request` error when the registration challenge is structurally incomplete

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `CI=1 pnpm typecheck`

#### Follow-up

- address the remaining Passport-side review comments around Worldcoin env guarding, Firebase initialization safety, and WagmiConfig readiness

### session: v32

- timestamp: 2026-04-16T10:49:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`3c70fa9`**
- session name: **Guard Worldcoin configuration paths**

#### Objective

Address the PR review findings that Passport could launch or configure a broken Worldcoin auth flow when required environment variables were missing.

#### Actions Taken

- updated [apps/passport/components/stamps/index.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/components/stamps/index.tsx) to build the Worldcoin authorize URL only when both required public env vars are present, disable the connect button otherwise, and show a clear UI hint instead of redirecting into a broken flow
- updated [apps/passport/pages/api/auth/[...nextauth].ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/pages/api/auth/[...nextauth].ts) to validate the required Worldcoin provider env vars up front and fail fast with a clear configuration error before NextAuth constructs the provider

#### Verification

- `pnpm --dir apps/passport typecheck`
- `pnpm --dir apps/passport build`

#### Follow-up

- address the Firebase initialization review comment next

### session: v33

- timestamp: 2026-04-16T10:56:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`8526e1b`**
- session name: **Fail fast on missing Firebase env**

#### Objective

Address the PR review finding that Passport initialized Firebase even when required public Firebase env vars were missing, which would otherwise fail later with confusing auth/runtime errors.

#### Actions Taken

- updated [apps/passport/lib/firebase.ts](/Users/botmaster/src/cubid/cubid-passport/apps/passport/lib/firebase.ts) to validate the required Firebase env vars before calling `initializeApp`, and to raise a clear configuration error listing any missing keys

#### Verification

- `pnpm --dir apps/passport typecheck`
- `pnpm --dir apps/passport build`

#### Follow-up

- address the WagmiConfig and WalletConnect readiness review comment on the allow page next

### session: v34

- timestamp: 2026-04-16T11:03:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`9481b19`**
- session name: **Stabilize allow-page Wagmi setup**

#### Objective

Address the PR review finding that the allow page rendered `WagmiConfig` with a null config during the initial render and initialized WalletConnect even when its project id was absent.

#### Actions Taken

- updated [apps/passport/app/allow/page.tsx](/Users/botmaster/src/cubid/cubid-passport/apps/passport/app/allow/page.tsx) to use the shared Passport wagmi config synchronously instead of a null-first local state, and to initialize Web3Modal only when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is actually configured

#### Verification

- `pnpm --dir apps/passport typecheck`
- `pnpm --dir apps/passport build`

#### Follow-up

- push the follow-up branch again and re-check whether any additional review comments remain outstanding

### session: v35

- timestamp: 2026-04-16T11:18:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`0842e9b`**
- session name: **Require UV for passkey auth challenges**

#### Objective

Address the PR review finding that passkey authentication requested user verification as only preferred while later requiring user verification during assertion verification.

#### Actions Taken

- updated [services/oidc/src/passkeys.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/passkeys.ts) so passkey authentication challenges now request `userVerification: "required"` and persist the same requirement in the challenge row, keeping challenge generation aligned with the downstream verification policy

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `CI=1 pnpm typecheck`

#### Follow-up

- apply the same Firebase environment hardening in Admin that was already added for Passport

### session: v36

- timestamp: 2026-04-16T11:23:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`557c00c`**
- session name: **Validate Admin Firebase env**

#### Objective

Address the PR review finding that Admin initialized Firebase even when the required public Firebase environment variables were missing.

#### Actions Taken

- updated [apps/admin/lib/firebase.ts](/Users/botmaster/src/cubid/cubid-passport/apps/admin/lib/firebase.ts) to validate the required Firebase env vars before `initializeApp`, mirroring the fail-fast guard already added in Passport and surfacing a clear configuration error when keys are missing

#### Verification

- `pnpm --filter @cubid/admin typecheck`
- `CI=1 pnpm typecheck`

#### Follow-up

- replace the broken absolute local filesystem doc link with a repo-relative link so the architecture reference works on GitHub

### session: v37

- timestamp: 2026-04-16T11:27:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`a78aa48`**
- session name: **Fix architecture doc link path**

#### Objective

Address the PR review finding that the monorepo operating-model document linked to the OIDC architecture spec using an absolute local filesystem path.

#### Actions Taken

- updated [docs/engineering/monorepo-operating-model.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/monorepo-operating-model.md) to replace the broken `/Users/...` link target with a repo-relative markdown link to `login-with-cubid-oidc-architecture.md`

#### Verification

- reviewed the rendered markdown target path to confirm it is repository-relative and GitHub-safe

#### Follow-up

- push the follow-up branch, open the follow-up PR, then reply to and resolve all fully addressed review threads on PR 144

### session: v38

- timestamp: 2026-04-17T20:13:05-0400
- agent: **OpenAI-Codex**
- branch: **codex/b04-passkeys-core-followups**
- head: **`c66e3a7`**
- session name: **Assess Section B and harden OIDC relying-party todos**

#### Objective

Assess the current Section B implementation state and update the roadmap so the unfinished TCOIN relying-party loop is explicit before more Login with Cubid work proceeds.

#### Actions Taken

- reviewed [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md), Section B session-log entries, and [services/oidc/src/app.ts](/Users/botmaster/src/cubid/cubid-passport/services/oidc/src/app.ts) to confirm the current issuer state
- documented that `B01` and `B03` are complete, `B04` has backend passkey foundations, and `B02` remains the main production blocker because `/token` and `/userinfo` still return explicit `501` placeholders
- split the broad `B02` roadmap into completed foundation slices plus new not-started blockers for the TCOIN Authorization Code + PKCE token loop, issuer deployment/client configuration, and production controls such as revocation, logout, rate limits, and observability

#### Verification

- documentation-only pass; no runtime validation was required
- confirmed the specific current gap in `services/oidc/src/app.ts` where `/token` and `/userinfo` remain unimplemented

#### Follow-up

- implement `B02.3` next before treating Login with Cubid as usable by TCOIN or any other relying party

### session: v39

- timestamp: 2026-04-17T20:35:00-0400
- agent: **GitHub Copilot (GPT-5.4)**
- branch: **codex/b04-passkeys-core-followups**
- head: **`eba125d`**
- session name: **Fix shared package test discovery globs**

#### Objective

Address the PR 145 CI failure where shared package tests passed locally in zsh but failed under the workspace test runner because `src/**/*.test.ts` did not match top-level test files reliably.

#### Actions Taken

- updated [packages/auth/package.json](/Users/botmaster/src/cubid/cubid-passport/packages/auth/package.json), [packages/claims/package.json](/Users/botmaster/src/cubid/cubid-passport/packages/claims/package.json), and [packages/identity/package.json](/Users/botmaster/src/cubid/cubid-passport/packages/identity/package.json) to replace the shell-sensitive `src/**/*.test.ts` pattern with `src/*.test.ts` so the shared package test scripts discover the existing top-level test files consistently in CI

#### Verification

- `npx -y -p node@20 -p pnpm@10 pnpm --dir /Users/botmaster/src/cubid/cubid-passport --filter @cubid/auth test`
- `npx -y -p node@20 -p pnpm@10 pnpm --dir /Users/botmaster/src/cubid/cubid-passport --filter @cubid/claims test`
- `npx -y -p node@20 -p pnpm@10 pnpm --dir /Users/botmaster/src/cubid/cubid-passport --filter @cubid/identity test`
- `npx -y -p node@20 -p pnpm@10 pnpm --dir /Users/botmaster/src/cubid/cubid-passport exec turbo run test --ui=stream`

#### Follow-up

- re-run PR 145 CI and confirm the `validate` check goes green now that the shared package test scripts no longer depend on the failing glob form

### session: v40

- timestamp: 2026-04-19T21:43:28-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`fe48a9e`**
- session name: **Implement OIDC relying-party completion**

#### Objective

Complete the backend TCOIN relying-party loop for `B02.3`, repo-side issuer readiness for `B02.4`, and issuer-side controls for `B02.5` without performing live deployment work.

#### Actions Taken

- replaced the `/token` and `/userinfo` placeholders with Authorization Code + PKCE exchange, signed JWT issuance, access-token persistence, userinfo validation, and consent-scoped claim release
- added env-backed private JWK signing, active JWKS derivation, token revocation, logout session revocation, DB-backed rate-limit buckets, and structured audit events for the new issuer paths
- added OIDC token-control migrations, TCOIN seed configuration, expanded `.env.example`, and a repo-readiness doc for staging/production issuer setup
- split Passport consent revocation UI and richer Admin issuer operations views into `B02.5.1` because the backend issuer controls landed here but the authenticated product surfaces should be a separate security-sensitive slice

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/oidc build`

#### Follow-up

- update todo metadata with the resulting commit hash after this implementation commit lands
- implement `B02.5.1` before broad production launch so users and operators have first-class consent and client operations surfaces

### session: v41

- timestamp: 2026-04-19T21:46:40-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`41206f4`**
- session name: **Close B02.3 through B02.5 metadata**

#### Objective

Record the actual implementation commit hash for the B02.3, B02.4, and B02.5 todos after the OIDC relying-party completion commit landed.

#### Actions Taken

- marked `B02.3`, `B02.4`, and `B02.5` completed in [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md)
- updated each completed todo with the implementation head `41206f4` and session-log references

#### Verification

- metadata-only follow-up; implementation validation is recorded in `session: v40`

#### Follow-up

- implement `B02.5.1` next to add authenticated Passport consent revocation and richer Admin issuer operations views

### session: v42

- timestamp: 2026-04-20T02:54:09-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`a38b071`**
- session name: **Fix OIDC CI test glob**

#### Objective

Address the PR 146 `validate` CI failure where `@cubid/oidc` tests failed because CI passed the literal `src/**/*.test.ts` path to `tsx`.

#### Actions Taken

- updated [services/oidc/package.json](/Users/botmaster/src/cubid/cubid-passport/services/oidc/package.json) to use `src/*.test.ts`, matching the existing top-level OIDC test layout and the prior shared-package CI glob fix

#### Verification

- `pnpm --filter @cubid/oidc test`
- `pnpm test`

#### Follow-up

- push the fix and re-check PR 146 CI after the required polling interval

### session: v45

- timestamp: 2026-04-20T03:16:27-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`99c7326`**
- session name: **Fix Vercel monorepo Next autodetection**

#### Objective

Address the PR 146 Vercel deployment failures where legacy Vercel projects still build from the monorepo root and fail before running the configured Passport build command because the root package does not expose a Next.js dependency.

#### Actions Taken

- added root-level Next/React dev dependencies as a Vercel compatibility shim while the preferred long-term Vercel monorepo configuration remains setting each project Root Directory to `apps/passport`
- refreshed the lockfile through `pnpm`

#### Verification

- `npx --yes vercel inspect dpl_E2aQ5C8LpVoCEPnB9kdgYvd6Hzs3 --logs`
- `npx --yes vercel inspect dpl_AFJoKb93KERz8FZPqP2LHLZ4FhfJ --logs`
- `npx --yes vercel build --yes` progressed past Next autodetection and reached the Passport app build

#### Follow-up

- push the compatibility shim and re-check Vercel preview statuses after deployment reruns

### session: v46

- timestamp: 2026-04-20T03:22:59-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`02dfd5a`**
- session name: **Allow Vercel preview public env placeholders**

#### Objective

Address the PR 146 Vercel deployment failures where Passport preview deployments do not have public Firebase and Supabase build environment configured, causing prerender to fail before previews can be created.

#### Actions Taken

- updated Passport Firebase initialization to allow non-secret placeholder public config only in CI or non-production Vercel preview builds
- updated Passport Supabase initialization to allow non-secret placeholder URL/key config only in CI or non-production Vercel preview builds
- preserved production fail-fast behavior when required Firebase or Supabase configuration is absent

#### Verification

- pending before commit: `pnpm --filter @cubid/passport build`

#### Follow-up

- push the preview-env fallback and re-check Vercel preview statuses after deployment reruns

### session: v52

- timestamp: 2026-04-20T13:52:22-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-5-1-oidc-ops**
- head: **`230a203`**
- session name: **Complete B02.5.1 metadata**

#### Objective

Mark B02.5.1 completed after the implementation commit and record the resulting task head in the roadmap metadata.

#### Actions Taken

- updated B02.5.1 status, completion timestamp, head, and session-log references in `agent-context/todo.md`

#### Verification

- metadata-only update following the validated implementation commit

#### Follow-up

- open a PR for `codex/b02-5-1-oidc-ops` when ready

### session: v55

- timestamp: 2026-04-20T16:37:55-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-5-1-oidc-ops**
- head: **`d327279`**
- session name: **Address PR 147 review comments**

#### Objective

Address PR 147 Copilot review comments around Passport consent revocation audit correlation, scalable Admin OIDC Ops aggregate counts, and Admin operator error visibility, while also fixing the suppressed Profile email/phone loading bug.

#### Actions Taken

- added Passport request ID generation from `x-request-id` or a `passport_` UUID fallback, returned it as `X-Request-Id`, and persisted it on `consent.revoked` audit rows
- added a Supabase `get_oidc_ops_client_counts` RPC migration and switched Admin Ops active consent/token counts to the aggregate RPC instead of full-row scans
- updated Admin OIDC Ops to surface API-provided Axios `error` or `message` payloads before falling back to generic toast text
- fixed the Profile comma-operator guard and wallet lookup call so email-only users can load wallet profile data correctly

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

#### Follow-up

- push the review-response commit, comment with the solutions, resolve the Copilot threads, and continue the requested Codex review loop on PR 147

### session: v56

- timestamp: 2026-04-20T16:50:11-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-5-1-oidc-ops**
- head: **`5c57dd6`**
- session name: **Address Codex connector review comments**

#### Objective

Address the Codex connector review comments on PR 147 covering capped OIDC Ops metrics and duplicate consent revocation audit events.

#### Actions Taken

- moved Admin OIDC Ops 7-day token/userinfo metrics to a dedicated `get_oidc_ops_client_metrics` aggregate RPC so counters are no longer derived from the 200-row recent audit display query
- added a supporting audit-log index and Admin unit coverage for metric row normalization
- changed Passport consent revocation to return the existing revoked timestamp without revoking tokens or writing a new `consent.revoked` audit event when the consent is already revoked

#### Verification

- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

#### Follow-up

- push the Codex review-response commit, reply to and resolve the Codex connector threads, and re-check PR 147 CI

### session: v51

- timestamp: 2026-04-20T13:50:52-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-5-1-oidc-ops**
- head: **`bd828d4`**
- session name: **Implement B02.5.1 OIDC consent and ops surfaces**

#### Objective

Implement the B02.5.1 Ops v1 slice with authenticated Passport consent management, Admin OIDC operations visibility and controls, and issuer userinfo failure audit logging.

#### Actions Taken

- added Passport server-only Firebase/Supabase helpers plus consent list and revoke API routes
- added a Login with Cubid access panel to the Passport Profile screen
- added Admin OIDC Ops overview and update APIs for client visibility, rate-limit tier changes, and suspend/reactivate controls
- added an Admin OIDC Ops tab with client metrics, redirect URI visibility, bindings, and recent audit events
- added `userinfo.failed` audit logging in the OIDC issuer without changing external error responses
- updated OIDC readiness and architecture docs for the new Passport/Admin operations surfaces

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin build`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm typecheck` rerun after the parallel build/typecheck race completed

#### Follow-up

- commit the implementation, then update B02.5.1 completion metadata with the resulting head

### session: v50

- timestamp: 2026-04-20T03:53:28-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`0429043`**
- session name: **Address Codex connector protocol hardening review**

#### Objective

Address the latest Codex connector review comments on PR 146 covering token revocation client ownership, malformed logout token hints, and dynamic registration grant alignment with the implemented token endpoint.

#### Actions Taken

- required `/revoke` requests to authenticate the OAuth client before revoking access or refresh tokens
- constrained token revocation to tokens owned by the authenticated client
- returned a controlled `invalid_request` response for malformed logout `id_token_hint` values
- aligned dynamic client registration defaults and validation with the currently implemented `authorization_code` token grant
- added OIDC unit coverage for revocation input parsing, malformed logout hints, and unsupported registration grants

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

#### Follow-up

- push the review-response commit, comment with the solution, resolve the Codex connector threads, and re-check PR CI

### session: v49

- timestamp: 2026-04-20T03:45:49-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`ded1a13`**
- session name: **Address Codex connector OIDC review**

#### Objective

Address Codex connector review comments on PR 146 covering login-completion trust boundaries and optional post-logout redirect URI registration.

#### Actions Taken

- required Passport hosted login completion to send a Firebase ID token after email or phone authentication
- added OIDC service Firebase SecureToken verification before accepting email or phone identity claims
- rejected request-body Cubid user IDs on login completion so the service no longer trusts caller-supplied internal user identity
- allowed dynamic client registration to omit `post_logout_redirect_uris` while continuing to validate any supplied logout redirect URIs
- added OIDC unit tests for Firebase claim matching and optional post-logout redirect behavior

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm typecheck` rerun serially after build completed
- `pnpm lint`

#### Follow-up

- push the Codex-review fix, comment with the solution, resolve Codex connector threads, and re-check PR CI

### session: v48

- timestamp: 2026-04-20T03:41:07-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`0cbf209`**
- session name: **Address Copilot PR review**

#### Objective

Address Copilot review comments on PR 146 after the branch was marked ready for review and all CI checks were green.

#### Actions Taken

- renamed the Admin rotate-key modal export/import and changed the webhook details side panel close prop to an explicit callback
- fixed Admin JSX SVG attributes and removed the Tailwind CDN script from the Next layout
- added Passport Google Maps and Instagram OAuth configuration guards to avoid silent invalid requests
- replaced absolute README links with repository-relative links
- split `@cubid/auth` contracts into a browser-safe `@cubid/auth/client` subpath while keeping Node-only helpers in the server entrypoint

#### Verification

- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/auth typecheck`
- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

#### Follow-up

- push the review-response commit, comment with the solution, resolve Copilot threads, and continue the requested Codex review loop

### session: v47

- timestamp: 2026-04-20T03:27:31-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`a398130`**
- session name: **Fix Vercel Passport output directory**

#### Objective

Address the PR 146 Vercel deployment failures where Passport now builds successfully from `apps/passport`, but legacy root-based Vercel project settings still look for the Next.js output at the monorepo root `.next` directory.

#### Actions Taken

- updated the root Vercel configuration to set `outputDirectory` to `apps/passport/.next`, matching the existing root `buildCommand`

#### Verification

- `npx --yes vercel inspect dpl_HVAqoTyR4RPjNF3XY34qA9ExYETe --logs`
- `npx --yes vercel build --yes` was attempted locally and progressed through Vercel install/detection, but failed during prerender on a local pulled preview-env `Invalid URL`; the remote Vercel log for `a398130` already showed Passport build completion and failure only on root `.next` output discovery

#### Follow-up

- push the output-directory fix and re-check Vercel preview statuses after deployment reruns

### session: v44

- timestamp: 2026-04-20T03:06:41-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`bf6a72a`**
- session name: **Fix Passport CI Supabase build env**

#### Objective

Address the PR 146 `validate` CI failure where `@cubid/passport` could not prerender because the CI environment did not provide required Supabase build variables.

#### Actions Taken

- added non-secret placeholder Supabase values to the CI validation job so Passport can build in GitHub Actions without relying on local `.env.local`

#### Verification

- pending before commit: `pnpm --filter @cubid/passport build`

#### Follow-up

- push the fix and re-check PR 146 CI after the required polling interval

### session: v43

- timestamp: 2026-04-20T02:59:55-0400
- agent: **OpenAI Codex**
- branch: **codex/b02-relying-party-completion**
- head: **`5a62361`**
- session name: **Fix Admin CI Firebase build env**

#### Objective

Address the PR 146 `validate` CI failure where `@cubid/admin` could not prerender because the CI environment did not provide required public Firebase build variables.

#### Actions Taken

- added non-secret placeholder `NEXT_PUBLIC_FIREBASE_*` values to the CI validation job so Admin can build in GitHub Actions without relying on local `.env.local`

#### Verification

- `pnpm --filter @cubid/admin build`

#### Follow-up

- push the fix and re-check PR 146 CI after the required polling interval

### session: v65

- timestamp: 2026-04-26T18:36:22-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`7656e09`**
- session name: **Adopt shared API security baseline in OIDC**

#### Objective

Move `services/oidc` onto the shared API security baseline by introducing reusable server-side security primitives, adding the generic Admin/Passport security schema, and refitting the OIDC runtime for shared request IDs, shared validation, targeted browser CORS, and normalized rate-limit plumbing without changing OIDC wire semantics.

#### Actions Taken

- added `@cubid/auth/server` helpers for request IDs, CORS decisions, method guards, JSON and `zod` validation, bearer parsing, shared security errors, and a rate-limit adapter interface
- extended `@cubid/config` with optional env and CSV parsing helpers and added a new Supabase migration for `api_rate_limit_buckets` and `api_security_events`
- updated the OIDC runtime config, app router, and rate-limit layer to use shared request IDs, explicit browser-callable CORS policies, shared validation for registration and interaction payloads, and additional route-limit coverage for registration, consent completion, revoke, and logout
- added focused `@cubid/auth` and `@cubid/oidc` tests covering request IDs, error envelopes, CORS allowlists, config parsing, and route-limit denial behavior

#### Verification

- `pnpm install`
- `pnpm --filter @cubid/auth typecheck`
- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`

#### Follow-up

- commit the OIDC baseline slice, then migrate Admin routes onto the same shared contract in `C03.3`

### session: v66

- timestamp: 2026-04-26T18:27:09-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`d7a1afd`**
- session name: **Adopt shared API security baseline in Admin**

#### Objective

Move the Admin API surface onto the shared API security baseline by centralizing request IDs, CORS allowlists, Firebase-backed actor guards, structured error envelopes, route-level rate limiting, and schema-based request validation across all `pages/api/admin/*` handlers without changing success payloads.

#### Actions Taken

- rewrote `apps/admin/lib/server/adminApi.ts` around the shared server-security primitives and added Admin-specific rate-limit storage, denial logging, and typed request preparation
- added route-shape schemas in `apps/admin/lib/server/adminSchemas.ts`, wired all Admin route families through the shared entrypoint, and added `ADMIN_CORS_ALLOWED_ORIGINS` plus the `@cubid/auth` workspace dependency
- added focused Admin helper and representative route tests covering request ID propagation, CORS rejection, auth failures, schema failures, and route-to-policy wiring

#### Verification

- `pnpm install`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin build`
- `pnpm --filter @cubid/auth typecheck`
- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`

#### Follow-up

- commit the Admin baseline slice, then close `C03.2`/`C03.3` metadata and move to Passport hardening in `C03.4`

### session: v67

- timestamp: 2026-04-26T18:27:42-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`c2e078b`**
- session name: **Close C03.2 and C03.3 roadmap metadata**

#### Objective

Bring the roadmap and session metadata back into sync with the completed C03.2 and C03.3 implementation commits so the next session starts from an accurate security-hardening state.

#### Actions Taken

- marked `C03.2` completed at OIDC commit `d7a1afd`
- marked `C03.3` completed at Admin commit `c2e078b`
- left parent `C03` open for the remaining Passport adoption and final cross-repo validation work in `C03.4` and `C03.5`

#### Verification

- confirmed the implementation commits and clean worktree state before metadata closure

#### Follow-up

- continue with `C03.4` to bring Passport APIs onto the same shared request ID, validation, actor-guard, CORS, and rate-limit baseline

### session: v68

- timestamp: 2026-04-27T14:45:00-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`b143894`**
- session name: **Expand roadmap for SDK and package publishing work**

#### Objective

Capture the newly identified downstream SDK, package publishing, JSR, Deno, and integration-doc work in the roadmap without mixing it into the in-progress Passport hardening implementation slice.

#### Actions Taken

- refined `E02` so it explicitly covers publishable integration packages rather than only a generic REST and React surface
- added `E02.1` through `E02.4` for dual-target `@cubid/api`, high-level identity sync helpers, publishable `@cubid/web2` and `@cubid/web2-react`, and Deno plus Supabase Edge validation and docs
- left the active `C03.4` implementation changes uncommitted so the roadmap update can land as a separate metadata-only checkpoint

#### Verification

- compared the requested package and DX actions against `agent-context/todo.md`
- confirmed the new SDK and runtime-support work was not already represented with sufficient specificity in the current roadmap

#### Follow-up

- continue `C03.4` on the current branch, then return to the new `E02.*` items after the shared Passport API hardening is complete

### session: v69

- timestamp: 2026-04-27T16:55:00-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`5eede7b`**
- session name: **Implement Passport API security baseline**

#### Objective

Complete the Passport-side C03.4 hardening slice by moving the legacy Passport API surface onto the shared security baseline, removing wildcard CORS, eliminating committed route secrets, locking internal routes behind bearer auth, and replacing the production app's dependency on generic `/api/supabase/*` CRUD endpoints.

#### Actions Taken

- added shared Passport server helpers for request IDs, CORS, actor guards, rate limiting, Supabase access, Twilio Verify, SMTP-backed email OTP, and Gitcoin scorer access
- replaced first-party `/api/supabase/*` usage with typed `/api/passport/data/*` query and command routes, then hard-disabled the old generic Supabase CRUD handlers
- migrated Passport `/api/allow/*`, `/api/dapp/*`, `/api/v2/*`, `/api/verify/*`, `/api/wallet/*`, webhook, and cron endpoints onto explicit validation and actor contracts
- converted internal webhook and cron routes to require `PASSPORT_INTERNAL_API_TOKEN` and moved route-owned secrets to env-backed config
- updated Passport env examples and the API security baseline engineering doc to reflect the landed Passport contract

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`

#### Follow-up

- close `C03.4` metadata in `agent-context/todo.md`
- move to `C03.5` for final observability and any remaining targeted API test harness cleanup

### session: v70

- timestamp: 2026-04-27T17:13:00-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`91214ce`**
- session name: **Close C03.4 roadmap metadata**

#### Objective

Bring the roadmap metadata back into sync with the committed Passport hardening implementation so the next session can start directly on `C03.5` without ambiguity about what landed in `C03.4`.

#### Actions Taken

- marked `C03.4` completed in `agent-context/todo.md`
- recorded the implementation head and session references for the Passport baseline slice
- left parent `C03` open because `C03.5` still owns the final cross-repo observability and test closeout

#### Verification

- confirmed the Passport hardening implementation landed in commit `91214ce`
- confirmed the requested validation set had already completed before metadata closure

#### Follow-up

- start `C03.5` for final observability, CI expectations, and any remaining targeted API test harness work

### session: v71

- timestamp: 2026-04-27T09:59:19-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`7515335`**
- session name: **Implement C03.5 security baseline closeout**

#### Objective

Close `C03.5` by making the shared API security baseline provable and operable across Passport, Admin, and OIDC with real Passport tests, cold-safe typecheck behavior, CI regression checks, and operator-facing observability docs.

#### Actions Taken

- added a lightweight Passport `tsx --test` harness with focused coverage for request IDs, structured error envelopes, origin denials, dapp and internal auth denials, OTP throttling, and hard-disabled `/api/supabase/*` behavior
- moved the remaining Passport `/api/oidc/consents/*` and `/api/oidc/passkeys/*` account-management routes onto the shared Passport baseline and replaced their ad hoc `PassportApiError` path with shared `ApiSecurityError` handling
- added test-only Passport Supabase and Firebase Admin overrides so server-route failure paths can be covered without network calls or real credentials
- split Next app `typecheck` onto dedicated `tsconfig.typecheck.json` files, kept `.next/types` under build-owned `tsconfig.json`, and added a CI regression script that fails on `nextjs-cors` or wildcard-origin reintroduction in hardened API handlers
- extended OIDC and Admin failure-path tests, then added [docs/engineering/api-security-operations.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/api-security-operations.md) plus final closeout notes in [docs/engineering/api-security-baseline.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/api-security-baseline.md)

#### Verification

- `pnpm install`
- `pnpm check:api-security`
- `rm -rf apps/passport/.next apps/admin/.next`
- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/auth typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin build`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

#### Follow-up

- commit the validated `C03.5` implementation slice
- then close `C03.5` and the parent `C03` metadata against the landed implementation head

### session: v72

- timestamp: 2026-04-27T09:59:57-0400
- agent: **OpenAI Codex**
- branch: **codex/c03-api-security-baseline**
- head: **`be70126`**
- session name: **Close C03.5 and C03 metadata**

#### Objective

Bring the roadmap metadata back into sync with the validated `C03.5` implementation so the full C03 security-baseline stream is marked complete from the correct implementation head.

#### Actions Taken

- marked `C03.5` completed in [agent-context/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/todo.md) with its completion timestamp, feature branch, implementation head, and session references
- closed the parent `C03` todo with the final validated implementation head and the full set of sessions that landed the OIDC, Admin, Passport, and closeout slices
- kept the target-state doc reference on the parent C03 item pointing at [docs/engineering/api-security-baseline.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/api-security-baseline.md)

#### Verification

- confirmed the validated `C03.5` implementation landed in commit `be70126`
- confirmed the full root validation set and the dedicated API security regression check had already completed successfully before metadata closure

#### Follow-up

- publish the completed C03 branch for review
- tackle `C04` next for wallet and sensitive-disclosure custody hardening, unless priorities shift back to package publishing or integration DX work

### session: v73

- timestamp: 2026-04-27T13:59:31-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`144a334`**
- session name: **Split secrets hardening roadmap and fix Profile disclosure**

#### Objective

Split the broad `C04` custody todo into concrete hashed-secret, encrypted-retrievable-secret, and env-backed operational-secret tracks, and remove misleading Passport Profile copy that described a NEAR transaction signature as a private key.

#### Actions Taken

- replaced the old broad `C04` todo with a hash-at-rest track for non-retrievable verification secrets
- added `C04.1` for dapp API keys and `C04.2` for email OTP code hashing
- added `C05` for Supabase Vault envelope encryption, including dapp user secrets, blockchain private-key custody, and webhook signing secrets
- added `C06` for hardening env-backed operational secrets such as OIDC signing keys, Firebase keys, Supabase service roles, Twilio, SMTP, Instagram, Fractal, NEAR issuer keys, and internal bearer tokens
- updated Passport Profile so the NEAR stamp transaction signature sheet no longer uses private-key export language

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport test` attempted, but blocked by the local Node v25.8.2 runtime; the workspace requires Node 20 and the older JWT dependency fails before tests execute
- confirmed Profile no longer contains “Export Private Key” or “Copy Private Key” copy

#### Follow-up

- implement `C04.1` for hashed dapp API keys, or `C04.2` for hashed email OTP codes if OTP cleanup should land first

### session: v74

- timestamp: 2026-04-27T14:52:24-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`f673183`**
- session name: **Implement C04.1 hashed dapp API keys**

#### Objective

Move dapp API keys off plaintext runtime lookup by introducing hash-only `dapp_api_keys` verification while keeping currently issued keys working through a one-way migration.

#### Actions Taken

- added a `dapp_api_keys` Supabase migration and local seed backfill that hash existing `dapps.apikey` UUIDs into non-retrievable verifier rows
- added shared dapp key generation, parsing, hashing, legacy hash, and verification helpers in `@cubid/auth/server`
- updated Passport dapp actor authentication and the legacy `/api/dapp/create_user` path to verify through `dapp_api_keys` instead of direct `dapps.apikey` lookup
- updated Admin app create, list, and rotate flows so raw API keys are shown only once and list views expose only non-secret key metadata
- added focused tests for new and migrated dapp key verification, invalid key rejection, Admin rotate response shape, and Passport dapp auth behavior
- documented the storage model and the follow-up to drop `dapps.apikey` after production smoke

#### Verification

- `pnpm --filter @cubid/auth test`
- `pnpm --filter @cubid/auth typecheck`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin build`
- `pnpm --filter @cubid/passport build`
- `pnpm --filter @cubid/passport test` attempted, but blocked by the local Node v25.8.2 runtime; the workspace requires Node 20 and an older JWT dependency fails before tests execute

#### Follow-up

- close the `C04.1` todo metadata against the implementation commit
- run Passport tests under Node 20 in CI or a Node 20 local shell

### session: v75

- timestamp: 2026-04-27T14:53:23-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`43e63f8`**
- session name: **Close C04.1 metadata**

#### Objective

Mark `C04.1` complete against the landed hashed dapp API key implementation and keep the parent `C04` track open for the remaining email OTP hash work.

#### Actions Taken

- marked parent `C04` as started because the first hash-at-rest child task has landed
- marked `C04.1` completed with the implementation head, branch, timestamp, session reference, and target-state doc
- left `C04.1.1` open for post-deployment removal of the legacy `dapps.apikey` column

#### Verification

- confirmed implementation commit `43e63f8` contains the validated C04.1 changes

#### Follow-up

- run Passport tests under Node 20 when available
- tackle `C04.2` for email OTP hash storage next

### session: v76

- timestamp: 2026-04-27T15:03:48-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`8ba6770`**
- session name: **Implement C04.2 email OTP hashing**

#### Objective

Replace plaintext email OTP storage with verification-only hashing, 10-minute expiry, 3-attempt enforcement, and one-time consumption while keeping the dapp-facing send and verify response contracts stable.

#### Actions Taken

- added a Supabase migration that adds `otp_hash`, hash metadata, expiry, attempt count, consumed timestamp, and active lookup indexes to `email_otp`
- added Supabase Vault-backed SQL functions so OTP HMAC hashing uses the `passport_email_otp_hash_secret` Vault secret instead of an app environment variable
- updated Passport email OTP send to normalize email addresses, hash OTPs through Supabase RPC, store only hash metadata, and send the raw OTP only through SMTP
- updated Passport email OTP verify to load the latest unconsumed row, reject expired or over-attempted codes, increment failed attempts, and mark successful challenges consumed
- added helper and route tests for deterministic hashing, wrong-code rejection, hashed storage, one-time consumption, failed attempts, expired codes, and attempt-limit behavior
- documented the Vault-backed OTP secret and fail-closed operational requirement

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm --filter @cubid/passport exec tsx --test tests/emailOtp.test.ts`
- `pnpm --filter @cubid/passport test` attempted; the new email OTP helper tests passed before the known local Node v25.8.2 JWT dependency crash stopped `passportApi.test.ts` and `passportRoutes.test.ts`

#### Follow-up

- close `C04.2` and the parent `C04` metadata against the implementation commit
- run the full Passport suite under Node 20 in CI or a Node 20 local shell

### session: v77

- timestamp: 2026-04-27T15:04:22-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`6732c16`**
- session name: **Close C04.2 and C04 metadata**

#### Objective

Mark `C04.2` and parent `C04` complete now that both non-retrievable secret tracks, dapp API keys and email OTP codes, have landed.

#### Actions Taken

- marked `C04.2` completed with the implementation head, timestamp, and session reference
- marked parent `C04` completed while keeping `C04.1.1` open as a post-deployment cleanup follow-up for dropping legacy `dapps.apikey`
- preserved `C05` and `C06` as the next secrets-hardening tracks for retrievable and env-backed secrets

#### Verification

- confirmed implementation commit `6732c16` contains the validated C04.2 changes

#### Follow-up

- run the full Passport suite under Node 20 when available
- tackle `C04.1.1` after production smoke, or start `C05.1` for encrypted dapp user secrets

### session: v78

- timestamp: 2026-04-27T15:31:54-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`08520bf`**
- session name: **Upgrade runtime baseline to Node 24 LTS**

#### Objective

Move the monorepo from Node 20 to Node 24 LTS for local development and CI while keeping the package manager, Turbo task graph, and dependency changes narrowly focused on the runtime baseline.

#### Actions Taken

- updated `.nvmrc`, root `engines.node`, CI setup, AGENTS guidance, and the monorepo operating-model doc from Node 20 to Node 24
- updated workspace `@types/node` dev dependencies to the Node 24 type line
- refreshed and verified the pnpm lockfile under Node 24 while avoiding unrelated dependency modernization
- confirmed the Passport test suite no longer hits the local Node 25 JWT dependency crash when executed under Node 24

#### Verification

- `npx -y -p node@24 -p pnpm@10.33.0 pnpm install --frozen-lockfile --reporter append-only`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/auth test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/auth typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/admin test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/admin typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/oidc test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/oidc typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm lint`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm build`

#### Follow-up

- keep an eye on the existing Next/security warning for the pinned Next.js 14.2.15 release in a dedicated dependency-hardening slice
- consider cleaning existing frontend lint warnings separately from the runtime baseline upgrade

### session: v79

- timestamp: 2026-04-27T16:24:22-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`21c5d7b`**
- session name: **Implement C05.1 encrypted dapp user secrets on API v3**

#### Objective

Implement the first retrievable-secret custody slice by moving dapp user secret writes to a Vault-backed envelope-encrypted API v3 path while leaving the existing API v2 route behavior unchanged.

#### Actions Taken

- added a Supabase migration for encrypted `dapp_user_secrets` fields, service-role-only Vault key access, and tightened table grants
- added Passport server helpers for AES-256-GCM envelope encryption/decryption using a per-row data key wrapped by `passport_dapp_user_secret_wrapping_key_v1`
- introduced `/api/v3/save_secret` with dapp authentication, dapp-user ownership checks, encrypted-only storage, and security-event logging
- added an idempotent dry-run-capable backfill script for legacy plaintext rows without printing secret material
- documented the C05.1 custody model and noted that `/api/v2/save_secret` is intentionally preserved while v3 becomes the encrypted path
- added focused helper and route tests for round-trip encryption, AAD rejection, v3 encrypted storage, and cross-dapp ownership rejection

#### Verification

- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport build`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm lint`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm build`

#### Follow-up

- close `C05.1` metadata against this implementation commit
- run the legacy-row backfill script in dry-run mode before any production migration execution
- keep `C05.1.1` open for physically dropping or replacing the legacy plaintext `secret` column after production verification

### session: v80

- timestamp: 2026-04-27T16:25:14-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`18b361e`**
- session name: **Close C05.1 metadata**

#### Objective

Mark `C05.1` complete after the encrypted API v3 dapp user secret path, migration, docs, script, and tests landed in the implementation commit.

#### Actions Taken

- updated `agent-context/todo.md` so `C05.1` records completion timestamp, implementation head, and session-log reference
- kept parent `C05` open because blockchain private-key custody and webhook signing-secret envelope encryption remain outstanding
- kept `C05.1.1` open as the post-production-verification cleanup for the legacy plaintext column

#### Verification

- confirmed implementation commit `18b361e` contains the validated C05.1 changes

#### Follow-up

- continue C05 with either webhook signing secret encryption or blockchain private-key custody

### session: v81

- timestamp: 2026-04-27T16:54:34-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`7d812b3`**
- session name: **Implement C05.3 encrypted webhook signing secrets**

#### Objective

Move webhook signing secrets into the C05 retrievable-secret custody model by encrypting new and rotated webhook secrets with Supabase Vault envelope encryption while preserving a safe migration window for existing plaintext rows.

#### Actions Taken

- added shared server-side AES-256-GCM envelope helpers in `@cubid/auth/server`
- added a Supabase migration for encrypted `dapp_webhook_subscriptions` fields and the Vault-backed `passport_webhook_signing_secret_wrapping_key_v1` helper
- added Admin create and rotate-secret flows that return raw webhook secrets only once, store encrypted fields, and log security events
- removed stored-secret copy behavior from Admin webhook lists and replaced it with redacted encrypted/legacy status plus rotate controls
- updated Passport webhook delivery and expired-cron delivery to decrypt encrypted webhook signing secrets server-side while temporarily accepting legacy plaintext rows
- added an idempotent dry-run-capable backfill script for legacy webhook subscriptions
- updated encrypted-secret and API-security operations docs
- added tests for shared envelope helpers, webhook secret encryption context binding, Admin redaction/create/rotate behavior, and Passport helper coverage

#### Verification

- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/auth test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/auth typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport build`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/admin test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/admin typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/admin build`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm lint`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm build`

#### Follow-up

- close `C05.3` metadata against this implementation commit
- run the webhook backfill script in dry-run mode before production migration execution
- keep a future physical cleanup follow-up open for removing or quarantining the legacy plaintext webhook `secret` column after production verification

### session: v82

- timestamp: 2026-04-27T16:55:20-0400
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`89ae627`**
- session name: **Close C05.3 metadata**

#### Objective

Mark `C05.3` complete after the webhook signing-secret envelope-encryption implementation landed and passed validation.

#### Actions Taken

- updated `agent-context/todo.md` so `C05.3` records completion timestamp, implementation head, and session-log reference
- kept parent `C05` open because blockchain private-key custody remains outstanding
- preserved the production follow-up expectation for running the webhook backfill and later removing or quarantining legacy plaintext storage after verification

#### Verification

- confirmed implementation commit `89ae627` contains the validated C05.3 changes

#### Follow-up

- continue C05 with `C05.2` blockchain private-key custody, or add a narrow post-deployment cleanup todo for physically removing legacy webhook plaintext after production backfill verification

### session: v83

- timestamp: 2026-04-27T22:07:15Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`36f1618`**
- session name: **Implement C05.2 encrypted blockchain account custody**

#### Objective

Add a new v3 blockchain account custody surface that stores generated account metadata separately from Vault-backed encrypted private-key envelopes while leaving legacy v2 wallet and private-key routes unchanged.

#### Actions Taken

- added a Supabase migration creating the `private` schema, `public.ref_chains`, `public.user_accounts`, `public.dapp_user_accounts`, and service-role-only `private.private_keys`
- added the Vault-backed `passport_blockchain_private_key_wrapping_key_v1` helper function for private-key envelope wrapping
- added Passport server helpers for EVM, NEAR, and Solana account generation plus AES-256-GCM envelope encryption bound to account context
- added `/api/v3/accounts/generate` and `/api/v3/accounts/list` as dapp-authenticated v3 routes that never return raw private keys or encrypted key material
- added a `C05.2.1` follow-up for Sui support after selecting a Sui SDK and address-normalization contract
- updated encrypted-secret and API-security operations docs with the blockchain custody contract
- added helper and route tests covering encryption, wrong-context rejection, dapp ownership checks, Sui rejection, no key leakage, and dapp-user account linking

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport typecheck && pnpm --filter @cubid/passport build'`
- `npx -p node@24 -c 'node --version && pnpm test && pnpm typecheck'`
- `npx -p node@24 -c 'node --version && pnpm lint && pnpm build'`

#### Follow-up

- update the `C05.2` todo head after this implementation commit lands
- provision `passport_blockchain_private_key_wrapping_key_v1` in Supabase Vault before enabling v3 account generation outside local/test environments
- implement `C05.2.1` for Sui once the SDK dependency and address format are locked

### session: v84

- timestamp: 2026-04-27T22:10:42Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`dde73b0`**
- session name: **Close C05.2 metadata**

#### Objective

Record the implementation commit for `C05.2` after the encrypted v3 blockchain account custody slice landed and passed validation.

#### Actions Taken

- updated `agent-context/todo.md` so `C05.2` references implementation commit `dde73b0`
- kept `C05` open because `C05.1.1` and `C05.2.1` remain active follow-ups
- preserved the Sui follow-up as the next chain-expansion item for v3 account custody

#### Verification

- confirmed implementation commit `dde73b0` contains the validated C05.2 changes

#### Follow-up

- provision the blockchain private-key wrapping key in Supabase Vault before enabling v3 generation in shared environments
- consider `C05.2.1` for Sui or continue with `C06` env-backed operational-secret hardening

### session: v85

- timestamp: 2026-04-27T22:20:26Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`ca19c31`**
- session name: **Document deprecated database quarantine tables**

#### Objective

Update repo agent guidance so deprecated and v2-only database tables are left alone unless a future todo explicitly scopes their cleanup.

#### Actions Taken

- added an `AGENTS.md` note marking legacy wallet, chain-account, and deprecated score/auth tables as quarantine surfaces
- included `wallet_list`, `wallet_details`, `sui-api-accounts`, `near-api-accounts`, `eth-api-accounts`, `evm_accounts`, `authorized_dapps_deprecated`, `blacklist_deprecated`, and `dapp_stampscores_deprecated`

#### Verification

- not run; documentation-only change

#### Follow-up

- continue with `C06` env-backed operational-secret hardening or `C05.2.1` Sui support when ready

### session: v86

- timestamp: 2026-04-27T22:41:01Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`2b50f2f`**
- session name: **Move encrypted dapp user secrets into private schema**

#### Objective

Correct the C05.1 dapp user secret custody boundary so `public.dapp_user_secrets` remains the legacy v2 plaintext table and encrypted v3 writes land only in `private.dapp_user_secrets`.

#### Actions Taken

- rewrote the C05.1 migration to preserve the public table and create a service-role-only `private.dapp_user_secrets` table for encrypted v3 custody
- kept `/api/v2/save_secret` on the legacy public table and changed `/api/v3/save_secret` to write through the private schema
- updated the backfill script to read public plaintext rows and insert encrypted private copies without mutating the public table
- updated Passport route tests and mocks to distinguish public legacy rows from private encrypted rows
- updated encrypted-secret and API-security operations docs plus todo language for the public/v2 and private/v3 split

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport typecheck && pnpm --filter @cubid/passport build'`
- `npx -p node@24 -c 'node --version && pnpm test && pnpm typecheck'`

#### Follow-up

- update C05.1 todo metadata to reference this corrected implementation head after commit

### session: v87

- timestamp: 2026-04-27T22:41:30Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`f3e8b02`**
- session name: **Close C05.1 private-schema metadata**

#### Objective

Record the corrected C05.1 implementation head after moving encrypted v3 dapp user secret storage from the public table design into `private.dapp_user_secrets`.

#### Actions Taken

- updated `agent-context/todo.md` so C05.1 now references implementation commit `f3e8b02`
- preserved the original C05.1 session reference while adding the private-schema correction sessions

#### Verification

- confirmed implementation commit `f3e8b02` contains the validated private-schema C05.1 correction

#### Follow-up

- continue with C05.1.1 after production backfill verification, or move on to C06 operational-secret hardening

### session: v88

- timestamp: 2026-04-27T22:55:47Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`ade5b82`**
- session name: **Harden env-backed operational secret loading**

#### Objective

Implement C06 so environment-backed operational secrets are loaded, parsed, redacted, documented, and smoke-checked through shared helpers instead of scattered raw `process.env` reads.

#### Actions Taken

- extended `@cubid/config` with required-secret loading, alias fallback, JSON secret parsing, Firebase private-key normalization, Supabase service-role config loading, and redaction helpers
- migrated OIDC signing, pairwise subject, Firebase Admin, Supabase service-role, Twilio, Fractal, Instagram, Worldcoin, NEAR issuer, and Passport internal-token call sites onto shared secret helpers
- added Passport operational-secret helpers, tests, canonical env names with legacy alias support, and a repo-level operational-secret readiness check
- documented C06 ownership, rotation, emergency revocation, local-development handling, and redaction expectations

#### Verification

- `pnpm --filter @cubid/config test && pnpm --filter @cubid/config typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/oidc test && pnpm --filter @cubid/oidc typecheck'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test && pnpm --filter @cubid/passport typecheck && pnpm --filter @cubid/admin test && pnpm --filter @cubid/admin typecheck'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/config test && pnpm --filter @cubid/config typecheck && pnpm --filter @cubid/passport build && pnpm check:secrets'`
- `npx -p node@24 -c 'node --version && pnpm test && pnpm typecheck && pnpm build'`

#### Follow-up

- close C06 todo metadata after committing this implementation head

### session: v89

- timestamp: 2026-04-27T22:56:40Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`b29831b`**
- session name: **Close C06 operational-secret metadata**

#### Objective

Mark C06 complete after committing the validated env-backed operational-secret hardening implementation.

#### Actions Taken

- updated `agent-context/todo.md` with the C06 completion timestamp, implementation head, and session-log reference

#### Verification

- confirmed implementation commit `b29831b` contains the validated C06 hardening work

#### Follow-up

- continue with a C05/C06 follow-up or publish the current branch for review

### session: v90

- timestamp: 2026-04-27T23:27:28Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`fc00d0d`**
- session name: **Address PR 149 Codex review feedback**

#### Objective

Address actionable Codex review comments on PR #149 after retargeting the branch to `dev`.

#### Actions Taken

- changed Admin dapp API-key rotation to create the replacement key before revoking older active keys, with cleanup of the replacement if old-key revocation fails
- added compensating cleanup for v3 blockchain account creation so partial private-key or dapp-user-account failures do not leave orphaned custodial account rows
- changed v3 dapp user secret sequencing from row-count assignment to max-plus-one with a unique per-user sequence index and duplicate-key retry

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test && pnpm --filter @cubid/passport typecheck && pnpm --filter @cubid/admin test && pnpm --filter @cubid/admin typecheck'`

#### Follow-up

- push review fixes, reply to and resolve the Codex review threads, then re-check CI

### session: v91

- timestamp: 2026-04-27T23:40:47Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`6e1bccb`**
- session name: **Address second PR 149 Codex review pass**

#### Objective

Address the second Codex review pass on PR #149 after the first review fixes were pushed.

#### Actions Taken

- restored the missing `webhook_call` import used by `server_insertStamp`
- added a DB-side `increment_api_rate_limit_bucket` helper so Passport rate-limit counters increment atomically instead of through read-then-upsert logic
- updated Passport tests/mocks to exercise the atomic rate-limit RPC path

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test && pnpm --filter @cubid/passport typecheck'`

#### Follow-up

- push the second review-fix commit, reply to and resolve the new Codex threads, then re-check CI

### session: v92

- timestamp: 2026-04-27T23:48:06Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`ac336c8`**
- session name: **Correct AGENTS PR target guidance**

#### Objective

Update repo agent workflow instructions so future agents target the project’s actual `dev` PR flow and do not create unnecessary one-change feature branches.

#### Actions Taken

- changed AGENTS workflow guidance to say agents should work on feature branches, but related changes may share one coherent feature branch
- changed default PR target guidance from `main` to `dev`
- kept `main` targeting available only when explicitly requested

#### Verification

- not run; documentation-only process correction

#### Follow-up

- continue PR #149 review/merge flow or approved cleanup after merge

### session: v93

- timestamp: 2026-04-27T23:59:10Z
- agent: **OpenAI Codex**
- branch: **codex/c04-c06-secrets-hardening-split**
- head: **`7077c44`**
- session name: **Address remaining PR 149 Codex review comments**

#### Objective

Address the remaining unresolved Codex review comments on PR #149.

#### Actions Taken

- populated required `event_id` and `route` fields for webhook signing secret audit events on create and rotate paths
- stopped silently ignoring webhook audit insert errors so custody audit failures surface instead of disappearing
- awaited dapp API-key `last_used_at` updates after successful Passport dapp authentication
- added Admin route test coverage for webhook audit event required fields

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/admin test && pnpm --filter @cubid/admin typecheck && pnpm --filter @cubid/passport test && pnpm --filter @cubid/passport typecheck'`

#### Follow-up

- push the review-fix commit, reply to and resolve the remaining PR #149 review threads, then re-check CI

### session: v94

- timestamp: 2026-04-28T08:37:24Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-cubid-api-package**
- head: **`ba0b51c`**
- session name: **Build the @cubid/api package foundation**

#### Objective

Start E02 and implement the E02.1 repository foundation for a public, runtime-agnostic `@cubid/api` package that can be published through npm and JSR trusted publishing.

#### Actions Taken

- created `packages/api` with a standards-only ESM client, typed low-level Passport v2 wrappers, structured `CubidApiError` categories, and injected-fetch support
- added package README, JSR metadata, npm package metadata, publish dry-run scripts, and a manual trusted-publishing workflow
- added CI coverage for npm pack and JSR dry-runs, plus an engineering note documenting the package contract and registry setup requirements
- confirmed `@cubid/api` is not yet present on npm or JSR and left live publish blocked on trusted-publisher/package setup rather than using local credentials

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/api test && pnpm --filter @cubid/api typecheck && pnpm --filter @cubid/api build && pnpm --filter @cubid/api pack:dry-run && pnpm --filter @cubid/api jsr:dry-run'`
- `npx -p node@24 -c 'node --version && pnpm check:api-package && pnpm test && pnpm typecheck && pnpm build'`
- `npx -p node@24 -c 'node --version && pnpm lint'`

#### Follow-up

- configure npm Trusted Publishing and the linked JSR package for `@cubid/api`, then run the manual publish workflow once this branch is reviewed and merged

### session: v95

- timestamp: 2026-04-29T08:19:58Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-cubid-api-package**
- head: **`452874b`**
- session name: **Rename the public SDK foundation to @cubid/core**

#### Objective

Rename the unpublished foundation package from `@cubid/api` to `@cubid/core` and align agent/product guidance around the target SDK package ecosystem before publication.

#### Actions Taken

- renamed the package workspace from `packages/api` to `packages/core` and updated npm, JSR, CI, root scripts, and trusted-publishing workflow references to `@cubid/core`
- rewrote the Cubid agent backgrounder into a concise mission and protocol-principles document
- added `docs/engineering/sdk-package-target-state.md` as the source of truth for SDK package boundaries, dependency rules, npm org ownership, and placement guidance
- updated `AGENTS.md`, `README.md`, and E02 todos to point future SDK work at `@cubid/core`, `@cubid/react`, and chain-specific packages instead of the temporary `@cubid/api`/`web2` names

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core build && pnpm --filter @cubid/core pack:dry-run && pnpm --filter @cubid/core jsr:dry-run'`
- `npx -p node@24 -c 'node --version && pnpm check:core-package && pnpm test && pnpm typecheck && pnpm build'`
- `npx -p node@24 -c 'node --version && pnpm lint'`

#### Follow-up

- configure npm Trusted Publishing and JSR linking for `@cubid/core`, then publish through the manual GitHub Actions workflow after this branch is merged

### session: v96

- timestamp: 2026-04-29T08:37:08Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-cubid-api-package**
- head: **`2f277d5`**
- session name: **Address PR 150 Codex transport-error review**

#### Objective

Address the Codex review comment on PR #150 about preserving the `@cubid/core` structured error contract for network-level fetch failures.

#### Actions Taken

- wrapped rejected `fetch` calls in `makeRequest` as `CubidApiError` with `upstream` category before any `Response` exists
- added focused test coverage for transport failures so SDK consumers can reliably catch `CubidApiError`

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core build && pnpm --filter @cubid/core pack:dry-run && pnpm --filter @cubid/core jsr:dry-run && pnpm check:core-package && pnpm test && pnpm typecheck && pnpm build && pnpm lint'`

#### Follow-up

- push the review fix, comment with the solution, resolve the Codex thread, and re-check PR CI

### session: v97

- timestamp: 2026-04-29T08:38:53Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-cubid-api-package**
- head: **`baa7758`**
- session name: **Address PR 150 Copilot SDK polish comments**

#### Objective

Address Copilot review comments on PR #150 for `@cubid/core` base URL validation and cross-platform package builds.

#### Actions Taken

- tightened `baseUrl` validation so only HTTPS is allowed generally and HTTP is allowed only for loopback development hosts
- added tests for loopback HTTP allowance, public HTTP rejection, and non-HTTP protocol rejection
- replaced the `rm -rf dist` package build cleanup with a cross-platform Node `fs.rmSync` cleanup command

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core build && pnpm --filter @cubid/core pack:dry-run && pnpm --filter @cubid/core jsr:dry-run && pnpm check:core-package && pnpm test && pnpm typecheck && pnpm build && pnpm lint'`

#### Follow-up

- push the Copilot review fixes, reply to and resolve the review threads, then re-check PR CI and review state

### session: v98

- timestamp: 2026-04-29T16:07:20Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`397c376`**
- session name: **Capture SDK v2 cherry-pick roadmap follow-ups**

#### Objective

Commit the todo-only roadmap update that preserves the useful SDK comparison insights before starting E02.2 implementation work.

#### Actions Taken

- added `E02.2.1` to direct future `@cubid/core` work toward normalized responses, malformed-response handling, endpoint-aware errors, and selected low-level wrappers from the older SDK
- added `E02.3.1` to preserve useful web2, React, and wallet adapter prototype ideas while translating them into the new target package model

#### Verification

- reviewed `agent-context/todo.md` diff for roadmap-only scope

#### Follow-up

- commit the roadmap-only update, then mark `E02.2` started on this branch with a separate session-log entry and commit

### session: v99

- timestamp: 2026-04-29T16:07:42Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`4cf2f89`**
- session name: **Start E02.2 core identity sync**

#### Objective

Mark `E02.2` started on the new feature branch before implementing the `@cubid/core` high-level identity sync helpers.

#### Actions Taken

- updated `agent-context/todo.md` so `E02.2` is started on `codex/e02-2-core-identity-sync`
- recorded the roadmap commit SHA as the starting head for the task
- kept implementation work out of the metadata-start commit

#### Verification

- reviewed the E02.2 metadata fields after editing

#### Follow-up

- implement the `@cubid/core` identity sync helpers, normalized response models, and malformed-response handling guided by `E02.2` and `E02.2.1`

### session: v100

- timestamp: 2026-04-29T16:40:48Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`f47e98a`**
- session name: **Implement E02.2 core identity helpers**

#### Objective

Implement the `@cubid/core` E02.2 server-facing identity sync helpers with normalized response models and safer malformed-response handling.

#### Actions Taken

- added normalized camelCase response models for create-user, identity, score, and stamp responses while retaining raw payloads for debugging
- added `ensureUserByEmail` and `syncIdentitySnapshot` to the runtime-agnostic client
- expanded `CubidApiError` with optional code and endpoint metadata, including `MALFORMED_RESPONSE` and `NETWORK_ERROR`
- updated package tests, README guidance, and the engineering package contract doc for the new helper surface

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core build'`

#### Follow-up

- commit the implementation, then close out E02.2 metadata with the implementation commit head

### session: v101

- timestamp: 2026-04-29T16:41:13Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`2727a8e`**
- session name: **Close E02.2 metadata**

#### Objective

Mark `E02.2` completed after the `@cubid/core` identity sync helper implementation and focused validation landed.

#### Actions Taken

- updated `agent-context/todo.md` with the E02.2 completion timestamp
- recorded the implementation commit as the E02.2 head
- attached the start, implementation, and closeout session-log references to the todo

#### Verification

- confirmed the E02.2 metadata points at implementation head `2727a8e`

#### Follow-up

- continue with `E02.2.1` to port additional runtime-agnostic ergonomics from `cubid-sdk-v2`, or publish the current branch for review first

### session: v102

- timestamp: 2026-04-29T17:27:43Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`b78ae9e`**
- session name: **Start E02.2.1 SDK ergonomics port**

#### Objective

Start the follow-on SDK ergonomics slice that ports the remaining runtime-agnostic, security-compatible helpers from `cubid-sdk-v2` into `@cubid/core`.

#### Actions Taken

- marked `E02.2.1` started on the current feature branch
- inspected the older SDK API client and current Passport v2 routes for wrapper compatibility
- confirmed the port should focus on `addStamp`, location/user-data/search, and safe OTP response helpers without exposing plaintext OTP values

#### Verification

- reviewed `agent-context/todo.md` metadata and current package route coverage before implementation

#### Follow-up

- add the compatible wrappers, tests, docs, and closeout metadata for `E02.2.1`

### session: v103

- timestamp: 2026-04-29T17:31:12Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`10bdeb8`**
- session name: **Port runtime-agnostic SDK wrappers**

#### Objective

Complete `E02.2.1` by porting the remaining useful runtime-agnostic SDK ergonomics from `cubid-sdk-v2` into the new `@cubid/core` package.

#### Actions Taken

- added normalized `@cubid/core` wrappers for `addStamp`, location fetches, user-data fetch, location search, and email/phone OTP send/verify flows
- preserved the newer security posture by omitting raw OTP codes from SDK responses even when legacy server payloads contain one
- added tests for endpoint paths, normalized legacy response shapes, malformed search responses, and safe OTP metadata
- updated package README and engineering docs to describe the expanded wrapper surface

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core build'`

#### Follow-up

- commit the implementation, then close `E02.2.1` metadata with the implementation commit head

### session: v104

- timestamp: 2026-04-29T17:31:33Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`e995f0e`**
- session name: **Close E02.2.1 SDK ergonomics port**

#### Objective

Mark `E02.2.1` completed after the additional runtime-agnostic SDK wrappers and safety tests landed.

#### Actions Taken

- updated `agent-context/todo.md` with the E02.2.1 completion timestamp
- recorded the implementation commit as the E02.2.1 head
- attached the start, implementation, and closeout session-log references to the todo

#### Verification

- confirmed the E02.2.1 metadata points at implementation head `e995f0e`

#### Follow-up

- publish the branch for review or proceed to E02.4 package validation/docs if the SDK surface is ready for broader release work

### session: v105

- timestamp: 2026-04-29T17:41:47Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`5626b19`**
- session name: **Start E02.4 Deno and integration DX**

#### Objective

Start E02.4 to add Deno/Supabase Edge validation, integration guidance, examples, and stability notes for `@cubid/core` before publication.

#### Actions Taken

- marked `E02.4` started on the current SDK feature branch
- inspected existing package scripts, CI, docs, and local Deno availability
- selected local source Deno validation plus JSR dry-run validation because `@cubid/core` is not yet published on JSR

#### Verification

- confirmed the repo is clean before E02.4 implementation changes

#### Follow-up

- add package-level Deno checks, CI wiring, integration docs, examples, and closeout metadata

### session: v106

- timestamp: 2026-04-29T17:44:44Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`6dbd328`**
- session name: **Add E02.4 Deno and Edge integration validation**

#### Objective

Add the Deno/Supabase Edge validation and integration guidance needed before publishing `@cubid/core`.

#### Actions Taken

- added a package-level Deno smoke check that imports local `@cubid/core` TypeScript source and models a Supabase Edge Function
- wired Deno setup into CI and the manual publish workflow, and added `deno:check` to the root core-package validation contract
- added a Next.js plus Supabase Edge integration guide with copy-paste examples for user resolution, identity snapshots, OTP flows, and post-return refresh
- updated `@cubid/core` README and engineering docs with Deno validation and JSR usage guidance

#### Verification

- `pnpm --filter @cubid/core deno:check`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core deno:check && pnpm --filter @cubid/core build && pnpm --filter @cubid/core pack:dry-run && pnpm --filter @cubid/core jsr:dry-run && pnpm check:core-package'`

#### Follow-up

- commit the E02.4 implementation, then close E02.4 metadata with the implementation head

### session: v107

- timestamp: 2026-04-29T17:45:07Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`9fe5a52`**
- session name: **Close E02.4 integration DX**

#### Objective

Mark `E02.4` completed after the Deno validation, CI wiring, and integration docs landed.

#### Actions Taken

- updated `agent-context/todo.md` with the E02.4 completion timestamp
- recorded the implementation commit as the E02.4 head
- attached the start, implementation, and closeout session-log references to the todo

#### Verification

- confirmed the E02.4 metadata points at implementation head `9fe5a52`

#### Follow-up

- publish the branch for review, then configure trusted npm/JSR publishing once merged

### session: v114

- timestamp: 2026-04-29T19:27:57Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`36f121b`**
- session name: **Start E02.3 React and chain SDK packages**

#### Objective

Start the missing E02.3 package slice after confirming E02.2 and E02.4 were already completed on this branch.

#### Actions Taken

- verified `E02.2` and `E02.4` are completed in the E02 branch metadata and backed by implementation commits
- confirmed `E02.3` remains unimplemented and marked it started
- scoped the implementation to publishable `@cubid/react` profile-completion primitives plus chain-package boundaries that keep chain dependencies out of `@cubid/core`

#### Verification

- inspected `agent-context/todo.md`, `agent-context/session-log.md`, and git history for E02 evidence

#### Follow-up

- add package-ready React and chain SDK workspaces, tests, docs, validation, and closeout metadata

### session: v115

- timestamp: 2026-04-29T19:38:55Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`789e3a5`**
- session name: **Implement E02.3 React and chain SDK package foundations**

#### Objective

Implement the missing E02.3 package slice with publishable React profile-completion primitives and chain-specific package boundaries.

#### Actions Taken

- added `@cubid/react` with React provider/hooks, `PhoneOtpForm`, provider connect buttons, AllowPage URL helpers, callback-state helpers, and missing recommended credential summaries
- added publishable chain package workspaces for `@cubid/evm`, `@cubid/solana`, `@cubid/cardano`, `@cubid/sui`, and `@cubid/near`
- added `@cubid/wagmi` as the wagmi-only package boundary with EVM stamp-data integration helpers
- kept heavy chain SDKs out of this first package slice so `@cubid/core` and `@cubid/react` remain cleanly bounded
- updated the SDK target-state doc with the implemented E02 package layering

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/react test && pnpm --filter @cubid/react typecheck && pnpm --filter @cubid/react build'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/evm test && pnpm --filter @cubid/evm typecheck && pnpm --filter @cubid/evm build'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/solana typecheck && pnpm --filter @cubid/solana build && pnpm --filter @cubid/cardano typecheck && pnpm --filter @cubid/cardano build && pnpm --filter @cubid/sui typecheck && pnpm --filter @cubid/sui build'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/near typecheck && pnpm --filter @cubid/near build && pnpm --filter @cubid/wagmi typecheck && pnpm --filter @cubid/wagmi build'`
- `npx -p node@24 -c 'node --version && pnpm test'`
- `npx -p node@24 -c 'node --version && pnpm typecheck'`
- `npx -p node@24 -c 'node --version && pnpm build'`

#### Follow-up

- commit the E02.3 implementation, then mark E02.3 completed with the implementation head

### session: v116

- timestamp: 2026-04-29T19:39:33Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`b7b6c36`**
- session name: **Close E02.3 SDK package foundations**

#### Objective

Mark E02.3 and its SDK-v2 adaptation subtask complete after the React and chain package foundations landed.

#### Actions Taken

- updated `agent-context/todo.md` to mark `E02.3` completed
- updated `E02.3.1` as completed because the implemented package slice used the older web2, React, and wallet SDK prototypes as source material for the new package model
- recorded implementation head `b7b6c36` and attached the E02.3 start, implementation, and closeout session references

#### Verification

- confirmed implementation head `b7b6c36` exists
- relied on the E02.3 validation recorded in `session: v115`

#### Follow-up

- publish the E02 branch for review, then configure trusted publishing before any live package release

### session: v117

- timestamp: 2026-04-29T22:49:55Z
- agent: **OpenAI Codex**
- branch: **codex/e02-2-core-identity-sync**
- head: **`592038c`**
- session name: **Address PR 151 SDK review feedback**

#### Objective

Resolve the actionable Copilot and Codex review comments on PR #151 before continuing the publish workflow.

#### Actions Taken

- removed `this`-dependent SDK helper calls so destructured `@cubid/core` methods remain callable
- validated callback providers in `@cubid/react`, disabled verified OTP resubmission, and added handled provider-connect errors
- preserved EVM and Solana connection metadata in stamp payloads so wagmi connector metadata is not dropped
- added focused regression coverage for destructured core helpers, invalid callback providers, and EVM metadata preservation

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/react test && pnpm --filter @cubid/react typecheck && pnpm --filter @cubid/react build'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/evm test && pnpm --filter @cubid/evm typecheck && pnpm --filter @cubid/evm build && pnpm --filter @cubid/solana typecheck && pnpm --filter @cubid/wagmi typecheck'`

#### Follow-up

- commit and push the review fixes, comment with the solutions, resolve the PR threads, and recheck CI

### session: v108

- timestamp: 2026-04-29T17:57:47Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`397c376`**
- session name: **Start E03 actor identity model**

#### Objective

Start E03 to add human, agent, and organization self-identification support with MCP-compatible trust interfaces while preserving human proof-of-personhood as the primary validation focus.

#### Actions Taken

- created a fresh E03 branch from `dev`
- marked `E03` started in `agent-context/todo.md`
- inspected `@cubid/identity`, `@cubid/claims`, OIDC contracts, and existing docs to place the actor model in shared domain packages rather than app-local code
- locked the implementation direction: humans receive deep validation/scoring; agents and organizations are represented and can claim stamps, but receive limited generic validation by default

#### Verification

- confirmed the branch starts from current `dev` and the repository was clean before E03 metadata changes

#### Follow-up

- implement the shared actor identity model, MCP trust response contracts, minimal OIDC claim definitions, docs, tests, and closeout metadata

### session: v118

- timestamp: 2026-04-30T08:45:06Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`b5e1f0c`**
- session name: **Address PR 152 actor identity review feedback**

#### Objective

Resolve the actionable Copilot and Codex review comments on PR #152 before continuing the E03/E04 merge flow.

#### Actions Taken

- defaulted agent self-identification to a standalone affiliation when callers omit affiliation metadata
- renamed misleading actor normalization test wording and added coverage for the standalone default
- tightened the actor profile migration grant from `all` to explicit service-role DML privileges
- switched actor profile API route imports to the Passport path alias
- fixed Profile actor-profile loading and form behavior so authenticated users without Redux email/phone can load profiles, current form selections drive policy copy, and hidden agent affiliation fields are not submitted after relationship switches

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/identity test && pnpm --filter @cubid/identity typecheck && pnpm --filter @cubid/passport test && pnpm --filter @cubid/passport typecheck'`
- `npx -p node@24 -c 'node --version && pnpm test && pnpm typecheck'`

#### Follow-up

- commit and push the PR review fixes, reply to and resolve review threads, then re-check PR state

### session: v124

- timestamp: 2026-04-30T21:17:54Z
- agent: **OpenAI Codex**
- branch: **codex/sdk-ingestion-private-repo-cleanup**
- head: **`7bbdc41`**
- session name: **Point SDK docs at canonical public repo**

#### Objective

Align the private-repo SDK docs with the canonical public SDK repository name before committing the follow-up doc cleanup.

#### Actions Taken

- updated the SDK publishing and integration docs to point at `Cubid-Me/cubid-sdk`
- kept the change scoped to documentation references only
- left the larger SDK ingestion cleanup in the prior commit unchanged

#### Verification

- `git diff --check`

#### Follow-up

- commit the four engineering-doc files plus this session-log entry

### session: v123

- timestamp: 2026-04-30T15:23:55Z
- agent: **OpenAI Codex**
- branch: **dev**
- head: **`8e9a4fe`**
- session name: **Mark SDK work ingested into public repo**

#### Objective

Validate the repo-side cleanup after `@cubid/core` moved to the public SDK repo, remove the remaining private-repo publication path, and commit the boundary documentation updates.

#### Actions Taken

- reviewed dirty roadmap and engineering-doc changes that mark E02 SDK todos as ingested into `/Users/botmaster/src/cubid/cubid-sdk-v2`
- removed the manual package publishing workflow from `cubid-passport`
- updated README, AGENTS, package docs, and SDK target-state docs so future agents treat `cubid-sdk-v2` as the canonical public SDK implementation and publication home
- retained `packages/core` as a historical implementation snapshot for migration context while removing its npm `publishConfig`

#### Verification

- `npx -p node@24 -c 'node --version && pnpm check:core-snapshot && pnpm lint && pnpm typecheck && pnpm test && pnpm build'`
- `git diff --check`

#### Follow-up

- commit the private-repo cleanup, then continue public SDK publication work from `cubid-sdk-v2`

### session: v122

- timestamp: 2026-04-30T12:33:37Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-core-apache-license**
- head: **`a4201e6`**
- session name: **Add Apache-2.0 license to core SDK**

#### Objective

Add an explicit Apache-2.0 license to the public `@cubid/core` SDK package without relicensing the private monorepo apps and services.

#### Actions Taken

- created a fresh feature branch from updated `dev`
- changed `@cubid/core` npm and JSR metadata from `UNLICENSED` to `Apache-2.0`
- added a package-local Apache-2.0 license file to the published SDK artifact set
- updated SDK docs and publishing runbook copy to state the package-level license boundary

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core deno:check && pnpm --filter @cubid/core build && pnpm --filter @cubid/core pack:dry-run && pnpm --filter @cubid/core jsr:dry-run'`
- `git diff --check`

#### Follow-up

- commit and publish the license change through a PR to `dev`

### session: v121

- timestamp: 2026-04-30T12:18:51Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-core-publishing-setup**
- head: **`b6b0606`**
- session name: **Address PR 153 publishing runbook review**

#### Objective

Resolve Copilot review comments on PR #153 by making the publishing runbook less time-bound and moving the release-branch guard earlier in the workflow.

#### Actions Taken

- replaced point-in-time npm/auth status bullets with repeatable verification commands
- rewrote the agent-first-person runbook section as an impersonal repo-side task checklist
- moved the publish branch guard directly after checkout so mistaken release dispatches fail before setup and install work

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/core test && pnpm --filter @cubid/core typecheck && pnpm --filter @cubid/core deno:check && pnpm --filter @cubid/core build && pnpm --filter @cubid/core pack:dry-run && pnpm --filter @cubid/core jsr:dry-run'`
- `git diff --check`

#### Follow-up

- commit, push, reply to the three review threads, and resolve them

### session: v120

- timestamp: 2026-04-30T09:05:06Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-core-publishing-setup**
- head: **`339dcf3`**
- session name: **Close E02.1 repo-side core publishing setup**

#### Objective

Close the repo-side E02.1 package setup while keeping the npm/JSR account-owner first release as an explicit follow-up.

#### Actions Taken

- marked E02.1 completed against the repo-side publishing setup commit
- added `E02.1.1` for the registry-side first release and trusted-publisher activation steps that require human npm/JSR ownership
- kept live package publication out of this commit because `@cubid/core` is not yet published and registry setup requires account-owner action

#### Verification

- confirmed E02.1 now points at setup commit `339dcf3`
- confirmed E02.1.1 captures the remaining npm/JSR release work as a separate todo

#### Follow-up

- open a PR for the publishing setup, merge to `dev`, then have a Cubid npm/JSR owner complete E02.1.1 using the runbook

### session: v119

- timestamp: 2026-04-30T09:03:20Z
- agent: **OpenAI Codex**
- branch: **codex/e02-1-core-publishing-setup**
- head: **`5ac2004`**
- session name: **Harden core package publishing setup**

#### Objective

Prune stale feature branches and tighten the `@cubid/core` npm/JSR publishing path so registry setup can proceed through official Cubid-owned accounts and GitHub Actions trusted publishing.

#### Actions Taken

- pruned stale local branches from the earlier A/B/C rollout stacks
- deleted stale remote feature branches for closed/superseded PRs
- verified `@cubid/core` is not yet published on npm and that the local machine is not authenticated to npm
- added a release-branch guard and tool-version logging to the manual publish workflow
- added an operator runbook for npm organization setup, trusted publishing, JSR linking, and the first-version bootstrap decision

#### Verification

- `npm view @cubid/core --json` returned npm 404, confirming the package is not yet published
- `npm whoami` returned `ENEEDAUTH`, confirming no local npm publish identity is active
- `pnpm --filter @cubid/core pack:dry-run`
- `pnpm --filter @cubid/core jsr:dry-run`

#### Follow-up

- merge the publishing setup changes, then have a Cubid npm/JSR owner complete the registry-side setup before running the manual publish workflow from `dev`

### session: v109

- timestamp: 2026-04-29T18:00:37Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`7e305fc`**
- session name: **Implement E03 actor identity contracts**

#### Objective

Implement shared human, agent, and organization identity contracts with MCP-compatible trust envelopes while keeping deep validation and humanity scoring focused on humans.

#### Actions Taken

- added `@cubid/identity` actor self-identification types, normalization helpers, validation-policy defaults, score/stamp eligibility helpers, and `cubid-mcp-trust:v1` response contracts
- added tests proving organizations and agents are self-identified, non-human actors are not personhood-score eligible, and MCP trust responses suppress non-human score contribution
- added actor self-identification claims to `@cubid/claims` under `cubid:claims`
- documented the actor identity model and aligned the OIDC architecture doc with the E03 shared-contract boundary

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/identity test && pnpm --filter @cubid/identity typecheck && pnpm --filter @cubid/claims test && pnpm --filter @cubid/claims typecheck && pnpm --filter @cubid/identity build && pnpm --filter @cubid/claims build'`

#### Follow-up

- commit the E03 implementation, then mark E03 completed with the implementation head

### session: v110

- timestamp: 2026-04-29T18:01:00Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`7437c4c`**
- session name: **Close E03 actor identity model**

#### Objective

Mark E03 completed after the shared actor self-identification contracts, MCP trust envelope, claims, docs, and tests landed.

#### Actions Taken

- updated `agent-context/todo.md` with the E03 completion timestamp
- recorded the implementation commit as the E03 head
- attached the start, implementation, and closeout session-log references to the todo

#### Verification

- confirmed E03 metadata points at implementation head `7437c4c`

#### Follow-up

- publish the branch for review, then consider a later runtime slice for persistence and UI onboarding for agent and organization actors

### session: v111

- timestamp: 2026-04-29T19:10:46Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`df7761f`**
- session name: **Start E04 actor onboarding persistence**

#### Objective

Start E04 as the runtime persistence and onboarding slice for human, agent, and organization self-identification, building on the E03 shared actor identity contracts.

#### Actions Taken

- marked `E04` started in `agent-context/todo.md`
- kept the work on the existing E03 feature branch because this slice is stacked directly on the actor identity model contracts
- scoped E04 to authenticated Passport persistence, Profile onboarding, and documentation for self-identified actor types rather than full global onboarding redesign

#### Verification

- confirmed the repository was clean before E04 metadata changes

#### Follow-up

- add actor profile persistence, authenticated Passport APIs, Profile UI onboarding, tests, docs, and closeout metadata

### session: v112

- timestamp: 2026-04-29T19:18:11Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`26b17c4`**
- session name: **Implement E04 actor profile persistence and onboarding**

#### Objective

Add the first runtime persistence and Passport onboarding surface for self-identified human, agent, and organization actors.

#### Actions Taken

- added a locked `public.actor_profiles` migration with one service-role-owned profile per Firebase user
- added authenticated Passport actor profile get/upsert APIs using the shared Passport API baseline
- added Passport Profile UI for choosing human, agent, or organization identity type with visible trust-policy copy
- wired Passport to `@cubid/identity` so runtime responses use the E03 validation-policy contracts
- added Passport route tests for default human profiles, organization persistence, agent affiliation persistence, and contradictory metadata rejection
- updated the actor identity engineering doc with E04 persistence, API, and onboarding boundaries

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport typecheck'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/identity test && pnpm --filter @cubid/identity typecheck'`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport build'`

#### Follow-up

- mark E04 completed after the implementation commit lands

### session: v113

- timestamp: 2026-04-29T19:18:41Z
- agent: **OpenAI Codex**
- branch: **codex/e03-actor-identity-model**
- head: **`4b42692`**
- session name: **Close E04 actor onboarding persistence**

#### Objective

Close E04 after actor profile persistence, authenticated Passport APIs, Profile onboarding UI, docs, and tests landed.

#### Actions Taken

- marked `E04` completed in `agent-context/todo.md`
- recorded implementation head `4b42692`
- attached the E04 start, implementation, and closeout session-log references

#### Verification

- confirmed the E04 implementation commit exists at `4b42692`

#### Follow-up

- publish the stacked E03/E04 branch for review, or continue with the next identity runtime slice if desired

### session: v137

- timestamp: 2026-04-30T23:48:51Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`59cf2a5`**
- session name: **Wire E01 disclosure grant persistence**

#### Objective

Continue E01 by wiring existing Allow Page and OIDC consent approval paths into the new app-scoped identity and selective-disclosure persistence contract.

#### Actions Taken

- mirrored OIDC consent approval into `app_scoped_subjects`, `selective_disclosure_grants`, and `selective_disclosure_events` without changing OIDC wire responses
- persisted Allow Page stamp permission grants into the same disclosure contract while keeping legacy `stamp_dappuser_permissions` writes intact
- added Passport app-scoped subject secret configuration and documented the runtime custody/rotation expectation
- sent an SDK-impact note to the canonical SDK repo for future public helper alignment

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/identity test`
- `pnpm --filter @cubid/passport test` attempted, but local Node 25 still hits the known `buffer-equal-constant-time` / `SlowBuffer` crash before Passport route tests execute; rerun under Node 24 CI/local shell for the final Passport test signal

#### Follow-up

- use the persisted disclosure grants to filter SDK-facing identity routes and webhook payloads in the next E01 slice

### session: v138

- timestamp: 2026-05-01T00:00:56Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`59a74d4`**
- session name: **Enforce E01 disclosure grants on SDK and webhook surfaces**

#### Objective

Continue E01 by using persisted selective-disclosure grants to filter dapp-facing identity, score, and webhook surfaces.

#### Actions Taken

- added a Passport disclosure-grant helper that loads active app-scoped subject grants and evaluates disclosed stamp claims
- filtered v2 identity and legacy dapp identity routes so only disclosed stamp values and disclosed email/phone fields are returned
- filtered dapp score and score-detail routes so undisclosed credentials do not contribute to app-visible score outputs
- gated internal webhook delivery on active disclosure grants so undisclosed stamp events are not sent to dapp subscriptions
- added focused Passport tests for active/revoked disclosure grant filtering and updated engineering docs
- sent an SDK-impact note to the canonical SDK repo for normalized privacy-limited result handling

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- define and implement explicit grant taxonomy for location, profile, and other non-stamp identity claims before filtering those routes
- consider adding app-visible normalized states such as `notGranted`, `notVerified`, and `notFound` in the public SDK

### session: v139

- timestamp: 2026-05-01T00:42:54Z
- agent: **OpenAI Codex**
- branch: **codex/e01-app-scoped-identity-disclosure**
- head: **`015b373`**
- session name: **Address PR 155 disclosure and app-scoped identity review comments**

#### Objective

Address Copilot and Codex review feedback on PR #155 before returning the branch to review.

#### Actions Taken

- preserved legacy stamp permission visibility while app-scoped disclosure grants roll out
- replaced read-then-insert subject creation paths with idempotent upserts
- batched disclosure grant loading for webhook and expired-cron fanout paths
- revoked matching selective disclosure grants when Passport OIDC consent is revoked
- rolled back newly inserted stamp permission rows when disclosure grant persistence fails
- validated dapp user ownership before returning Cubid score details
- removed local machine SDK path references from public-facing docs

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/oidc typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- push the review-fix commit, confirm CI, then reply to and resolve the addressed PR #155 review threads

### session: v140

- timestamp: 2026-05-01T08:03:51Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`63303ad`**
- session name: **Add E01 profile and location disclosure taxonomy**

#### Objective

Continue E01 by making profile and non-stamp location claims explicit in the selective-disclosure contract, then tighten dapp-facing route filters around those grants.

#### Actions Taken

- added Passport disclosure helpers for `profile:name`, `location:rough`, `location:approximate`, `location:exact`, and wildcard namespace grants
- sanitized legacy dapp identity user payloads instead of spreading raw user rows back to integrators
- gated exact, approximate, and rough location routes on matching disclosure claim granularity
- prevented approximate location responses from returning raw address objects
- documented the profile/location claim taxonomy and sent an SDK-impact handoff note to the canonical SDK repo

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- add user-facing non-OIDC app disclosure history and revocation views so users can inspect and revoke Allow Page grants outside the OIDC consent panel

### session: v141

- timestamp: 2026-05-01T08:55:58Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`3123f99`**
- session name: **Add non-OIDC app disclosure grant history and revocation**

#### Objective

Continue E01 by adding user-facing visibility and revocation for Allow Page disclosure grants outside the OIDC consent panel.

#### Actions Taken

- added Passport user APIs for listing and revoking non-OIDC Allow Page disclosure grants
- added a Profile “App disclosure grants” card showing app, scopes, claims, policy/version metadata, data classifications, and revoked state
- made Allow Page grant revocation update `selective_disclosure_grants`, emit `selective_disclosure_events`, and remove matching legacy stamp permissions
- added Passport route coverage for list/revoke behavior and extended the test Supabase mock for disclosure grants
- updated E01 engineering docs and sent an SDK-impact handoff note to the canonical SDK repo

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- yeet the E01 branch for review when ready, or close E01 metadata after the PR merges if this is the final E01 implementation slice

### session: v142

- timestamp: 2026-05-03T00:00:16Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`00113f3`**
- session name: **Reframe E02 around API v3 backend hardening**

#### Objective

Update stale E02 roadmap language so it reflects the current split between backend API ownership in `cubid-passport` and public SDK ownership in `Cubid-Me/cubid-sdk`.

#### Actions Taken

- retitled E02 around API v3 developer platform contracts, review, and hardening
- preserved E02.1-E02.4 as SDK-ingested historical work rather than active private-repo implementation targets
- added backend-owned E02.5-E02.8 todos for API v3 inventory, route hardening, webhook contracts, and SDK-impact coordination
- created `docs/engineering/api-v3-developer-platform.md` as the backend-owned API v3 contract target
- updated the SDK target-state doc so it points active E02 backend work at the API v3 engineering doc

#### Verification

- checked there were no incoming SDK-agent messages in `agent-context/messages-from-cubid-sdk/`
- `git diff --check`

#### Follow-up

- implement E02.5 next to inventory and define the canonical API v3 contract in this repo before changing route behavior

### session: v143

- timestamp: 2026-05-03T00:05:30Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`4c1a9ca`**
- session name: **Define E02.5 API v3 backend contract**

#### Objective

Start and complete E02.5 by inventorying the current API v3 backend routes and locking the canonical contract before changing route behavior.

#### Actions Taken

- checked for incoming SDK-agent messages before API v3 contract work and found none
- marked E02.5 completed on the current feature branch
- expanded `docs/engineering/api-v3-developer-platform.md` with route-by-route contracts for `/api/v3/save_secret`, `/api/v3/accounts/generate`, and `/api/v3/accounts/list`
- documented API v3 dapp authentication, v2 legacy posture, structured error expectations, secret non-exposure rules, and retry/idempotency expectations
- kept the change documentation-only, so no outbound SDK handoff note was required

#### Verification

- `git diff --check`

#### Follow-up

- implement E02.6 next to harden API v3 route behavior against the contract defined in E02.5

### session: v144

- timestamp: 2026-05-03T00:35:03Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`6dd342e`**
- session name: **Harden E02.6 API v3 route behavior**

#### Objective

Complete E02.6 by tightening the active API v3 backend routes against the canonical E02.5 contract before changing or adding broader developer-platform behavior.

#### Actions Taken

- added a service-role-only `api_idempotency_keys` migration for API v3 write replay protection
- added a shared Passport API v3 idempotency helper that requires `Idempotency-Key`, hashes canonical request bodies, replays completed responses, and rejects conflicting or pending keys
- wired idempotency into `/api/v3/save_secret` and `/api/v3/accounts/generate` without changing success payload shapes
- expanded Passport route tests for v3 auth failures, dapp ownership, idempotent replay, conflict and pending-key errors, no secret/private-key exposure, chain filtering, and partial-failure cleanup
- updated the API v3 engineering doc and wrote an SDK-agent handoff note for the new idempotency contract
- marked E02.6 completed in the roadmap

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- implement E02.7 next to standardize API v3 webhook contracts and delivery semantics

### session: v145

- timestamp: 2026-05-03T00:40:34Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`7f8aa93`**
- session name: **Standardize E02.7 API v3 webhook contracts**

#### Objective

Complete E02.7 by standardizing API v3 webhook payloads, signatures, replay-protection inputs, delivery metadata, disclosure filtering, and SDK coordination.

#### Actions Taken

- added shared API v3 webhook helpers for canonical event names, payload construction, v1 signatures, replay headers, and delivery error classification
- updated internal webhook trigger paths to deliver v3 protocol payloads with `X-Cubid-Event-Id`, `X-Cubid-Timestamp`, `X-Cubid-Signature-Version`, and `X-Cubid-Signature`
- added migration fields for webhook event ids, API/payload versions, request bodies, redacted request headers, and signature version metadata
- preserved disclosure-gated delivery and expanded Passport tests for signed payloads, undisclosed-stamp skips, failure attempts, retry metadata, and redaction of internal identifiers
- updated the API v3 engineering doc and wrote an SDK-agent handoff note for webhook verification/docs follow-up
- marked E02.7 completed in the roadmap

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- implement E02.8 next to reconcile SDK-impact notes and close the API v3 developer-platform coordination loop

### session: v146

- timestamp: 2026-05-03T00:43:54Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`5b0504b`**
- session name: **Coordinate E02.8 public SDK impact for API v3**

#### Objective

Close E02.8 by confirming API v3 SDK-impact coordination is recorded without moving public SDK implementation back into `cubid-passport`.

#### Actions Taken

- checked `agent-context/messages-from-cubid-sdk/` and confirmed there were no incoming SDK-agent notes to address
- confirmed the SDK workspace contains outbound handoff notes for E02.6 idempotency and E02.7 webhook contract changes
- recorded the SDK coordination ledger in `docs/engineering/api-v3-developer-platform.md`
- marked E02.8 completed and closed the E02 backend API v3 review/hardening track in the roadmap

#### Verification

- `find agent-context/messages-from-cubid-sdk -type f -maxdepth 2 -print`
- `git -C /Users/botmaster/src/cubid/cubid-sdk-v2 status --short -- agent-context/messages-from-cubid-passport`
- `git diff --check`

#### Follow-up

- either yeet this feature branch for review or continue with the next backend-owned developer-platform track after E02

### session: v147

- timestamp: 2026-05-03T01:01:37Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`b5dc1ec`**
- session name: **Address PR 156 Copilot review feedback**

#### Objective

Address Copilot review comments on PR 156 before requesting Codex review.

#### Actions Taken

- made failed API v3 idempotency records re-claimable through a conditional pending transition before retrying write side effects
- added regression coverage for retrying a failed idempotent `save_secret` request
- updated the webhook migration to replace the legacy one-row-per-event delivery uniqueness constraint with one-row-per-attempt uniqueness
- replaced machine-local SDK handoff paths in the API v3 engineering doc with SDK-repo-relative references

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- push the Copilot fixes, confirm CI is green again, reply to and resolve the review threads, then request Codex review if no Codex review exists yet

### session: v148

- timestamp: 2026-05-03T01:07:47Z
- agent: **OpenAI Codex**
- branch: **codex/e01-disclosure-claim-taxonomy**
- head: **`c0f9bf3`**
- session name: **Tighten failed API v3 idempotency semantics**

#### Objective

Address the Codex review finding that failed idempotency records must not re-run writes after possible partial side effects.

#### Actions Taken

- changed non-expired failed API v3 idempotency records to return terminal `409 idempotency_failed` instead of retrying the handler
- preserved conditional reclaim only for expired idempotency records, where the original retention contract has elapsed
- updated Passport route tests so failed-key retries prove no additional secret row is written

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- push the terminal failed-idempotency fix, confirm CI is green, then reply to and resolve the Copilot and Codex review threads

### session: v149

- timestamp: 2026-05-03T13:44:24Z
- agent: **OpenAI Codex**
- branch: **codex/e01-closeout-reconciliation**
- head: **`87013e2`**
- session name: **Close out E01 app-scoped disclosure foundation**

#### Objective

Reconcile E01 after PR 156 merged and decide whether the parent app-scoped identity and selective-disclosure todo should remain open or be split into precise follow-ups.

#### Actions Taken

- verified the merged runtime covers Allow Page grant persistence, OIDC consent mirroring, SDK-facing route filtering, webhook filtering, profile/location claim taxonomy, and user-facing non-OIDC disclosure history/revocation
- marked E01 completed in the roadmap
- added `E01.1` for production backfill and retirement of the legacy `stamp_dappuser_permissions` compatibility fallback
- added `E01.2` for Admin/Ops visibility into app-scoped subjects, disclosure grants, and grant/revoke events
- updated the E01 engineering doc from foundation/adoption-sequence language to implemented-status language with rollout follow-ups

#### Verification

- `git status -sb`
- `rg -n "Status: (Started|Not started)|^## [A-Z][0-9]|^### [A-Z][0-9]" agent-context/todo.md`
- reviewed `docs/engineering/app-scoped-identity-selective-disclosure.md`

#### Follow-up

- tackle `E01.1` next if the priority is production rollout safety, or `E01.2` next if operators need visibility before disabling legacy fallback behavior

### session: v150

- timestamp: 2026-05-03T13:54:17Z
- agent: **OpenAI Codex**
- branch: **codex/e01-closeout-reconciliation**
- head: **`d483ab1`**
- session name: **Retire legacy disclosure fallback**

#### Objective

Complete `E01.1` by adding the production backfill path for legacy stamp permissions and making selective-disclosure grants the only runtime authorization source for app-facing disclosure.

#### Actions Taken

- added a Passport dry-run/write script to backfill `stamp_dappuser_permissions` into `selective_disclosure_grants`
- removed legacy stamp-permission fallback reads from disclosure grant loading and stamp filtering
- updated webhook and disclosure tests so SDK-facing and webhook outputs require grant-backed disclosure
- updated the engineering doc, Passport script contract, roadmap metadata, and SDK handoff note

#### Verification

- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- run the backfill script in production dry-run mode before write mode, then consider `E01.2` for Admin/Ops disclosure visibility

### session: v151

- timestamp: 2026-05-03T17:20:46Z
- agent: **OpenAI Codex**
- branch: **codex/e01-closeout-reconciliation**
- head: **`44e6eb5`**
- session name: **Add disclosure operations visibility**

#### Objective

Complete `E01.2` by adding read-only Admin/Ops visibility for app-scoped subjects, selective-disclosure grants, and disclosure grant/revoke events.

#### Actions Taken

- added a disclosure operations server mapper and Admin overview API under the shared Admin security baseline
- added a read-only `Disclosure Ops` Admin tab with grant health, dapp summaries, OIDC-client summaries, and redacted recent events
- added tests for disclosure ops aggregation/redaction and route baseline wiring
- updated the E01 engineering doc and roadmap metadata to reflect the completed operations visibility slice

#### Verification

- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- yeet the E01 closeout branch for review, then start the next platform slice from `dev`

### session: v152

- timestamp: 2026-05-03T20:54:11Z
- agent: **OpenAI Codex**
- branch: **codex/e01-closeout-reconciliation**
- head: **`6b99aa6`**
- session name: **Address PR 157 disclosure ops review**

#### Objective

Address Copilot and Codex review comments on PR 157 before completing the yeet review flow.

#### Actions Taken

- replaced Disclosure Ops sample-derived totals with service-role SQL aggregate functions for grant totals, active subject counts, 7-day event counts, dapp summaries, and OIDC-client summaries
- changed the Admin overview payload so sampled recent grants are labeled as samples rather than scanned totals
- paginated the legacy stamp-permission backfill script and batched reference lookups per page
- updated tests and engineering docs for the aggregate-backed operations contract

#### Verification

- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin build`
- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `git diff --check`

#### Follow-up

- push the review fixes, confirm CI is green again, reply to and resolve the Copilot and Codex review threads

### session: v153

- timestamp: 2026-05-03T21:21:07Z
- agent: **OpenAI Codex**
- branch: **codex/c05-2-1-sui-v3-custody**
- head: **`77b7290`**
- session name: **Add Sui v3 blockchain custody support**

#### Objective

Complete `C05.2.1` by adding Sui to the v3 custodial blockchain account surface while preserving the C05 envelope-encryption and non-exposure rules.

#### Actions Taken

- added `@mysten/sui` to the Passport workspace and wired Sui Ed25519 account generation into the shared v3 blockchain custody helper
- added Sui to the v3 account generate/list validation schemas and the supported-chain metadata migration path
- updated helper, route, and docs coverage so Sui private keys remain encrypted-only and public addresses are normalized as lowercase `0x` values
- created a handoff note for the public SDK agents because `chain: "sui"` is an additive API v3 SDK-facing capability

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- yeet the C05.2.1 branch for review, then continue with `C05.1.1` public dapp-user-secret legacy table quarantine or the next API v3 custody hardening slice

### session: v154

- timestamp: 2026-05-03T21:21:47Z
- agent: **OpenAI Codex**
- branch: **codex/c05-2-1-sui-v3-custody**
- head: **`07417d1`**
- session name: **Close C05.2.1 metadata**

#### Objective

Record the implementation commit for `C05.2.1` after the Sui v3 custody slice landed and passed validation.

#### Actions Taken

- updated `agent-context/todo.md` so `C05.2.1` references implementation commit `07417d1`
- kept the follow-up SDK handoff note in the public SDK repo message queue for SDK agents to consume

#### Verification

- `git diff --check`

#### Follow-up

- yeet the C05.2.1 branch for review, then continue with `C05.1.1` or the next API v3 custody hardening slice

### session: v155

- timestamp: 2026-05-03T21:26:52Z
- agent: **OpenAI Codex**
- branch: **codex/c05-2-1-sui-v3-custody**
- head: **`07f9378`**
- session name: **Quarantine legacy dapp user secret plaintext storage**

#### Objective

Complete `C05.1.1` by quarantining legacy public plaintext dapp-user-secret storage without dropping historical rows that may still need production backfill or audit review.

#### Actions Taken

- changed `/api/v2/save_secret` to return `410 endpoint_removed` instead of writing plaintext rows to `public.dapp_user_secrets`
- added a Supabase migration that revokes broad access to `public.dapp_user_secrets`, keeps `service_role` read-only access, and rejects new inserts, updates, and deletes
- updated Passport route tests to prove the v2 endpoint no longer writes plaintext and v3 remains the encrypted write path
- updated custody/security docs and created a public SDK handoff note because legacy v2 secret writes are no longer supported

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- physically remove the legacy public table only after production backfill, audit, and retention/export decisions are complete

### session: v156

- timestamp: 2026-05-03T21:27:46Z
- agent: **OpenAI Codex**
- branch: **codex/c05-2-1-sui-v3-custody**
- head: **`99e8c4e`**
- session name: **Close C05.1.1 metadata**

#### Objective

Record the implementation commit for `C05.1.1` after the legacy public dapp-user-secret quarantine landed and passed validation.

#### Actions Taken

- updated `agent-context/todo.md` so `C05.1.1` references implementation commit `99e8c4e`
- kept the physical table-removal follow-up deferred until production backfill, audit, and retention/export decisions are complete

#### Verification

- `git diff --check`

#### Follow-up

- yeet the C05 custody branch for review, or continue with a narrow post-backfill physical-removal todo once production verification is available

### session: v157

- timestamp: 2026-05-03T21:43:18Z
- agent: **OpenAI Codex**
- branch: **codex/c05-2-1-sui-v3-custody**
- head: **`67ee15a`**
- session name: **Address PR 158 removed endpoint review**

#### Objective

Address Codex review feedback on PR 158 so the removed `/api/v2/save_secret` endpoint still participates in the shared Passport route baseline.

#### Actions Taken

- routed the removed v2 secret endpoint through `handlePassportRoute` with an anonymous actor and explicit `POST` method contract
- preserved the `410 endpoint_removed` response while restoring CORS and `OPTIONS` preflight handling for browser callers
- added regression coverage for the removed endpoint's allowed-origin preflight response

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- commit and push the review fix, reply to and resolve the Codex thread, then re-check CI

### session: v158

- timestamp: 2026-05-03T21:45:21Z
- agent: **OpenAI Codex**
- branch: **codex/c05-2-1-sui-v3-custody**
- head: **`df02adb`**
- session name: **Address PR 158 Copilot custody comments**

#### Objective

Address the remaining Copilot review comments on PR 158 after the first removed-endpoint CORS fix was pushed.

#### Actions Taken

- adjusted the public dapp-user-secret quarantine trigger to reject inserts and updates without blocking cascaded cleanup deletes
- updated custody docs to clarify that deletes remain available for `ON DELETE CASCADE` cleanup
- added a Sui list/filter regression test for API v3 generated account listing

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 -c 'node --version && pnpm --filter @cubid/passport test'`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- commit and push the Copilot fixes, reply to and resolve all review threads, then re-check CI

### session: v159

- timestamp: 2026-05-05T01:18:01Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`2bb7eda`**
- session name: **Specialize SIWC roadmap**

#### Objective

Keep the SIWC side-roadmap while replacing generic competitive guidance with repo-specific, metadata-backed todos.

#### Actions Taken

- rewrote `agent-context/siwc-todo.md` around current OIDC, passkey, disclosure, API v3 custody, and SDK-boundary reality
- added SIWC01-SIWC08 open todos with standard metadata blocks
- preserved the product positioning while marking implemented, different, and deferred work clearly

#### Verification

- `git diff --check`
- `git status --short`

#### Follow-up

- yeet the docs branch for review, then consider metadata-normalizing `C02` in `agent-context/todo.md`

### session: v160

- timestamp: 2026-05-05T01:21:18Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`f4fb0c1`**
- session name: **Promote and implement SIWC01 signing architecture**

#### Objective

Promote `SIWC01` from the SIWC side-roadmap into the main roadmap and define the first target architecture for API v3 signing and transaction authorization.

#### Actions Taken

- added the SIWC execution track and `SIWC01`-`SIWC08` child todos to `agent-context/todo.md`
- marked `SIWC01` started in both the main roadmap and side roadmap
- created `docs/engineering/siwc-v3-signing-architecture.md` as the signing and transaction authorization target-state source of truth
- locked the first implementation direction as phased server-side custodial signing backed by existing Vault-encrypted API v3 private-key custody

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- close `SIWC01` metadata with the implementation commit SHA, then immediately start `SIWC02`

### session: v161

- timestamp: 2026-05-05T01:23:41Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`008934d`**
- session name: **Close SIWC01 and start SIWC02**

#### Objective

Close the completed SIWC signing-architecture todo and immediately start the next SIWC policy-control todo.

#### Actions Taken

- marked `SIWC01` completed in both the main roadmap and the SIWC side roadmap
- recorded implementation head `008934d` for `SIWC01`
- marked `SIWC02` started on `codex/siwc-roadmap-cleanup`

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- implement `SIWC02` by designing and adding Admin policy controls for app-scoped custody and signing

### session: v162

- timestamp: 2026-05-05T23:41:16Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`4f9fb04`**
- session name: **Implement SIWC02 Admin policy controls**

#### Objective

Implement the Admin control-plane slice for app-scoped custody and signing policies without adding signing execution.

#### Actions Taken

- added the `siwc_signing_policies` migration with fail-closed defaults and service-role-only access
- added Admin SIWC policy list/upsert APIs using the shared Admin API baseline
- added Admin SIWC policy repository helpers, schemas, tests, and audit-event writing
- added the `SIWC Policy` Admin tab for custody/signing policy visibility and editing
- documented the concrete SIWC02 policy contract in the signing architecture doc

#### Verification

- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- close `SIWC02` metadata with the implementation commit SHA, then immediately start `SIWC03`

### session: v163

- timestamp: 2026-05-05T23:41:40Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`a968016`**
- session name: **Close SIWC02 and start SIWC03**

#### Objective

Close the completed SIWC Admin policy-control todo and immediately start the next Passport account-visibility todo.

#### Actions Taken

- marked `SIWC02` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `a968016` for `SIWC02`
- marked `SIWC03` started on `codex/siwc-roadmap-cleanup`

#### Verification

- `git diff --check`

#### Follow-up

- implement `SIWC03` by adding Passport user-facing visibility for app-scoped custody accounts without exposing private or encrypted custody material

### session: v164

- timestamp: 2026-05-06T08:30:48Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`4203c6c`**
- session name: **Implement SIWC03 Passport account visibility**

#### Objective

Add Passport user-facing visibility for app-scoped custody accounts without exposing private or encrypted custody material.

#### Actions Taken

- added an authenticated Passport SIWC account visibility helper and `POST /api/siwc/accounts/list`
- added a Profile `App-scoped accounts` card showing app, chain, public address, custody/signing policy status, and timestamps
- extended Passport tests and mocks for user-owned account visibility, policy metadata, empty state, auth failure, and secret redaction
- documented the SIWC03 visibility contract in `docs/engineering/siwc-v3-signing-architecture.md`

#### Verification

- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- close `SIWC03` metadata with the implementation commit SHA, then immediately start `SIWC04`

### session: v165

- timestamp: 2026-05-06T08:31:22Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`774cd64`**
- session name: **Close SIWC03 and start SIWC04**

#### Objective

Close the completed SIWC Passport account-visibility todo and immediately start the v3 signing request lifecycle todo.

#### Actions Taken

- marked `SIWC03` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `774cd64` for `SIWC03`
- marked `SIWC04` started on `codex/siwc-roadmap-cleanup`

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- implement `SIWC04` by adding the backend signing request lifecycle guarded by Admin policy and Passport approval

### session: v166

- timestamp: 2026-05-06T08:56:28Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`a58b735`**
- session name: **Implement SIWC04 signing request lifecycle**

#### Objective

Implement the first API v3 signing request lifecycle with Admin policy checks, Passport user approval, passkey ACR enforcement, and safe server-side signing for supported message flows.

#### Actions Taken

- added the `siwc_signing_requests` migration and service-role-only storage contract
- added dapp-facing API v3 signing request create/get/list/cancel routes with idempotent creation
- added Passport user-facing signing request list/approve/reject routes and Profile approval visibility
- implemented policy evaluation, passkey-backed OIDC session step-up checks, encrypted private-key decrypt, and EVM/NEAR/Solana/Sui message signing plus EVM typed-data signing
- kept transaction signing policy-denied until SIWC05 risk controls
- updated API v3 and SIWC architecture docs and wrote the public SDK handoff note

#### Verification

- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport test`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport typecheck`
- `npx -y -p node@24 -p pnpm@10.33.0 pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- close `SIWC04` metadata with the implementation commit SHA, then immediately start `SIWC05`

### session: v167

- timestamp: 2026-05-06T08:57:01Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`a41f6ee`**
- session name: **Close SIWC04 and start SIWC05**

#### Objective

Close the completed SIWC signing request lifecycle todo and immediately start the transaction-risk and policy-hardening follow-up.

#### Actions Taken

- marked `SIWC04` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `a41f6ee` for `SIWC04`
- marked `SIWC05` started on `codex/siwc-roadmap-cleanup`

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- implement `SIWC05` by adding transaction risk summaries, stricter policy evaluation, and passkey step-up hardening before enabling transaction signing

### session: v168

- timestamp: 2026-05-06T09:22:05Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`12f2d3f`**
- session name: **Implement SIWC05 transaction risk controls**

#### Objective

Add transaction risk summaries, stricter policy evidence, and fresh passkey step-up checks before any SIWC transaction signing is enabled.

#### Actions Taken

- added service-role-only signing request risk metadata for risk level, risk reasons, policy decision, transaction recipient/contract/value, and step-up requirement
- added conservative transaction risk evaluation for EVM transaction payloads and fail-closed unsupported-chain handling for NEAR, Solana, and Sui transactions
- enforced transaction value limits and contract allowlists in policy denial details while keeping all transaction signing disabled
- hardened Passport signing approval so passkey ACR sessions must be fresh and step-up failures are audited
- updated Profile signing-request visibility, SIWC/API v3 docs, Passport tests, and the public SDK handoff note

#### Verification

- `npx -p node@24 node $(which pnpm) --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `npx -p node@24 node $(which pnpm) --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- close `SIWC05` metadata with the implementation commit SHA, then start `SIWC06`

### session: v169

- timestamp: 2026-05-06T09:22:33Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`313f4a5`**
- session name: **Close SIWC05 and start SIWC06**

#### Objective

Close the completed SIWC transaction-risk todo and immediately start the signing/webhook contract follow-up.

#### Actions Taken

- marked `SIWC05` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `313f4a5` for `SIWC05`
- marked `SIWC06` started on `codex/siwc-roadmap-cleanup`

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- implement `SIWC06` by standardizing signing and wallet webhook contracts with SDK handoff notes

### session: v170

- timestamp: 2026-05-06T10:24:29Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`82fcdd6`**
- session name: **Implement SIWC06 signing webhook contracts**

#### Objective

Extend the API v3 webhook contract to cover app-scoped custody and SIWC signing lifecycle events without enabling transaction signing.

#### Actions Taken

- added canonical SIWC wallet webhook event names and seeded them into `webhook_types`
- added a shared SIWC webhook delivery helper that reuses v3 payloads, signatures, delivery attempts, encrypted webhook secrets, and best-effort failure handling
- emitted wallet/signing webhooks from account generation, signing request creation, policy denial, approval, rejection, cancellation, step-up failure, and signature completion/failure paths
- updated Admin SIWC policy event choices, API v3/SIWC docs, Passport route tests, and the public SDK handoff note

#### Verification

- `npx -p node@24 node $(which pnpm) --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/admin typecheck`
- `npx -p node@24 node $(which pnpm) --filter @cubid/passport build`
- `npx -p node@24 node $(which pnpm) --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- close `SIWC06` metadata with the implementation commit SHA, then start `SIWC07`

### session: v171

- timestamp: 2026-05-06T10:25:43Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`82fcdd6`**
- session name: **Close SIWC06 and start SIWC07**

#### Objective

Close the SIWC webhook contract todo after validation and immediately start the smart-account/session-key/paymaster roadmap follow-up.

#### Actions Taken

- marked `SIWC06` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `82fcdd6` for the wallet/signing webhook contract work
- marked `SIWC07` started on `codex/siwc-roadmap-cleanup`

#### Verification

- `git diff --check`

#### Follow-up

- implement `SIWC07` by evaluating smart accounts, session keys, and paymaster/gas sponsorship against Cubid's app-scoped custody model

### session: v172

- timestamp: 2026-05-06T10:39:53Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`338d035`**
- session name: **Implement SIWC07 smart-account roadmap evaluation**

#### Objective

Evaluate smart accounts, scoped session keys, and paymaster/gas sponsorship against Cubid's app-scoped custody model without changing runtime behavior.

#### Actions Taken

- documented that app-scoped generated custody accounts remain the near-term default account mode
- recommended smart accounts as a future optional EVM-first custody mode rather than a replacement for generated accounts
- defined session keys as future scoped, revocable child capabilities of app-scoped accounts
- defined paymasters as a later policy and billing product gated by transaction signing readiness and abuse controls
- created a public SDK handoff note explaining that future SDK support should use capability discovery

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- close `SIWC07` metadata with the implementation commit SHA, then start `SIWC08`

### session: v173

- timestamp: 2026-05-06T10:40:40Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`e3fec1a`**
- session name: **Close SIWC07 and start SIWC08**

#### Objective

Close the completed SIWC smart-account roadmap evaluation and immediately start the production-readiness runbook follow-up.

#### Actions Taken

- marked `SIWC07` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `e3fec1a` for the smart-account/session-key/paymaster recommendation
- marked `SIWC08` started on `codex/siwc-roadmap-cleanup`

#### Verification

- `git diff --check`

#### Follow-up

- implement `SIWC08` by building the production-readiness runbook for SIWC custody and signing

### session: v174

- timestamp: 2026-05-06T11:47:17Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`88203ac`**
- session name: **Implement SIWC08 custody signing runbook**

#### Objective

Create the production-readiness runbook for operating SIWC app-scoped custody and signing safely.

#### Actions Taken

- added a dedicated SIWC custody and signing production runbook
- documented custody exposure boundaries, Vault prerequisites, migration readiness, Admin policy operations, signing request triage, webhook operations, smoke tests, abuse monitoring, incident response, user support, and launch blockers
- updated the SIWC architecture status to point at the runbook closeout state

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- close `SIWC08` metadata with the implementation commit SHA and reconcile the parent SIWC roadmap status

### session: v175

- timestamp: 2026-05-06T11:49:35Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`969385a`**
- session name: **Close SIWC08 and SIWC roadmap**

#### Objective

Close the completed SIWC production-readiness runbook todo and reconcile the parent SIWC roadmap status.

#### Actions Taken

- marked `SIWC08` completed in both the main roadmap and SIWC side roadmap
- recorded implementation head `969385a` for the SIWC custody and signing runbook
- marked the parent `SIWC` roadmap completed now that SIWC01 through SIWC08 are closed
- updated the SIWC side-roadmap truth statement so it reflects the delivered signing foundation and deferred transaction/smart-account work

#### Verification

- `git diff --check`

#### Follow-up

- yeet the SIWC roadmap branch for review, or start a new follow-up track for transaction signing readiness after review

### session: v176

- timestamp: 2026-05-06T12:03:10Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`eba25d1`**
- session name: **Address PR 159 SIWC policy scope review**

#### Objective

Address the automated review finding that SIWC policy listing exposed all dapps instead of scoping to the authenticated admin.

#### Actions Taken

- changed `listSiwcPolicies` to accept the Admin request context and filter `dapps` by `admin_uid`
- updated the Admin SIWC policy list route to pass the authenticated context
- added a regression test proving another admin receives no policies for unrelated dapps

#### Verification

- `pnpm --filter @cubid/admin test -- siwcPolicies`
- planned follow-up validation with `pnpm --filter @cubid/admin typecheck`
- `git diff --check`

#### Follow-up

- push the review fix, comment on and resolve the PR review thread, then re-check CI

### session: v177

- timestamp: 2026-05-06T12:04:27Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`84c3969`**
- session name: **Address PR 159 Copilot wording comments**

#### Objective

Address Copilot review feedback about stale SIWC architecture and Profile copy.

#### Actions Taken

- updated the SIWC architecture intro to reflect that signing routes and Admin policy controls now exist
- changed the API surface section from future/candidate language to implemented route language
- removed the stale `pending_policy` state from the documented state machine
- updated Profile copy so users are not told signing requests are unavailable while the signing request card is live

#### Verification

- planned docs/UI copy validation with `git diff --check`
- planned focused validation with `pnpm --filter @cubid/passport typecheck`

#### Follow-up

- push the wording fix, reply to and resolve Copilot threads, then re-check CI

### session: v178

- timestamp: 2026-05-06T12:07:38Z
- agent: **OpenAI Codex**
- branch: **codex/siwc-roadmap-cleanup**
- head: **`855eebd`**
- session name: **Fix PR 159 Admin route test after SIWC policy scoping**

#### Objective

Fix the CI failure caused by the Admin route wiring test still expecting the old SIWC policy list helper signature.

#### Actions Taken

- updated the SIWC policy list route test to provide and expect the Admin request context
- kept the ownership-scoped runtime behavior introduced for the review fix

#### Verification

- planned focused validation with `pnpm --filter @cubid/admin test -- adminRoutes`
- planned follow-up validation with `pnpm --filter @cubid/admin typecheck`
- `git diff --check`

#### Follow-up

- push the CI fix and confirm PR checks return green

### session: v179

- timestamp: 2026-05-06T12:39:47Z
- agent: **OpenAI Codex**
- branch: **codex/future-ideas-reference**
- head: **`68cffea`**
- session name: **Add future ideas reference**

#### Objective

Create a deferred future-ideas reference and repo-local guidance for how agents should use it.

#### Actions Taken

- added `agent-context/future-ideas.md` with deferred feature-expansion ideas such as smart accounts, session keys, paymasters, transaction simulation, and SIWC sandboxing
- updated `AGENTS.md` so "what's next" recommendations use the future ideas file only after active todos and blockers are depleted
- updated `AGENTS.md` so repo-cleanup passes verify the future ideas file exists and remains clearly deferred
- noted that the global `~/.codex/skills` files were not edited because they live in the protected memory/skills area

#### Verification

- planned docs-only validation with `git diff --check`

#### Follow-up

- commit the documentation update and yeet if review is desired

### session: v180

- timestamp: 2026-05-06T22:48:47Z
- agent: **OpenAI Codex**
- branch: **codex/repo-cleanup-delivery-status**
- head: **`2ece33c`**
- session name: **Record repo cleanup delivery status**

#### Objective

Capture the repo cleanup assessment in durable docs and add a concrete hosted
Supabase delivery follow-up without applying hosted migrations.

#### Actions Taken

- added `agent-context/repo-status.md` with cleanup status across workflow,
  docs, tests, CI, Supabase, SDK boundary, and production readiness
- refreshed README environment/current-status wording so it no longer implies
  stale pre-monorepo priorities or unverified hardcoded-secret claims
- added `F01` to `agent-context/todo.md` for protected Supabase dev/preview
  migration deployment automation

#### Verification

- planned docs validation with `git diff --check`
- no hosted Supabase mutation or function deployment performed

#### Follow-up

- implement `F01` as the next cleanup/release-operations slice before applying
  hosted migrations to `CubidDev`

### session: v181

- timestamp: 2026-05-06T22:52:17Z
- agent: **OpenAI Codex**
- branch: **codex/repo-cleanup-delivery-status**
- head: **`c8e2618`**
- session name: **Add protected Supabase delivery workflow**

#### Objective

Implement the F01 hosted Supabase delivery mechanism and confirm whether it can
be safely run against `CubidDev`.

#### Actions Taken

- added `.github/workflows/supabase-deploy.yml` with pull-request migration
  dry-run support and manual `check` / `apply` dispatch modes
- added guarded project-ref and backup confirmation checks before apply mode
- added `docs/engineering/supabase-hosted-delivery.md` documenting target
  project, required GitHub secrets, backup posture, and operator steps
- updated repo-status and F01 metadata to reflect the implemented workflow and
  current deployment blocker

#### Verification

- confirmed linked Supabase project is `CubidDev` / `cggycnbvljcdptzyjpju`
- confirmed `supabase backups list` shows recent completed physical backups
- confirmed `supabase db push --dry-run --linked` lists 25 pending migrations
- confirmed there are no `supabase/functions` to deploy from this repo
- confirmed no repository or checked GitHub Environment `SUPABASE_ACCESS_TOKEN`
  secret is currently configured

#### Follow-up

- configure `SUPABASE_ACCESS_TOKEN` and reviewer protection on the selected
  GitHub Environment, then run the `Supabase Deploy` workflow in `check` mode
  before running `apply`

### session: v182

- timestamp: 2026-05-06T23:10:06Z
- agent: **OpenAI Codex**
- branch: **codex/repo-cleanup-delivery-status**
- head: **`99736d4`**
- session name: **Address PR 160 Supabase workflow review**

#### Objective

Address automated review feedback on the protected Supabase deployment
workflow before hosted migration checks are run from GitHub.

#### Actions Taken

- moved workflow dispatch inputs into environment variables before shell usage
  so untrusted input is handled as data, not interpolated script text
- added `SUPABASE_DB_PASSWORD` as a required GitHub Environment secret for
  hosted deploy runs
- passed the database password to `supabase link` so CI does not prompt or hang
- updated the hosted delivery runbook and F01 metadata with the additional
  secret requirement

#### Verification

- planned validation with workflow YAML parsing and `git diff --check`

#### Follow-up

- push the review fix, reply to the automated comments, and re-check PR 160 CI

### session: v183

- timestamp: 2026-05-06T23:11:36Z
- agent: **OpenAI Codex**
- branch: **codex/repo-cleanup-delivery-status**
- head: **`78d6242`**
- session name: **Address PR 160 Copilot workflow safeguards**

#### Objective

Address Copilot review feedback on implicit project targeting, check-mode
friction, and backup enforcement in the Supabase deployment workflow.

#### Actions Taken

- made `confirm_project_ref` optional for check mode and enforced it only for
  apply mode
- required `CUBID_SUPABASE_PROJECT_REF` in the selected GitHub Environment
  instead of falling back implicitly during workflow dispatch
- added an apply-mode backup assertion that fails when no completed Supabase
  backup exists in the last 36 hours
- updated the hosted delivery runbook and F01 metadata with the explicit
  environment variable and backup-check requirements

#### Verification

- planned validation with workflow YAML parsing and `git diff --check`

#### Follow-up

- push the safeguard fix, reply to and resolve review comments, then re-check
  PR 160 CI

### session: v184

- timestamp: 2026-05-09T22:24:18Z
- agent: **OpenAI Codex**
- branch: **codex/clearpass-verify-stamp**
- head: **`f520845`**
- session name: **Add ClearPass Verify stamp bridge**

#### Objective

Add ClearPass Verify as a third-party high-value KYC/personhood stamp without
turning it into Cubid-branded KYC, and coordinate the future SDK launcher work.

#### Actions Taken

- added canonical `clearpass_verify` stamp metadata, scoring seed data, and
  pending ClearPass verification session storage
- added Passport ClearPass start/callback pages backed by signed start and
  completion token verification
- mint sanitized ClearPass stamp data and disclosure grants without storing raw
  document, OCR, face, or biometric payloads
- added Passport tests, env examples, engineering docs, and an SDK handoff note

#### Verification

- `npx -p node@24 node $(which pnpm) --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm --filter @cubid/stamps test`
- `pnpm --filter @cubid/stamps typecheck`
- `git diff --check`

#### Follow-up

- SDK agents should add the public React ClearPass launcher from the handoff
  note in `Cubid-Me/cubid-sdk`

### session: v185

- timestamp: 2026-05-09T23:01:13Z
- agent: **OpenAI Codex**
- branch: **codex/clearpass-verify-stamp**
- head: **`08740ae`**
- session name: **Address ClearPass completion-token review**

#### Objective

Address PR 163 automated review feedback by ensuring ClearPass launcher tokens
cannot be replayed as provider completion proofs.

#### Actions Taken

- distinguished ClearPass start tokens from provider completion tokens with an
  explicit signed token-use field
- required callback completion tokens to be provider-signed, approved, and to
  include the provider verification id in the signed payload
- kept the callback `verification_id` query value as a consistency check only,
  and added regression coverage for start-token replay attempts

#### Verification

- `npx -p node@24 node $(which pnpm) --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- push the review fix, reply to and resolve the Codex review thread, then
  re-check PR 163 CI

### session: v186

- timestamp: 2026-05-09T23:04:44Z
- agent: **OpenAI Codex**
- branch: **codex/clearpass-verify-stamp**
- head: **`ff544e0`**
- session name: **Address ClearPass Copilot hardening review**

#### Objective

Address PR 163 Copilot review feedback around ClearPass session safety,
malformed-token handling, migration portability, and user-safe error pages.

#### Actions Taken

- schema-qualified the ClearPass session UUID default and added a processing
  status for atomic callback consumption
- made signed-token parsing fail closed for malformed payloads and validated
  completion-token callback origin
- consumed pending verification sessions before minting stamps to prevent
  concurrent replay duplicates
- replaced raw end-user error messages with request-id references while logging
  detailed server-side errors

#### Verification

- `npx -p node@24 node $(which pnpm) --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- push the Copilot hardening fix, reply to and resolve all review threads, and
  re-check PR 163 CI

### session: v187

- timestamp: 2026-05-13T21:29:24Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **pending**
- session name: **SmarTrust passkey wallet API request inbox note**

#### Objective

Record SmarTrust's request for Cubid passkey-backed wallet generation and
signing APIs so Cubid agents can unblock SmarTrust's Paytrie/Cubid escrow
todos.

#### Actions Taken

- created `agent-context/inbox/`
- added a SmarTrust request note describing the required EVM/Solana wallet
  generation, recovery, address lookup, transaction signing, message signing,
  EIP-712/permit signing, and passkey re-auth API surface
- instructed Cubid agents to reply into SmarTrust's `agent-context/inbox/`
  when the feature is available, explicitly referencing SmarTrust PT-12,
  PT-14, and PT-15

#### Verification

- `git diff --check`

#### Follow-up

- Cubid agents should answer back to SmarTrust with SDK/API version, exact
  methods, required envs, supported wallet families, signing payload support,
  unsupported actions, and smoke-test guidance.

### session: v188

- timestamp: 2026-05-13T21:47:17Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`54b6543`**
- session name: **Break SmarTrust passkey wallet request into SIWC todos**

#### Objective

Convert the SmarTrust passkey-powered wallet inbox note into precise Cubid
follow-up todos that reflect the current SIWC backend and SDK boundary.

#### Actions Taken

- added SIWC09-SIWC15 to the main roadmap and SIWC side roadmap
- split the request into passkey-approved account creation, wallet capability
  discovery, browser-safe error taxonomy, EVM transaction-signing pilot,
  Solana transaction readiness, public SDK coordination, and SmarTrust reply
  smoke work
- recorded that existing Cubid message signing and app-scoped custody surfaces
  already cover part of the request, while transaction signing and SDK release
  alignment remain the critical gaps

#### Verification

- `git diff --check`

#### Follow-up

- start SIWC09 when ready, then coordinate SDK-facing changes through
  `Cubid-Me/cubid-sdk` instead of adding public SDK code to this repo

### session: v189

- timestamp: 2026-05-13T21:51:36Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`bcb54a7`**
- session name: **Deduplicate SmarTrust SIWC todos**

#### Objective

Remove unnecessary duplication between the main roadmap and SIWC side roadmap
after the SmarTrust passkey-wallet request was broken into follow-up todos.

#### Actions Taken

- removed SIWC09-SIWC15 from `agent-context/todo.md`
- kept SIWC09-SIWC15 in `agent-context/siwc-todo.md` as the detailed source of
  truth for the SmarTrust wallet follow-up track
- left the main roadmap's completed SIWC parent and SIWC01-SIWC08 history
  intact

#### Verification

- `git diff --check`

#### Follow-up

- when implementing SmarTrust wallet follow-ups, start from
  `agent-context/siwc-todo.md` and promote only the active slice into the main
  roadmap if needed

### session: v190

- timestamp: 2026-05-13T21:53:42Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`99de69e`**
- session name: **Remove exact SIWC roadmap duplicates**

#### Objective

Keep `agent-context/todo.md` from duplicating SIWC side-roadmap entries word for
word.

#### Actions Taken

- compared SIWC entries in `agent-context/todo.md` and
  `agent-context/siwc-todo.md`
- removed exact duplicate SIWC03-SIWC08 entries from the main roadmap
- left SIWC01 and SIWC02 in place because they are overlapping history but not
  exact word-for-word duplicates

#### Verification

- `git diff --check`
- SIWC03-SIWC15 now appear only in `agent-context/siwc-todo.md`

#### Follow-up

- use `agent-context/siwc-todo.md` as the detailed SIWC source of truth unless
  a specific active SIWC slice needs to be promoted into the main roadmap

### session: v191

- timestamp: 2026-05-14T00:09:05Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`727da38`**
- session name: **Plan ClearPass Dashboard OIDC relying-party readiness**

#### Objective

Turn the ClearPass Dashboard Sign in with Cubid blocker into repo-specific
follow-up work without duplicating SIWC wallet todos or moving SDK code into
`cubid-passport`.

#### Actions Taken

- reviewed the ClearPass-origin SDK inbox note about browser-safe Dashboard
  Sign in with Cubid
- confirmed existing `B01`, `B02`, `B04`, and `E01` work already cover the
  backend OIDC issuer, PKCE, Passport-hosted login/consent, pairwise subjects,
  passkey ACR, and disclosure persistence
- added `B02.6` as the specific Passport-side relying-party registration and
  hosted smoke follow-up for ClearPass Dashboard
- coordinated the SDK-side follow-up through a handoff note in
  `Cubid-Me/cubid-sdk` instead of adding public SDK implementation here

#### Verification

- `git diff --check`

#### Follow-up

- implement `B02.6` after the SDK auth package surface exists or when exact
  ClearPass Dashboard redirect/logout URIs are ready to register and smoke

### session: v192

- timestamp: 2026-05-14T03:30:40Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`b8bdd07`**
- session name: **Implement ClearPass Dashboard OIDC seed contract**

#### Objective

Start `B02.6` now that the public SDK auth surface is available, and add the
repo-side relying-party seed/runbook path for ClearPass Dashboard.

#### Actions Taken

- reviewed the SDK-ready note from `Cubid-Me/cubid-sdk` confirming
  `@cubid/auth`, `@cubid/auth-react`, and the ClearPass Vite auth example are
  implemented
- added an idempotent ClearPass Dashboard OIDC client seed script using stable
  client id `clearpass-dashboard`, `public_web`, Authorization Code + PKCE,
  token endpoint auth method `none`, and `openid email profile`
- added a dry-run mode so operators can validate the client payload without
  writing to Supabase
- documented the ClearPass Dashboard relying-party contract, seed env vars, and
  hosted smoke steps
- updated OIDC deployment/readiness docs to reference the ClearPass Dashboard
  client seed flow

#### Verification

- `git diff --check`
- `pnpm --filter @cubid/oidc seed:clearpass-dashboard -- --dry-run`
- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`

#### Follow-up

- run focused OIDC validation, then close or split the live hosted smoke
  portion depending on what can be safely executed from this checkout

### session: v193

- timestamp: 2026-05-14T03:31:43Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`ac440b5`**
- session name: **Close B02.6 and split hosted ClearPass smoke**

#### Objective

Close the repo-side ClearPass Dashboard OIDC seed/readiness work and preserve
the live hosted seed plus browser smoke as an explicit operational follow-up.

#### Actions Taken

- marked `B02.6` completed at implementation commit `ac440b5`
- recorded that repo-side completion includes the stable client seed command,
  dry-run validation, env examples, and relying-party runbook
- added `B02.6.1` for hosted ClearPass Dashboard client seeding and full OIDC
  browser smoke evidence

#### Verification

- `git diff --check`

#### Follow-up

- run `B02.6.1` once the target hosted environment credentials and exact
  ClearPass Dashboard redirect/logout URIs are confirmed

### session: v194

- timestamp: 2026-05-14T03:40:53Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`ced0793`**
- session name: **Start hosted ClearPass Dashboard OIDC smoke**

#### Objective

Run `B02.6.1` against hosted `CubidDev` as far as possible from this machine
and identify any remaining human/operator inputs needed for the full browser
smoke.

#### Actions Taken

- confirmed `https://staging-id.cubid.me/.well-known/openid-configuration`
  and `https://staging-id.cubid.me/jwks` return `200`
- confirmed `https://dashboard.clearpass.app` returns `200`
- used the linked Supabase CLI session for `CubidDev`
  (`cggycnbvljcdptzyjpju`) to seed `clearpass-dashboard` into
  `public.oidc_clients`
- seeded the client as `public_web`, `active`, `internal`, token endpoint auth
  method `none`, Authorization Code + PKCE, and scopes `openid email profile`
- configured redirect URIs `http://localhost:5173/auth/callback` and
  `https://dashboard.clearpass.app/auth/callback`
- configured post-logout redirect URIs `http://localhost:5173/` and
  `https://dashboard.clearpass.app/`
- verified a hosted `/authorize` request for `clearpass-dashboard` returns a
  `302` to `https://passport.cubid.me/login?login_challenge=...` with an
  `X-Request-Id`
- opened the hosted Passport login page through Playwright and confirmed it
  renders the human login UI for the ClearPass authorization request

#### Verification

- `supabase db query --linked` seed/upsert returned the
  `clearpass-dashboard` client row
- `curl` discovery/JWKS checks returned `200`
- hosted `/authorize` returned `302` to Passport login
- Playwright browser reached the Passport hosted login page

#### Blocker

- Full login/consent/token/userinfo/logout smoke now requires a human
  Passport login/consent session or a dedicated hosted test identity. This
  agent should not invent a user credential or bypass the hosted auth boundary.

#### Follow-up

- finish `B02.6.1` after the user completes hosted Passport login/consent in
  the browser session or provides an approved test identity path for the smoke

### session: v195

- timestamp: 2026-05-14T03:56:30Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`549cfcb`**
- session name: **Fix OIDC login challenge guest redirect**

#### Objective

Fix the hosted ClearPass Dashboard OIDC smoke blocker where completing
Passport email/OTP auth from `/login?login_challenge=...` redirected to the
normal Passport app instead of preserving and completing the OIDC login
challenge.

#### Actions Taken

- reproduced the operator-observed behavior: the ClearPass authorization link
  creates a hosted OIDC login challenge, but the Passport login shell redirects
  authenticated users to `/app`
- traced the redirect to the shared `Guest` component, which treated every
  authenticated user as incompatible with the login page
- added an `allowAuthenticated` escape hatch for challenge-specific login pages
- updated `apps/passport/app/login/page.tsx` to allow authenticated users to
  remain on `/login?login_challenge=...` so email/phone/passkey completion can
  call the OIDC login completion endpoint

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `git diff --check`

#### Follow-up

- deploy this Passport fix, then rerun `B02.6.1` from the hosted ClearPass
  Dashboard authorization link through consent, callback, `/token`,
  `/userinfo`, and logout

### session: v196

- timestamp: 2026-05-14T19:27:39Z
- agent: **OpenAI Codex**
- branch: **codex/smartrust-passkey-wallet-api-request**
- head: **`7d2b1db`**
- session name: **Address PR 164 OIDC seed review**

#### Objective

Patch PR 164 review feedback for the ClearPass Dashboard OIDC seed command,
then validate and prepare the branch for review-thread replies and resolution.

#### Actions Taken

- deferred full OIDC runtime config loading until after `--dry-run` output so
  dry runs no longer require Supabase service-role or pairwise secrets
- reused shared OIDC redirect/logout URI normalization for seed validation
- preserved existing optional metadata, client status, and rate-limit tier by
  default unless explicit seed override env vars are provided
- wrote OIDC audit events for ClearPass seed create/update operations
- added script typecheck coverage for OIDC seed scripts
- replaced local absolute handoff paths with repo-qualified references
- corrected ClearPass seed docs so defaulted client id/name values are optional

#### Verification

- `pnpm --filter @cubid/oidc typecheck`
- `pnpm --filter @cubid/oidc test`
- `pnpm --filter @cubid/oidc seed:clearpass-dashboard -- --dry-run` with
  placeholder non-secret env values
- negative dry-run rejected `ftp://localhost/...` redirect URI through shared
  OIDC validation
- `git diff --check`

### session: v197

- timestamp: 2026-05-14T22:12:58Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`04d9ea0`**
- session name: **Clean up Vercel app-root deployment config**

#### Objective

Align repo-side Vercel configuration with the operator-updated Vercel project
layout where Passport and Admin deploy as separate app-rooted projects instead
of a duplicate root-level Passport project.

#### Actions Taken

- removed the stale root `vercel.json` that forced root deployments to build
  Passport from `apps/passport`
- simplified `apps/passport/vercel.json` so it keeps only Passport cron
  schedules and no longer applies wildcard API CORS headers at the deployment
  layer
- added a Vercel monorepo deployment runbook documenting the two app-rooted
  Vercel projects and the Fly.io boundary for the OIDC service

#### Verification

- parsed `apps/passport/vercel.json` and `apps/admin/vercel.json` as JSON
- `git diff --check`

#### Follow-up

- push this cleanup through a normal PR to `dev`, then confirm both Vercel
  app-rooted projects report successful preview checks on the next PR

### session: v198

- timestamp: 2026-05-14T22:16:35Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`4dbbc3e`**
- session name: **Create flexible messaging side-roadmap**

#### Objective

Create the initial flexible messaging feature-folder todo and session log,
grounded in the newly added PRD, without promoting the work into the main
roadmap yet.

#### Actions Taken

- added `agent-context/flexible-messaging/todo.md` with `FM01` through `FM12`
  covering architecture, schema, user preferences, app grants, API v3 sending,
  email and Telegram providers, Admin controls, auditability, abuse prevention,
  SDK coordination, and production readiness
- added `agent-context/flexible-messaging/session-log.md` with `fm-v1` to mark
  the PRD/todo/log creation point
- kept the roadmap aligned with current repo boundaries: API v3 in this repo,
  public SDK implementation in `Cubid-Me/cubid-sdk`, and encrypted channel
  identifiers using C05-style custody patterns

#### Verification

- `git diff --check`

#### Follow-up

- commit the flexible messaging PRD, todo, and feature-local session log, then
  start `FM01` only when the user promotes flexible messaging from side-roadmap
  planning into active implementation

### session: v199

- timestamp: 2026-05-14T22:22:05Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`d30bce0`**
- session name: **Define flexible messaging API v3 architecture**

#### Objective

Complete `FM01` by creating the repo-specific target-state architecture doc
for Cubid flexible messaging before schema or runtime implementation begins.

#### Actions Taken

- added [docs/engineering/flexible-messaging-api-v3-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/flexible-messaging-api-v3-architecture.md)
  to define API v3 route families, MVP channels/categories, privacy boundaries,
  app/user/Admin ownership, send-notification contract, routing flow, status
  model, and SDK handoff expectations
- marked `FM01` completed in
  [agent-context/flexible-messaging/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/flexible-messaging/todo.md)
- added feature-local session `fm-v2` in
  [agent-context/flexible-messaging/session-log.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/flexible-messaging/session-log.md)

#### Verification

- `git diff --check`

#### Follow-up

- commit `FM01`, then start `FM02` for the notification schema and encrypted
  channel storage foundation

### session: v200

- timestamp: 2026-05-14T22:23:43Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`17f0ba5`**
- session name: **Add flexible messaging schema foundation**

#### Objective

Complete `FM02` by adding the database foundation for flexible messaging,
including encrypted private custody for retrievable channel destinations.

#### Actions Taken

- added `supabase/migrations/20260514222500_flexible_messaging_foundation.sql`
  with notification categories, providers, user channel metadata, app grants,
  preferences, events, delivery attempts, and private encrypted destinations
- seeded the MVP category/provider registry for email and Telegram with
  `SECURITY`, `TRANSACTIONAL`, and `WORKFLOW`
- added the Vault helper for
  `passport_notification_channel_wrapping_key_v1`
- updated
  [docs/engineering/flexible-messaging-api-v3-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/flexible-messaging-api-v3-architecture.md)
  and flexible messaging metadata to reflect the schema foundation

#### Verification

- `git diff --check`

#### Follow-up

- commit `FM02`, then start `FM03` for Passport channel verification and
  preference management

### session: v201

- timestamp: 2026-05-14T22:32:22Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`a6ff751`**
- session name: **Reconcile flexible messaging roadmap before runtime**

#### Objective

Improve the flexible messaging plan before runtime implementation by filling
the schema/policy gaps found in the PRD, `FM01`, and `FM02` review.

#### Actions Taken

- added `FM02.1` in
  [agent-context/flexible-messaging/todo.md](/Users/botmaster/src/cubid/cubid-passport/agent-context/flexible-messaging/todo.md)
  for verification challenge/session storage and app notification policy/quota
  storage
- clarified `SECURITY`, `CRITICAL`, provider enablement, channel-selection
  precedence, and delivery-status semantics in
  [docs/engineering/flexible-messaging-api-v3-architecture.md](/Users/botmaster/src/cubid/cubid-passport/docs/engineering/flexible-messaging-api-v3-architecture.md)
- refined `FM03` through `FM12` to give runtime/API/provider/Admin/SDK slices
  clearer ownership boundaries

#### Verification

- `git diff --check`

#### Follow-up

- commit this docs/metadata reconciliation, then implement `FM02.1` before
  beginning `FM03`

### session: v202

- timestamp: 2026-05-14T22:33:52Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`47cefab`**
- session name: **Implement flexible messaging policy gaps**

#### Objective

Complete `FM02.1` by adding the missing verification challenge and app policy
schema needed before flexible messaging runtime APIs.

#### Actions Taken

- added `supabase/migrations/20260514223500_flexible_messaging_policy_gaps.sql`
  with `notification_verification_challenges` and
  `notification_app_policies`
- modeled channel verification as hashed, expiring, one-time challenge sessions
  with attempt limits and replay evidence
- modeled app notification enablement as fail-closed policy with allowed
  categories, priorities, providers, security-category gating, sandbox state,
  and minute/day caps
- updated flexible messaging docs and metadata to close `FM02.1`

#### Verification

- `git diff --check`

#### Follow-up

- commit `FM02.1`, then start `FM03` for Passport channel verification and
  preference management

### session: v203

- timestamp: 2026-05-14T22:48:59Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`ed00cd6`**
- session name: **Implement Passport notification channel management**

#### Objective

Complete `FM03` with Passport user APIs and Profile UI for verified flexible
messaging channels and user notification preferences.

#### Actions Taken

- added service-role-only Vault access for
  `passport_notification_challenge_hash_secret_v1`
- implemented Passport server helpers for notification channel destination
  envelope encryption, one-time verification challenges, channel updates, and
  global category preferences
- added Passport routes under `/api/notifications/channels/*` and
  `/api/notifications/preferences/*`
- added a Profile notification-channel card with redacted destination display,
  verification completion, default/revoke controls, and category preferences
- extended Passport route tests and mocks for notification channel storage,
  challenge verification, redaction, and preferences
- updated the flexible messaging architecture doc and wrote an SDK handoff
  note for future profile-management helpers

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- commit `FM03`, then continue with `FM04` for app notification permission and
  category grants

### session: v204

- timestamp: 2026-05-14T22:53:33Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`f6ee425`**
- session name: **Implement Allow Page notification grants**

#### Objective

Complete `FM04` by giving hosted Allow Page users explicit app/category
notification grant controls, separate from identity and stamp disclosure.

#### Actions Taken

- added notification grant helpers that validate dapp user/page ownership
  before granting categories
- added anonymous Allow Page routes for listing and replacing app notification
  category grants
- added Allow Page UI for `SECURITY`, `TRANSACTIONAL`, and `WORKFLOW`
  notification permissions with copy that keeps channel privacy and delivery
  limits explicit
- added Passport route tests for app-scoped replacement behavior and
  cross-dapp rejection
- updated flexible messaging docs and wrote an SDK coordination note

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- commit `FM04`, then continue with `FM05` for the API v3 app
  send-notification contract

### session: v205

- timestamp: 2026-05-14T23:36:42Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`94b3a3e`**
- session name: **Clean Passport frontend and bundle warnings**

#### Objective

Remove the pre-existing Passport frontend lint warnings plus the production
build warnings from legacy wallet dependencies.

#### Actions Taken

- fixed remaining React hook dependency warnings and Tailwind lint warnings
  in Passport frontend flows
- moved Google font loading out of inline layout `<head>` links
- added browser-safe Next webpack fallbacks for legacy ContractKit dependencies
- routed `bigint-buffer` and `buffer-to-arraybuffer` through warning-free
  browser bundle shims during Next builds
- allowed `bigint-buffer` native build scripts in pnpm installs so Node
  environments can keep native bindings where applicable

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM05` for the API v3 app send-notification contract when
  flexible messaging work resumes

### session: v206

- timestamp: 2026-05-14T23:41:22Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`7e7401d`**
- session name: **Implement API v3 notification send contract**

#### Objective

Complete `FM05` by adding the dapp-authenticated API v3 route for accepted or
denied flexible messaging send requests.

#### Actions Taken

- added `/api/v3/notifications/send` with the shared Passport dapp security
  baseline and `Idempotency-Key` support
- added notification send orchestration for dapp-user ownership, app policy,
  user grants, preferences, verified channels, notification events, and queued
  delivery attempts
- kept provider-specific SMTP/Telegram delivery deferred to `FM06`/`FM07`
- added Passport route coverage for acceptance, idempotent replay, grant
  denial, malformed payload rejection, and idempotency conflicts
- created an SDK handoff note for future public SDK notification-send helpers

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`

#### Follow-up

- run final build/lint validation before committing, then continue with
  `FM06` email delivery provider integration

### session: v207

- timestamp: 2026-05-14T23:47:14Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`975fe58`**
- session name: **Implement email notification delivery provider**

#### Objective

Complete `FM06` by wiring flexible messaging events to the email delivery
provider without leaking channel destinations to apps.

#### Actions Taken

- added an SMTP-backed notification email sender using existing Passport
  server mail configuration
- extended API v3 notification send orchestration to decrypt email channel
  destinations only server-side and update delivery-attempt records
- recorded provider success/failure status while keeping the public response
  redacted and stable
- added Passport route tests for successful email delivery and provider
  failure handling
- updated the architecture doc, flexible messaging todo metadata, and SDK
  handoff note

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM07` Telegram delivery provider integration

### session: v208

- timestamp: 2026-05-14T23:51:38Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`887fd58`**
- session name: **Implement Telegram notification delivery provider**

#### Objective

Complete `FM07` by adding Telegram as the second flexible messaging delivery
provider while preserving encrypted destination storage and response redaction.

#### Actions Taken

- added a server-side Telegram Bot API sender with test injection and
  `TELEGRAM_BOT_TOKEN` configuration
- wired API v3 notification send delivery to verified Telegram channels and
  provider success/failure attempt records
- added Passport tests for Telegram verification, successful delivery, provider
  failure handling, and no chat-id exposure
- updated Profile copy, env examples, architecture docs, and SDK handoff notes

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM08` Admin notification control plane

### session: v210

- timestamp: 2026-05-15T04:35:21Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`840a15b`**
- session name: **Add notification history and status surfaces**

#### Objective

Complete `FM09` by exposing safe notification audit/status surfaces for users
and dapp callers.

#### Actions Taken

- added `/api/notifications/history/list` for Passport-authenticated users to
  inspect redacted notification history
- added `/api/v3/notifications/status` for dapp-authenticated delivery status
  lookup scoped to the authenticated dapp and dapp user
- added Profile UI history visibility near notification channel controls
- added Passport tests for history redaction, dapp-owned status lookup, and
  cross-dapp event denial
- updated flexible messaging docs, todo metadata, and SDK handoff note

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM10` rate limits, abuse prevention, and trust controls

### session: v211

- timestamp: 2026-05-15T04:38:17Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`402d207`**
- session name: **Harden notification send abuse controls**

#### Objective

Complete `FM10` by adding concrete abuse controls to the API v3 flexible
messaging send path.

#### Actions Taken

- added provider-registry status enforcement for selected notification
  channels
- added app/user minute and daily quota enforcement using
  `notification_app_policies`
- kept denials redacted while recording operational evidence in
  `notification_events`
- added Passport tests for disabled-provider and quota-exhaustion paths
- updated flexible messaging architecture docs and metadata

#### Verification

- `pnpm --filter @cubid/passport lint`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- continue with `FM11` SDK and integration coordination closeout

### session: v212

- timestamp: 2026-05-15T04:39:31Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`1e1b409`**
- session name: **Coordinate flexible messaging SDK handoff**

#### Objective

Complete `FM11` by ensuring the public SDK repo has handoff notes for the
backend flexible messaging contracts implemented in this repo.

#### Actions Taken

- confirmed handoff notes exist for channel management, Allow Page grants,
  notification send, email delivery, Telegram delivery, and status/history
  contracts
- added the missing handoff note for provider-disabled and quota-exceeded
  error behavior
- updated the architecture doc and roadmap metadata
- kept SDK implementation out of this repository

#### Verification

- `git diff --check`

#### Follow-up

- continue with `FM12` production readiness and smoke validation

### session: v218

- timestamp: 2026-05-15T19:58:23Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`7f77d07`**
- session name: **Drop legacy dapp API key column**

#### Objective

Complete `C04.1.1` by removing the legacy plaintext-style `dapps.apikey`
storage surface after verifying active dapps have hash-only verifier rows.

#### Actions Taken

- ran a read-only hosted CubidDev preflight showing 38 dapps, 38 with exactly
  one active `dapp_api_keys` row, 0 missing active keys, and 0 duplicate active
  keys
- added a forward migration that fails closed if any dapp is missing an active
  key row or has multiple active key rows, then drops `dapps_apikey_key` and
  `dapps.apikey`
- updated local seed data to stop inserting the removed `dapps.apikey` column
- removed remaining Admin response plumbing that named the old `apikey` field
- updated the dapp API-key hardening doc to record the final non-retrievable
  key contract
- marked `C04.1.1` completed in the roadmap

#### Verification

- hosted read-only preflight query against linked CubidDev for active key
  coverage
- `git diff --check`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin build`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport build`
- `pnpm exec supabase db lint --linked` reported a pre-existing
  `public.create_user_check_family` ambiguous `user_id` lint finding unrelated
  to this migration

#### Follow-up

- apply the guarded migration through the protected Supabase deployment
  workflow, not directly from a local shell
- consider a separate database-function cleanup for the pre-existing
  `create_user_check_family` lint finding

### session: v217

- timestamp: 2026-05-15T17:46:32Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`19ee23e`**
- session name: **Normalize cross-repo comms mailbox**

#### Objective

Move active cross-repo notes into the new sibling-note structure, update agent
guidance, and answer the current SmarTrust wallet/signing blocker where the
backend and SDK surfaces are ready enough to continue.

#### Actions Taken

- updated `AGENTS.md` to explain the new `agent-context/cross-repo-comms/`
  workflow and the dirty-sibling notification convention
- moved legacy incoming notes into `agent-context/cross-repo-comms/` with the
  required frontmatter and removed duplicated legacy copies
- added the ClearPass Dashboard SDK readiness thread to the new mailbox and
  marked it resolved from Passport's side
- marked the SDK wallet helper handoff resolved after the SDK side confirmed
  published package versions and exported helper names
- replied to the SmarTrust passkey-wallet request with the currently available
  account, signing, SDK, and limitation boundaries
- left synchronized sibling-note edits dirty in `cubid-sdk-v2` and
  `smartrust-monorepo` so agents in those repos can pick them up

#### Verification

- `git diff --check`

#### Follow-up

- let the SDK and SmarTrust agents ingest their dirty sibling notes
- yeet the Passport branch after the current Passport fixes and comms cleanup
  are ready for review

### session: v216

- timestamp: 2026-05-15T15:40:14Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`4eff0e1`**
- session name: **Complete hosted ClearPass Dashboard OIDC smoke**

#### Objective

Finish `B02.6.1` by validating the hosted ClearPass Dashboard Login with
Cubid flow against the deployed OIDC issuer, Passport login/consent UI, and
browser callback.

#### Actions Taken

- confirmed the ClearPass Dashboard OIDC client was seeded in hosted CubidDev
  with client id `clearpass-dashboard`
- deployed the Passport production fixes needed for browser Firebase config and
  OIDC consent rendering
- completed a fresh hosted Authorization Code + PKCE browser flow through OTP,
  optional passkey skip, consent approval, and callback
- exchanged the returned authorization code with the saved PKCE verifier and
  verified `/userinfo` returned the expected email/profile claims
- confirmed logout redirect validation succeeds when `client_id` is supplied

#### Verification

- browser callback reached
  `http://localhost:5173/auth/callback?code=...&state=smoke_8nCre8IbNlzajseiEPvmpw`
- token exchange returned `200` with request id
  `oidc_d390424d-adb9-4345-aed5-fbdbde4d3812`
- `/userinfo` returned `200` with request id
  `oidc_9124417f-b0fb-4186-b81b-d8fc3e7ead4d`
- logout check returned `302` to `https://dashboard.clearpass.app/` with
  request id `oidc_e1c8ecb2-fa97-4b66-8596-6453f1642d86`

#### Follow-up

- open a PR for the Passport fixes and B02.6.1 completion metadata after the
  remaining unrelated dirty coordination files are handled or left unstaged

### session: v215

- timestamp: 2026-05-15T15:17:34Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`fd0e8ac`**
- session name: **Fix OIDC consent Allow Page guard**

#### Objective

Unblock the hosted ClearPass Dashboard OIDC smoke after OTP login reached the
OIDC consent step but the Passport Allow Page showed a legacy UID error.

#### Actions Taken

- reproduced the OTP-to-consent handoff reaching
  `/allow?consent_challenge=...`
- identified the legacy Allow Page UID guard running before the OIDC consent
  branch
- moved the OIDC consent rendering branch ahead of the legacy UID validation
  so consent challenges do not require a dapp-user `uid`
- kept unrelated dirty coordination files unstaged

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `git diff --check -- apps/passport/app/allow/page.tsx`

#### Follow-up

- deploy the fix and rerun the hosted ClearPass Dashboard OIDC consent,
  authorization-code, token, and userinfo smoke

### session: v214

- timestamp: 2026-05-15T15:08:21Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`13d112a`**
- session name: **Fix Passport production Firebase env guard**

#### Objective

Unblock the hosted ClearPass Dashboard OIDC smoke by fixing the Passport login
page blank screen caused by the browser Firebase configuration guard.

#### Actions Taken

- diagnosed the production blank page as a client-side Firebase env guard crash
- confirmed Vercel now builds the Passport project from `apps/passport`
- updated the Firebase config helper to use direct `NEXT_PUBLIC_FIREBASE_*`
  references so Next.js can inline browser-safe public env values
- kept unrelated dirty coordination files unstaged

#### Verification

- `pnpm --filter @cubid/passport typecheck`
- `git diff --check -- apps/passport/lib/firebase.ts`

#### Follow-up

- deploy the fix and rerun the hosted ClearPass Dashboard OIDC smoke

### session: v219

- timestamp: 2026-05-16T05:30:39Z
- agent: **OpenAI Codex**
- branch: **codex/hosted-messaging-smoke-evidence**
- head: **`05d1949`**
- session name: **Record hosted flexible messaging smoke status**

#### Objective

Record the hosted migration and flexible messaging smoke evidence after PR #167
unblocked the ClearPass migration drift.

#### Actions Taken

- reran protected Supabase `apply` for Preview/CubidDev and confirmed it
  succeeded in run `25953794914`
- reran protected Supabase `check` and confirmed run `25953809761` reported
  `Remote database is up to date` through `20260515175000`
- used Vercel protected preview access to hit flexible messaging API routes and
  confirmed structured Passport envelopes plus `X-Request-Id` on invalid
  request, invalid dapp key, and missing Firebase bearer-token paths
- recorded remaining hosted happy-path blockers: provider secrets are not
  visible/configured for Passport Preview(dev), and no hosted test
  dapp/user credential bundle is documented for end-to-end channel and send
  smoke

#### Verification

- protected Supabase apply run `25953794914`
- protected Supabase check run `25953809761`
- Vercel protected preview checks against `/api/v3/notifications/send`,
  `/api/v3/notifications/status`, and `/api/notifications/history/list`
- `git diff --check`

#### Follow-up

- provision Preview(dev) `SMTP_*` and `TELEGRAM_BOT_*` runtime secrets
- document or create a hosted test dapp/user credential bundle for flexible
  messaging happy-path smoke

### session: v217

- timestamp: 2026-05-16T05:14:28Z
- agent: **OpenAI Codex**
- branch: **codex/post-166-status-and-messaging-smoke**
- head: **`eade36e`**
- session name: **Reconcile post-166 repo status**

#### Objective

Update repo status truth after PR #166 merged the flexible messaging MVP,
Vercel app-root cleanup, hosted OIDC smoke fixes, and guarded legacy
`dapps.apikey` removal.

#### Actions Taken

- updated `agent-context/repo-status.md` to mark `C04.1.1` as completed rather
  than intentionally pending
- clarified that PR #166 added newer hosted migrations whose protected apply
  and smoke evidence are still separate launch-readiness work
- kept the production-readiness status conservative until flexible messaging
  Vault/runtime secrets and hosted smoke checks are verified

#### Verification

- `git diff --check`

#### Follow-up

- run the hosted flexible messaging smoke checklist from
  `docs/engineering/flexible-messaging-operations.md`

### session: v218

- timestamp: 2026-05-16T05:18:23Z
- agent: **OpenAI Codex**
- branch: **codex/post-166-status-and-messaging-smoke**
- head: **`3c3783b`**
- session name: **Fix ClearPass hosted migration apply blocker**

#### Objective

Unblock protected CubidDev migration apply so the flexible messaging hosted
smoke checklist can proceed against the actual deployed schema.

#### Actions Taken

- ran the protected Supabase migration workflow in `check` mode and confirmed
  five pending migrations on CubidDev
- ran the protected `apply` workflow and found it failed on
  `20260509183000_clearpass_verify_stamp.sql`
- patched the ClearPass scoring seed migration to handle both schema shapes:
  use quoted `"is_GP_replacement"` when present, otherwise omit the optional
  legacy Gitcoin Passport replacement column

#### Verification

- `git diff --check`

#### Follow-up

- push the migration fix, rerun the protected Supabase apply workflow, then
  continue the hosted flexible messaging smoke checklist

### session: v216

- timestamp: 2026-05-16T02:38:19Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`77de025`**
- session name: **Address PR 166 review comments**

#### Objective

Resolve actionable Copilot and Codex review comments on PR 166 without changing
the flexible messaging public route contracts.

#### Actions Taken

- sorted notification delivery attempts before deriving latest status
- escaped Telegram MarkdownV2 notification content and sanitized notification
  email subjects against header injection
- kept legacy `dapps.apikey` redaction in Admin create/list/rotate responses
  for rollout safety
- scoped Admin delivery-attempt overview totals to events owned by the current
  admin's apps
- preserved existing notification preference fields on partial updates
- replaced local absolute docs links with repo-relative or repo-generic paths

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/admin typecheck`
- `git diff --check`

#### Follow-up

- push the patch, reply to the review threads, and resolve them in GitHub

### session: v213

- timestamp: 2026-05-15T04:42:15Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`c8fb930`**
- session name: **Close flexible messaging production readiness runbook**

#### Objective

Complete `FM12` by adding a production-readiness runbook and explicit hosted
smoke checklist for the flexible messaging MVP.

#### Actions Taken

- created `docs/engineering/flexible-messaging-operations.md` with required
  migrations, Supabase Vault secrets, provider env vars, Admin policy
  prerequisites, launch gates, smoke steps, triage guidance, and emergency
  provider/app controls
- updated the flexible messaging architecture doc to reference the runbook and
  avoid claiming hosted readiness without live evidence
- updated flexible messaging todo metadata to close `FM12`

#### Verification

- `git diff --check`

#### Follow-up

- run the hosted flexible messaging smoke checklist before enabling production
  app traffic

### session: v209

- timestamp: 2026-05-14T23:59:38Z
- agent: **OpenAI Codex**
- branch: **codex/vercel-app-root-cleanup**
- head: **`ad3c4a9`**
- session name: **Implement Admin notification control plane**

#### Objective

Complete `FM08` by giving Admin users redacted controls and status visibility
for the flexible messaging MVP.

#### Actions Taken

- added notification Admin operations for overview, provider updates,
  category updates, and app policy/quota upserts
- added Admin API routes on the existing shared baseline for read and
  sensitive operations
- added a Notifications Admin tab with provider/category/app policy controls
  and recent event evidence
- added Admin route tests for the new notification routes
- updated flexible messaging docs and metadata

#### Verification

- `pnpm --filter @cubid/admin lint`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- continue with `FM09` auditability and delivery-status APIs
### session: v214

- timestamp: 2026-05-20T18:46:01Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`f288f35`**
- session name: **Preserve recoverable wallet direction reset**

#### Objective

Anchor the new app-recoverable wallet direction before changing repo behavior.

#### Actions Taken

- preserved the recoverable wallet SDK agent specification as the new product
  direction source for passkey-first, app-mediated, recoverable embedded
  wallets
- preserved the new SmarTrust recovery-only cross-repo handoff
- preserved the old SmarTrust wallet-generation/signing thread as archived and
  superseded

#### Verification

- `git diff --check`

#### Follow-up

- rewrite wallet/SIWC docs and roadmap metadata, then hard-disable Cubid
  wallet generation and normal signing surfaces
### session: v215

- timestamp: 2026-05-20T18:53:13Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`bd9de8e`**
- session name: **Quarantine legacy Cubid wallet generation and signing**

#### Objective

Pivot the repo away from Cubid-generated wallets and Cubid normal signing while
preserving historical data surfaces and establishing the recoverable-wallet
roadmap.

#### Actions Taken

- added the recoverable wallet roadmap and engineering direction doc
- marked SIWC generated-wallet and normal-signing docs as superseded or legacy
  quarantine surfaces
- hard-disabled new `/api/v3/accounts/generate`,
  `/api/v3/signing/requests/create`, and Passport SIWC signing approval
  traffic with structured `410` errors
- updated Admin SIWC policy helpers/UI to prevent enabling legacy custody or
  signing controls
- added Passport/Admin tests for fail-closed behavior and updated legacy route
  tests to preserve read-only visibility
- created SDK and SmarTrust cross-repo handoff notes for the recovery-only
  direction

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/admin test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/admin typecheck`
- `pnpm --filter @cubid/passport build`
- `pnpm --filter @cubid/admin build`
- `git diff --check`

#### Follow-up

- close RW01/RW02 metadata with the implementation commit SHA, then continue
  with RW03 recovery-bundle storage schema
### session: v216

- timestamp: 2026-05-20T18:53:34Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`8593e12`**
- session name: **Close RW01 and RW02 metadata**

#### Objective

Close the completed recoverable-wallet target-state and route-quarantine todos
and start the recovery-bundle schema follow-up.

#### Actions Taken

- marked `RW01` and `RW02` completed in the recoverable-wallet roadmap
- started `RW03` for private-schema recovery-bundle storage
- added the feature-folder session-log closeout entry

#### Verification

- `git diff --check`

#### Follow-up

- implement `RW03` recovery-bundle storage schema
### session: v217

- timestamp: 2026-05-20T19:07:55Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`a2b82d8`**
- session name: **Implement RW03 recovery-bundle storage**

#### Objective

Add the storage and encryption foundation for Cubid recoverable-wallet recovery
bundles.

#### Actions Taken

- added a private-schema recovery-bundle table with service-role-only access
- added a Supabase Vault-backed wrapping-key helper function
- added Passport server helpers for recovery-bundle envelope encryption and
  decryption
- documented the recovery-bundle storage contract and required Vault secret
- added focused helper tests for encryption context binding

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `git diff --check`

#### Follow-up

- start `RW04` for API v3 recovery-bundle enrollment and status routes

### session: v218

- timestamp: 2026-05-20T19:12:59Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`bcb2c37`**
- session name: **Implement RW04 recovery-bundle APIs**

#### Objective

Add API v3 recovery-bundle enrollment and status routes that let dapps store and
inspect recovery-bundle state without retrieving recovery material.

#### Actions Taken

- added dapp-authenticated recovery-bundle enrollment with `Idempotency-Key`
  replay protection
- added dapp-authenticated recovery-bundle status lookup
- wired enrollment to the private-schema Vault envelope-encryption helper
- kept responses limited to safe status metadata
- updated API v3 and recoverable-wallet engineering docs
- added Passport route tests for encryption, redaction, ownership, and
  idempotency

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW05` for user-authorized recovery release

### session: v219

- timestamp: 2026-05-20T19:13:33Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9dbc7e3`**
- session name: **Start RW05 recovery release flow**

#### Objective

Start the Passport-hosted, user-authorized recovery release follow-up after the
backend enrollment/status API landed.

#### Actions Taken

- recorded the RW04 commit SHA in the recoverable-wallet roadmap
- marked `RW05` started with current branch/head metadata
- added the feature-folder session-log handoff entry

#### Verification

- not run; metadata-only handoff

#### Follow-up

- implement one-time recovery release sessions without backend credential
  retrieval of recovery material

### session: v220

- timestamp: 2026-05-20T19:17:18Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`558429f`**
- session name: **Implement RW05 user-authorized recovery release**

#### Objective

Add a user-authorized recovery release path that keeps dapp backend credentials
limited to release-session creation and status metadata.

#### Actions Taken

- added recovery release session persistence with service-role-only access
- added dapp-authenticated API v3 release-session creation
- added Passport user-authenticated release completion
- verified the signed-in user owns the Cubid user bound to the session
- enforced session expiry and one-time consumption
- returned recovery material only from the user-authenticated completion route
- documented the RW05 API contract

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW06` for recovery rotation and revocation

### session: v221

- timestamp: 2026-05-20T19:17:50Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9186853`**
- session name: **Start RW06 recovery rotation and revocation**

#### Objective

Start the recovery lifecycle-management follow-up after the Passport
user-authorized release route landed.

#### Actions Taken

- recorded the RW05 commit SHA in the recoverable-wallet roadmap
- marked `RW06` started with current branch/head metadata
- added the feature-folder session-log handoff entry

#### Verification

- not run; metadata-only handoff

#### Follow-up

- add rotation, revocation, visibility, and audit events for recovery bundles

### session: v222

- timestamp: 2026-05-20T19:21:16Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`154f668`**
- session name: **Implement RW06 recovery lifecycle controls**

#### Objective

Add the recovery bundle lifecycle controls needed after enrollment and release:
rotation, revocation, user-visible state, and audit events.

#### Actions Taken

- added dapp-authenticated recovery bundle rotation and revocation routes
- added Passport user-authenticated recovery bundle list visibility
- added lifecycle audit events for enroll, update, release, rotate, and revoke
- kept all lifecycle responses redacted of bundle material and encrypted custody
  fields
- updated API v3 and recoverable-wallet docs
- added Passport route coverage for rotation, revocation, visibility, and audit
  evidence

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW07` for browser-safe recovery error taxonomy

### session: v223

- timestamp: 2026-05-20T19:21:49Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`0afeb5e`**
- session name: **Start RW07 recovery error taxonomy**

#### Objective

Start standardizing recovery error codes after rotation, revocation, and
user-visible lifecycle state landed.

#### Actions Taken

- recorded the RW06 commit SHA in the recoverable-wallet roadmap
- marked `RW07` started with current branch/head metadata
- added the feature-folder session-log handoff entry

#### Verification

- not run; metadata-only handoff

#### Follow-up

- document and code the browser-safe recovery error taxonomy, then coordinate
  SDK impact through cross-repo comms

### session: v224

- timestamp: 2026-05-20T19:26:38Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9a86130`**
- session name: **Implement RW07 recovery error taxonomy**

#### Objective

Make recoverable-wallet errors stable for browsers and SDK consumers, and
coordinate the contract with the public SDK repo.

#### Actions Taken

- added recoverable-wallet error code constants
- updated backend recovery flows to emit browser-safe error codes
- documented the taxonomy and route mapping
- added a live cross-repo comms handoff note for SDK agents
- covered the changed error codes in Passport route tests

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`

#### Follow-up

- start `RW08` for SDK package direction coordination

### session: v225

- timestamp: 2026-05-20T19:27:09Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`1c72827`**
- session name: **Start RW08 SDK coordination**

#### Objective

Start coordinating the public SDK package direction now that Passport has
concrete recovery-bundle APIs and error codes.

#### Actions Taken

- recorded the RW07 commit SHA in the recoverable-wallet roadmap
- marked `RW08` started with current branch/head metadata
- added the feature-folder session-log handoff entry

#### Verification

- not run; metadata-only handoff

#### Follow-up

- update the SDK direction cross-repo note with concrete backend route and
  package-boundary guidance

### session: v226

- timestamp: 2026-05-20T19:28:10Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`1c7c6fa`**
- session name: **Implement RW08 SDK coordination**

#### Objective

Send concrete SDK package-boundary and route guidance now that the
recoverable-wallet backend surfaces exist.

#### Actions Taken

- updated the Passport-owned recoverable wallet SDK direction cross-repo note
- mirrored the sibling note in `cubid-sdk-v2` and intentionally left it dirty
- documented the backend routes available for SDK wrapping
- reiterated that the SDK should deprecate generated-wallet and normal-signing
  helper direction

#### Verification

- `git diff --check`

#### Follow-up

- start `RW09` for the SmarTrust recovery-only handoff

### session: v227

- timestamp: 2026-05-20T19:28:42Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`571fa36`**
- session name: **Start RW09 SmarTrust handoff**

#### Objective

Start the SmarTrust recovery-only handoff after SDK package direction was
coordinated.

#### Actions Taken

- recorded the RW08 commit SHA in the recoverable-wallet roadmap
- marked `RW09` started with current branch/head metadata
- added the feature-folder session-log handoff entry

#### Verification

- not run; metadata-only handoff

#### Follow-up

- update the SmarTrust cross-repo thread with current Passport recovery API
  contracts and SmarTrust-owned responsibilities

### session: v228

- timestamp: 2026-05-20T19:29:37Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`32f4618`**
- session name: **Implement RW09 SmarTrust handoff**

#### Objective

Reply to SmarTrust with the current recovery-only Passport API contract and
clear division of responsibilities.

#### Actions Taken

- updated the Passport-owned SmarTrust recovery-only cross-repo note
- mirrored the SmarTrust sibling note and left it dirty in SmarTrust
- listed current route names and smoke guidance
- clarified blocked/deprecated generated-wallet and normal-signing surfaces
- referenced SmarTrust-owned `AW-01`, `AW-09`, and `AW-12` responsibilities

#### Verification

- `git diff --check`

#### Follow-up

- start `RW10` for hosted migration and smoke readiness after review/merge

### session: v229

- timestamp: 2026-05-20T19:35:52Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`ac5edcd`**
- session name: **Clarify SmarTrust recovery handoff timing**

#### Objective

Clarify the SmarTrust cross-repo recovery handoff so SmarTrust agents hold off
on direct implementation until Cubid SDK orchestration support lands.

#### Actions Taken

- rewrote the latest SmarTrust recovery-only handoff entry in the Passport
  sibling note
- mirrored the same clarification into the SmarTrust sibling note and left it
  dirty for their agents
- clarified that Cubid SDK support will cover much of the recovery
  orchestration
- clarified that SmarTrust still owns wallet/MPC policy, backend state,
  business logic, retries, escrow logic, and product UX

#### Verification

- `git diff --check`
- `git -C /Users/botmaster/src/smartrust/smartrust-monorepo diff --check -- agent-context/cross-repo-comms/2026-05-20-app-recoverable-wallet-recovery-handoff.md`

#### Follow-up

- keep the SmarTrust sibling note dirty so SmarTrust agents see the updated
  guidance

### session: v230

- timestamp: 2026-05-20T20:02:49Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`1fa38ac`**
- session name: **Address PR 169 recovery review comments**

#### Objective

Patch the PR review findings around recoverable-wallet bundle ownership,
revoked-bundle lookup scoping, release-session state handling, rotation safety,
and stale SIWC doc metadata.

#### Actions Taken

- scoped recovery bundle re-enrollment to the full app/user/provider ownership
  tuple
- tightened revoked-bundle checks so other app contexts do not leak bundle
  lifecycle state
- checked expired recovery-session update errors before returning expiry
  failures
- made post-release bundle bookkeeping and security-event writes non-blocking
  after the release session is durably consumed
- reordered bundle rotation so the replacement is written before the old bundle
  is marked rotated
- updated SIWC signing architecture metadata and added regression tests for the
  ownership and cross-app leak cases

#### Verification

- `pnpm --filter @cubid/passport test`
- `pnpm --filter @cubid/passport typecheck`
- `pnpm --filter @cubid/passport build`
- `git diff --check`

#### Follow-up

- push the review-fix commit, then reply to and resolve the addressed PR
  threads

### session: v231

- timestamp: 2026-05-20T22:49:51Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`9a314a3`**
- session name: **Run RW10 hosted migration readiness**

#### Objective

Run the RW10 hosted migration delivery path for recoverable-wallet schema and
record the remaining hosted smoke blockers truthfully.

#### Actions Taken

- ran protected Supabase check `26194222009` for `CubidDev`
- ran protected Supabase apply `26194292885` after dry-run identified the two
  recoverable-wallet migrations
- ran protected post-apply Supabase check `26194319925`, which reported
  `Remote database is up to date`
- attempted shell-based hosted Passport API smoke against the PR preview and
  confirmed Vercel Deployment Protection blocks the request before Passport
- confirmed local Firebase Admin private values are blank, so this shell cannot
  mint the real Firebase ID token needed for user-authorized recovery release
  completion smoke
- after the operator shared Vercel deployment `2Fp9gPxYho8vCKCE6hMRhC9Zwn75`,
  attempted Chrome-authenticated preview access and confirmed the local Chrome
  profile blocks both the preview app URL and Vercel SSO handoff with
  `ERR_BLOCKED_BY_CLIENT`
- updated recoverable-wallet todo metadata and repo status with the exact
  migration evidence and smoke blockers

#### Verification

- protected Supabase check run `26194222009`
- protected Supabase apply run `26194292885`
- protected Supabase post-apply check run `26194319925`
- attempted hosted PR preview API smoke; blocked by Vercel Deployment
  Protection
- attempted Chrome-authenticated preview access; blocked locally by
  `ERR_BLOCKED_BY_CLIENT`

#### Follow-up

- provide a Vercel automation bypass token or an unprotected preview smoke
  target, plus a real Firebase ID-token path, then complete RW10 hosted API
  smoke

### session: v232

- timestamp: 2026-05-24T19:31:50Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`a61a9fc`**
- session name: **Complete RW10 hosted recoverable-wallet smoke**

#### Objective

Complete the hosted RW10 smoke pass for the recoverable wallet recovery-provider
track and update repo status to reflect the new operational truth.

#### Actions Taken

- used the operator-approved browser session to finish CubidDev/Supabase Data
  API configuration by exposing the service-role-only `private` schema
- provisioned the missing Supabase Vault wrapping key for recoverable wallet
  bundles without printing the generated secret
- used Vercel branch-level Preview envs and redeployed the protected Passport PR
  preview so the branch could read Supabase and Firebase Admin config
- minted a Firebase ID token from the operator-provided local service account
  for the hosted user-authorized recovery release smoke
- created and later deleted a temporary hosted smoke dapp, hashed dapp API key,
  dapp-user link, recovery bundle, release session, idempotency rows, and
  related security events
- verified recoverable wallet enroll/status/release/list/revoke happy paths and
  fail-closed deprecated wallet-generation/signing paths
- marked RW10 and the main RW parent complete and updated repo status

#### Verification

- direct Supabase service-role query confirmed
  `private.recoverable_wallet_recovery_bundles` is reachable
- `POST /api/recovery-bundles/list`
- `POST /api/v3/recovery-bundles/enroll`
- `POST /api/v3/recovery-bundles/status`
- `POST /api/v3/recovery-bundles/release/start`
- `POST /api/recovery-bundles/release/complete`
- `POST /api/v3/recovery-bundles/revoke`
- `POST /api/v3/accounts/generate` fail-closed check
- `POST /api/v3/signing/requests/create` fail-closed check
- temporary smoke data cleanup confirmed by delete counts

#### Follow-up

- publish the metadata/status update through the open PR
- keep production readiness gated on production env/secrets, production
  Supabase delivery, SDK sync, and production-domain smoke checks

### session: v233

- timestamp: 2026-05-24T20:43:41Z
- agent: **OpenAI Codex**
- branch: **codex/recoverable-wallet-direction-reset**
- head: **`a3384a1`**
- session name: **Address PR 170 PII review comment**

#### Objective

Remove unnecessary personal email exposure from the RW10 hosted-smoke metadata
artifacts called out in PR #170 review.

#### Actions Taken

- replaced the specific smoke-user email in the recoverable-wallet todo with a
  non-identifying operator-owned test identity description
- replaced the same email in the recoverable-wallet session log
- searched tracked agent/docs artifacts for remaining copies of the address

#### Verification

- `rg -n "hubert\\.cormac@gmail\\.com|hubert\\.cormac|gmail\\.com" agent-context docs README.md AGENTS.md -S`
- `git diff --check`

#### Follow-up

- push the patch, reply to the PR thread, and resolve it
