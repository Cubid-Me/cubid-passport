# Admin Import Record

Last updated: 2026-04-15
Task: A03

## Source Snapshot

- source repository: `/Users/botmaster/src/cubid/cubid-admin`
- source branch: `main`
- source head: `60080e4`
- import mode: single snapshot import into the existing monorepo
- history policy: no subtree or history-preserving import was performed

## Imported Runtime Files

The Admin workspace was imported into `apps/admin` as a preserve-first runtime snapshot. Imported content includes:

- application directories: `app/`, `components/`, `constant/`, `hooks/`, `lib/`, `pages/`, `public/`, `redux/`
- app config files: `.env.example`, `.eslintrc.js`, `.prettierignore`, `.prettierrc.js`, `jest.config.js`, `jest.setup.js`, `next-env.d.ts`, `next-sitemap.config.js`, `next.config.mjs`, `package.json`, `postcss.config.js`, `tailwind.config.ts`, `tsconfig.json`, `vercel.json`

## Archived or Omitted Repo-Shell Files

The following source-repo files or directories were intentionally not imported as live monorepo contracts:

- `.git`
- `.github/`
- `.husky/`
- `.vscode/`
- `agent-context/`
- `AGENTS.md`
- `CHANGELOG.md`
- `LICENSE`
- `package-lock.json`
- `.DS_Store`

## Rationale

- The monorepo root already owns Git history, CI, editor-agnostic repo policy, roadmap tracking, and agent instructions.
- Carrying over Admin’s old repo shell would create conflicting root contracts inside one repository.
- A03 is a preserve-first app import, not a second root bootstrap.
- Removing `.DS_Store` and ignoring standalone repo plumbing reduces migration noise without changing Admin product behavior.

## Normalization Applied in A03

- renamed the imported workspace package to `@cubid/admin`
- aligned Admin with the root `pnpm` plus Turborepo workflow
- updated TypeScript, Jest, and Tailwind config to resolve from `apps/admin` rather than the old standalone layout
- kept Admin on its current Next.js line while adding workspace-package transpilation for `@cubid/config` and `@cubid/types`
- translated old repo-shell validation into the monorepo root CI workflow instead of importing the old GitHub Actions configuration
