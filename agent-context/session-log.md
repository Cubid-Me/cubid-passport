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
