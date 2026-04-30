# `@cubid/core` Publishing Runbook

This runbook is the operator checklist for publishing `@cubid/core` to npm and
JSR. The repo is already wired for tokenless publishing from GitHub Actions; the
remaining setup happens in the npm and JSR account UIs.

## Current State

- npm package: `@cubid/core`
- JSR package: `@cubid/core`
- GitHub repository: `Cubid-Me/cubid-passport`
- Workflow: `.github/workflows/publish.yml`
- Release branch: `dev`
- Release workflow trigger: manual `workflow_dispatch`
- npm status checked on 2026-04-30: `@cubid/core` is not yet published
- Local npm status checked on 2026-04-30: this machine is not authenticated

Do not publish from a personal npm account as a routine release path. Official
Cubid packages should be owned by the npm `cubid` organization and released
through trusted publishing from GitHub Actions.

## What I Can Do In Repo

- keep the package runtime-agnostic and publishable
- run npm pack and JSR dry-runs
- keep the GitHub Actions workflow ready for trusted publishing
- open the PR that updates package code, docs, and release automation
- run the publish workflow after registry setup is complete, if you ask me to

## What Needs A Human Account Owner

You or another npm/JSR owner must do the first registry setup because it depends
on account permissions and package ownership. This should be done with the
official Cubid org accounts, not an agent-owned or personal workaround.

## npm Setup

1. Sign in at `https://www.npmjs.com/`.
2. Confirm the npm organization `cubid` exists.
3. Confirm your account is a member of the `cubid` organization.
4. Confirm the `developers` team exists and has package publish/admin access for
   Cubid SDK packages.
5. Search for `@cubid/core`.
6. If `@cubid/core` exists, open package settings and configure Trusted
   Publishing:
   - Provider: `GitHub Actions`
   - Organization or user: `Cubid-Me`
   - Repository: `cubid-passport`
   - Workflow filename: `publish.yml`
   - Environment name: leave blank
7. In the package settings, set publishing access to require 2FA and disallow
   tokens after trusted publishing is confirmed working.

### If npm Says The Package Does Not Exist

npm's trusted-publisher UI is package-settings based. If npm does not let you
configure Trusted Publishing before the first package version exists, use this
bootstrap path:

1. Make sure this publishing setup PR has merged to `dev`.
2. Use the official npm org owner account, not an agent or personal automation
   token.
3. Publish version `0.1.0` once from the clean `dev` release commit with:

   ```sh
   pnpm --filter @cubid/core build
   cd packages/core
   npm publish --access public
   ```

4. Immediately configure Trusted Publishing with the fields above.
5. Immediately restrict publishing access to require 2FA and disallow tokens.
6. Future releases must use the GitHub Actions workflow, not local publish.

This one-time bootstrap is only acceptable if npm does not support creating the
trusted-publisher binding for an unpublished package. Do not store a long-lived
npm automation token in this repository.

## JSR Setup

1. Sign in at `https://jsr.io/` using the Cubid-maintained GitHub identity.
2. Create or open scope `@cubid`.
3. Create or open package `@cubid/core`.
4. In the package settings, link the GitHub repository:
   - Repository: `Cubid-Me/cubid-passport`
   - Workflow: `.github/workflows/publish.yml`
5. Keep tokenless GitHub Actions publishing as the release path.

JSR supports tokenless publishing from GitHub Actions after the package is
linked to the repository.

## Release Steps After Setup

1. Ensure the release commit is merged to `dev`.
2. Open GitHub Actions for `Cubid-Me/cubid-passport`.
3. Select workflow `Publish Packages`.
4. Click `Run workflow`.
5. Select branch `dev`.
6. Set `publish_npm` and/or `publish_jsr` to `true`.
7. Run the workflow.
8. Confirm the workflow passes and the package pages show the new version.

The workflow fails intentionally if a publish is dispatched from any branch
other than `dev`.

## Verification Commands

Run these before a release PR:

```sh
pnpm --filter @cubid/core test
pnpm --filter @cubid/core typecheck
pnpm --filter @cubid/core deno:check
pnpm --filter @cubid/core build
pnpm --filter @cubid/core pack:dry-run
pnpm --filter @cubid/core jsr:dry-run
```

After publication:

```sh
npm view @cubid/core
```

Also confirm JSR shows `@cubid/core` and that a Deno/Supabase Edge import can
use `jsr:@cubid/core`.

## Known Decision: License

`@cubid/core` is currently marked `UNLICENSED`. That is technically
publishable, but it is not friendly to external adoption. Before a broad
developer launch, choose an explicit SDK license such as MIT or Apache-2.0 and
apply it intentionally. Do not invent that license during routine maintenance.
