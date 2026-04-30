# Cubid Monorepo

This repository is the private umbrella monorepo for Cubid platform work. It contains active Passport, Admin, and OIDC workspaces plus shared packages for configuration and domain contracts. Public SDK package work now belongs in the canonical SDK repo at `/Users/botmaster/src/cubid/cubid-sdk-v2`.

The original Passport hackathon walkthrough is here:
[YouTube demo](https://www.youtube.com/watch?v=Um1-IB7lmNg)

## Active Workspaces

- `apps/passport`: Next.js 14 app for passwordless identity onboarding, Gitcoin Passport stamp collection, dapp allow flows, and minting a Gitcoin Passport score onto NEAR as a soulbound token
- `apps/admin`: Next.js 13 canary admin control plane for app configuration, page management, webhook management, API key rotation, and authenticated admin APIs backed by Firebase bearer-token verification and server-side Supabase access
- `packages/config`: shared server-side environment helper package
- `packages/types`: shared client-safe and server-safe type contracts
- `packages/core`: historical `@cubid/core` implementation snapshot retained for migration context; do not publish SDK packages from this repo

## Local Setup

Use Node 24 and `pnpm`.

```bash
pnpm install
pnpm dev
```

Root `dev` remains Passport-first for continuity:

```bash
pnpm dev
pnpm dev:admin
```

Root validation commands now cover both application workspaces plus any shared packages that define the relevant task:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

If you want to target a workspace explicitly:

```bash
pnpm --filter @cubid/passport dev
pnpm --filter @cubid/admin dev
```

## Environment Notes

Passport runtime env files now belong under `apps/passport/`. Use [apps/passport/.env.example](apps/passport/.env.example) as the workspace-local baseline.

Admin runtime env files belong under [apps/admin/.env.example](apps/admin/.env.example).

Known Passport env variables include:

- `NEXT_PUBLIC_DAPP_ID`
- `WLD_CLIENT_ID`
- `WLD_CLIENT_SECRET`
- `authToken`
- `is_allow_token`
- `private_key_near`
- `twilio_sid`

Some third-party credentials are still hardcoded in source files and should be moved into environment variables before this app is treated as production-ready.

Known Admin env variables include:

- `NEXT_PUBLIC_SHOW_LOGGER`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DAPP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Repository Layout

- `apps/passport/`: live Passport application workspace
- `apps/admin/`: imported Admin control-plane workspace
- `packages/config/`: shared env-loading helpers and monorepo config conventions
- `packages/core/`: historical `@cubid/core` SDK snapshot; canonical public SDK work lives in `/Users/botmaster/src/cubid/cubid-sdk-v2`
- `packages/types/`: shared type contracts reused across workspaces
- `agent-context/`: execution roadmap, session logs, and feature notes
- `docs/engineering/`: architecture docs, operating model docs, and migration guidance
- `.github/`: CI workflows and repo automation
- `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`: monorepo workspace and shared tooling contracts

## Current Focus

- stabilize the two-app monorepo contract across Passport and Admin
- extract the next layer of shared packages once both apps are running from one workspace graph
- add the dedicated OIDC service and shared identity packages

## Agent And SDK Guidance

- Product and protocol context lives in [agent-context/cubid-backgrounder.md](agent-context/cubid-backgrounder.md).
- Public SDK/package boundaries live in [docs/engineering/sdk-package-target-state.md](docs/engineering/sdk-package-target-state.md), but implementation and publication now happen from `/Users/botmaster/src/cubid/cubid-sdk-v2`.
- Do not publish `@cubid/core`, `@cubid/react`, or chain SDK packages from this private repo.
