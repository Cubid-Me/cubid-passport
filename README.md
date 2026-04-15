# Cubid Monorepo

This repository is now the umbrella monorepo for Cubid platform work. Today it contains one active application workspace, `@cubid/passport`, with the repo structure and tooling prepared for `apps/admin`, `services/oidc`, and shared packages to land next.

The original Passport hackathon walkthrough is here:
[YouTube demo](https://www.youtube.com/watch?v=Um1-IB7lmNg)

## Active Workspace

- `apps/passport`: Next.js 14 app for passwordless identity onboarding, Gitcoin Passport stamp collection, dapp allow flows, and minting a Gitcoin Passport score onto NEAR as a soulbound token

## Local Setup

Use Node 20 and `pnpm`.

```bash
pnpm install
pnpm dev
```

Root developer commands currently default to the Passport workspace:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

If you want to target the workspace explicitly:

```bash
pnpm --filter @cubid/passport dev
```

## Environment Notes

Passport runtime env files now belong under `apps/passport/`. Use [apps/passport/.env.example](/Users/botmaster/src/cubid/cubid-passport/apps/passport/.env.example) as the workspace-local baseline.

Known Passport env variables include:

- `NEXT_PUBLIC_DAPP_ID`
- `WLD_CLIENT_ID`
- `WLD_CLIENT_SECRET`
- `authToken`
- `is_allow_token`
- `private_key_near`
- `twilio_sid`

Some third-party credentials are still hardcoded in source files and should be moved into environment variables before this app is treated as production-ready.

## Repository Layout

- `apps/passport/`: live Passport application workspace
- `agent-context/`: execution roadmap, session logs, and feature notes
- `docs/engineering/`: architecture docs, operating model docs, and migration guidance
- `.github/`: CI workflows and repo automation
- `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`: monorepo workspace and shared tooling contracts

## Current Focus

- finish the app relocation baseline and shared workspace contracts
- import `cubid-admin` as `apps/admin`
- add the dedicated OIDC service and shared identity packages
