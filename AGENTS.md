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

- `app/`: App Router pages and client-side flows
- `components/`: shared UI, auth, and wallet components
- `pages/api/`: server endpoints and third-party integration handlers
- `lib/`: shared helpers and service clients
- `config/`: site and web3 configuration
- `redux/`: store setup and slices
- `styles/`, `types/`, `hooks/`: shared frontend support files
- `public/`: static assets
- `agent-context/`: session logging, feature notes, and small local follow-ups

## Commands

- Use Node 20 when working locally
- Install dependencies with `npm ci --legacy-peer-deps`
- Start local development with `npm run dev`
- Validate changes with `npm run lint`, `npm run typecheck`, and `npm run build`

## Notes

- Treat committed secrets as incidents, not convenience. Use environment variables or local-only files that are ignored by Git.
- Keep cleanup-only changes separate from feature work whenever practical.
- In every final readout, explicitly report whether a commit was made, whether the repo is clean, and propose the next todo to tackle.
