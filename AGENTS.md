# AGENTS

## Workflow

- Do not push directly to `main`.
- Create a feature branch for every change and open a pull request back into `main`.
- Rebase or otherwise sync frequently from `main` so long-running branches do not drift.
- Add a new entry to `agent-context/session-log.md` immediately before every commit.
- After implementing each todo, commit immediately once the task is in a coherent state and the required session-log entry has been added.

## Session Startup

At the start of a new session, inspect and summarize the relevant work from:

1. `todo.md` files inside any active `agent-context/` feature folders
2. larger implementation notes or planned feature folders inside `agent-context/`
3. open GitHub issues or PR comments when repository access is available

## Repository Map

- `apps/passport/`: live Passport app workspace containing the App Router UI, `pages/api` handlers, app config, shared components, hooks, and frontend support files
- `apps/admin/`: admin control-plane workspace containing the admin UI shell, `pages/api/admin` handlers, Firebase bearer-token verification, and server-side Supabase access
- `packages/config/`: shared environment helper package for server-side runtime configuration
- `packages/types/`: shared type contracts that can be consumed by multiple workspaces
- `apps/passport/public/`: Passport static assets
- `agent-context/`: session logging, feature notes, and small local follow-ups
- `docs/engineering/`: architecture and operating-model docs
- `.github/`: CI workflows

## Commands

- Use Node 20 when working locally
- Install dependencies with `pnpm install`
- Start local development with `pnpm dev`
- Start the admin app explicitly with `pnpm dev:admin`
- Validate changes with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`

## Notes

- Treat committed secrets as incidents, not convenience. Use environment variables or local-only files that are ignored by Git.
- Keep cleanup-only changes separate from feature work whenever practical.
- In every final readout, explicitly report whether a commit was made, whether the repo is clean, and propose the next todo to tackle.
