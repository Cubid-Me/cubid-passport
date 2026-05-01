# AGENTS

## Workflow

- Do not push directly to `main`.
- Always work on a feature branch; do not make implementation commits directly on shared branches such as `main`, `dev`, or `prod`.
- Several related changes or todos may land on the same feature branch when they are part of one coherent review stack.
- Open pull requests back into `dev` by default. Target `main` only when the user explicitly requests a production/mainline PR.
- Rebase or otherwise sync frequently from `dev` so long-running branches do not drift.
- Add a new entry to `agent-context/session-log.md` immediately before every commit.
- After implementing each todo, commit immediately once the task is in a coherent state and the required session-log entry has been added.

## Session Startup

At the start of a new session, inspect and summarize the relevant work from:

1. `todo.md` files inside any active `agent-context/` feature folders
2. larger implementation notes or planned feature folders inside `agent-context/`
3. `agent-context/cubid-backgrounder.md` for product and protocol principles
4. `docs/engineering/sdk-package-target-state.md` before SDK/package work, then move public SDK implementation work to the canonical `Cubid-Me/cubid-sdk` repo
5. open GitHub issues or PR comments when repository access is available
6. dirty files in `agent-context/messages-from-cubid-sdk/`, treating each as an incoming message from the public SDK agents that must be read and addressed in this repo

## Repository Map

- `apps/passport/`: live Passport app workspace containing the App Router UI, `pages/api` handlers, app config, shared components, hooks, and frontend support files
- `apps/admin/`: admin control-plane workspace containing the admin UI shell, `pages/api/admin` handlers, Firebase bearer-token verification, and server-side Supabase access
- `packages/config/`: shared environment helper package for server-side runtime configuration
- `packages/core/`: historical runtime-agnostic `@cubid/core` SDK snapshot retained for migration context; do not publish public SDK packages from this repo
- `packages/types/`: shared type contracts that can be consumed by multiple workspaces
- `apps/passport/public/`: Passport static assets
- `agent-context/`: session logging, feature notes, and small local follow-ups
- `agent-context/messages-from-cubid-sdk/`: incoming coordination notes from the public SDK repo agents
- `docs/engineering/`: architecture and operating-model docs
- `.github/`: CI workflows

## Commands

- Use Node 24 when working locally
- Install dependencies with `pnpm install`
- Start local development with `pnpm dev`
- Start the admin app explicitly with `pnpm dev:admin`
- Validate changes with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Notes

- Treat committed secrets as incidents, not convenience. Use environment variables or local-only files that are ignored by Git.
- Keep cleanup-only changes separate from feature work whenever practical.
- Treat deprecated and v2-only database tables as quarantine surfaces. Do not build new features on them, refactor them, migrate them, drop them, or otherwise work on them unless a specific future todo explicitly names that cleanup. This includes `wallet_list`, `wallet_details`, `sui-api-accounts`, `near-api-accounts`, `eth-api-accounts`, `evm_accounts`, `authorized_dapps_deprecated`, `blacklist_deprecated`, and `dapp_stampscores_deprecated`.
- In every final readout, explicitly report whether a commit was made, whether the repo is clean, and propose the next todo to tackle.
- The open-source API and SDK implementation lives outside this repo in `Cubid-Me/cubid-sdk`; use your local clone of that repo for SDK implementation work.
- Do not add public API or SDK implementation code to this repo. `packages/core/` is a historical snapshot retained for migration context only, not a publication target.
- Before implementing changes here that affect public API shape, SDK behavior, integration docs, app-scoped identity semantics, stamp/claim contracts, or developer-facing compatibility, evaluate the impact on `Cubid-Me/cubid-sdk`.
- When a change here impacts the public SDK, create a note for the SDK agents in the SDK repo's `agent-context/messages-from-cubid-passport/` directory describing the change, expected SDK impact, and any follow-up needed.
- Public SDK agents may leave notes for this repo in `agent-context/messages-from-cubid-sdk/`; when new dirty files appear there, read and address them before continuing related product work.
