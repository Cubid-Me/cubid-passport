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
