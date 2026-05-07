# Cubid Monorepo Operating Model

Last updated: 2026-04-15
Status: Accepted in A01, enacted through A03

## Purpose

This document is the source of truth for the Cubid monorepo operating model. It defines the repo root, workspace toolchain, target layout, package boundaries, environment ownership, CI/task contract, and migration sequence that later tasks must follow.

A01 locked the operating model. A02 and A03 then enacted the first live pieces of that model by moving Passport into `apps/passport`, importing Admin into `apps/admin`, and introducing the first shared packages.

## Locked Decisions

- The current `cubid-passport` repository becomes the long-term umbrella monorepo root.
- `pnpm` is the workspace manager.
- Turborepo is the task runner and task graph orchestrator.
- Node 24 is the runtime baseline for local development and CI.
- Migration principle is:
  - preserve behavior first
  - move code second
  - improve internals third
- `cubid-admin` will be imported with a preserve-first strategy.
- No Next.js modernization is required during Admin import beyond what is necessary for workspace compatibility.

## Current State

Today the platform lives in one monorepo rooted at `/Users/botmaster/src/cubid/cubid-passport`.

- `apps/passport`
  - active Next.js 14 user-facing application
- `apps/admin`
  - imported Next.js 13 canary admin control plane
- `packages/config`
  - shared server-side env helpers
- `packages/types`
  - shared cross-workspace type contracts

The repository still needs deeper package extraction, but it already has to accommodate multiple Next.js applications with temporarily different internal maturity levels.

## Target Repository Shape

The top-level layout is locked as:

```text
apps/
  passport/
  admin/
services/
  oidc/
packages/
  ui/
  config/
  auth/
  identity/
  stamps/
  claims/
  db/
  types/
tooling/
docs/
  engineering/
```

### Workspace Intent

- `apps/passport`
  end-user passport and allow-flow application
- `apps/admin`
  admin control plane for clients, claims, policy, and operations
- `services/oidc`
  dedicated OIDC issuer service for Login with Cubid
- `packages/ui`
  shared client-safe design primitives and reusable presentation components
- `packages/config`
  shared typed configuration helpers and environment-loading utilities
- `packages/auth`
  shared authentication primitives, session helpers, and auth integration logic
- `packages/identity`
  app-scoped identity, subject, and consent domain logic
- `packages/stamps`
  stamp registries, workflows, and stamp-related business logic
- `packages/claims`
  custom claims, identity-depth policies, and claim evaluation contracts
- `packages/db`
  server-only database access adapters and persistence utilities
- `packages/types`
  shared type definitions and contract shapes that are safe for client or server use
- `tooling/`
  optional location for repo-level scripts, generators, and CI support code once needed

## Package Naming Contract

Shared packages are locked to:

- `@cubid/ui`
- `@cubid/config`
- `@cubid/auth`
- `@cubid/identity`
- `@cubid/stamps`
- `@cubid/claims`
- `@cubid/db`
- `@cubid/types`

Applications and services are locked to:

- `@cubid/passport`
- `@cubid/admin`
- `@cubid/oidc`

## Dependency Boundary Rules

### Client-safe packages

These may be imported by browser bundles:

- `@cubid/ui`
- `@cubid/types`
- explicitly client-safe subpaths from `@cubid/auth` only when intentionally exposed

### Server-first packages

These are server-only by default:

- `@cubid/config`
- `@cubid/db`
- `@cubid/identity`
- `@cubid/stamps`
- `@cubid/claims`
- most of `@cubid/auth`

### Rules

- Apps and services may import shared packages.
- Shared packages must never import app code.
- Browser bundles must never import `@cubid/db` or server-only config.
- `@cubid/auth` must expose separate client-safe and server-only entrypoints where needed.
- `@cubid/oidc` may depend on all server-side domain packages.
- Passport and Admin UI code must consume server-first packages only through server routes, server actions, server components, or explicitly client-safe facades.

## Environment Ownership

Environment variables are owned per app or service boundary.

- browser-safe values must remain local to the app that ships them
- server secrets must remain local to the service or app that uses them
- shared packages may describe config shape, but they must not own cross-app secret storage
- every app or service must have its own `.env.example`

### Required split

- public browser values: explicitly marked and app-local
- server runtime values: private to one app or service
- operator-only values: restricted to admin or infrastructure-facing services

## Workspace and Tooling Contract

### Workspace manager

The monorepo will use `pnpm-workspace.yaml` at the root with these workspace globs:

- `apps/*`
- `services/*`
- `packages/*`
- `tooling/*`

### Task orchestration

The monorepo will use a root `turbo.json` that defines at least:

- `dev`
- `build`
- `lint`
- `typecheck`
- `test`
- `format`

### Root package contract

As of A02, Passport lives in `apps/passport` and the root `package.json` is a pure monorepo package whose top-level scripts delegate through Turbo.

Those root scripts are locked to:

- `dev`
- `build`
- `lint`
- `typecheck`
- `test`
- `format`

Important A01 compatibility note:

- A01 introduces the workspace and Turbo contract files now.
- A01 intentionally stopped short of repointing the current root `package.json` scripts, because the root package was still the live Passport application at that time.
- A02 completed that script delegation when the repo root stopped being the app itself.

## CI Contract

PR CI must run Turbo-scoped tasks based on changed workspaces once the repo has multiple packages.

Minimum CI contract:

- install dependencies from the repo root using `pnpm`
- run Turbo for `lint`, `typecheck`, and `build`
- run `test` for workspaces that define it
- allow workspace filtering by changed files

Each app, service, and package must declare at least the scripts it actually supports. No workspace should pretend to support `test` or `dev` if it does not.

## Import and Compatibility Rules

### Passport import rule

- Current `cubid-passport` contents move into `apps/passport` in A02.
- The move must preserve behavior and local developer workflows before any deeper refactor.

### Admin import rule

- `cubid-admin` is imported into `apps/admin` in A03 as a single snapshot from source head `60080e4`.
- The import is preserve-first, not a modernization project.
- `apps/admin` may temporarily keep its current internal structure and older app conventions.
- During or immediately after import, it must conform to workspace-level install, build, lint, typecheck, and test contracts.

## Current-to-Target Mapping

### Passport

- current state: `apps/passport` workspace inside the monorepo
- target state: `apps/passport`
- migration expectation: behavior-preserving file move first, package extraction later

### Admin

- current state: `apps/admin` workspace imported from sibling repository head `60080e4`
- target state: `apps/admin`
- migration expectation: import as-is where practical, then normalize gradually

### OIDC

- current state: not implemented
- target state: `services/oidc`
- migration expectation: build only after both Passport and Admin are present in the workspace and shared domain contracts have started to stabilize
- detailed OIDC and trust contract: [docs/engineering/login-with-cubid-oidc-architecture.md](./login-with-cubid-oidc-architecture.md)

## Migration Sequence

Later work must follow this order:

1. add root workspace and tooling scaffolding
2. relocate Passport into `apps/passport` without behavior changes
3. import Admin into `apps/admin` without major modernization
4. extract shared packages only after both apps run inside the workspace
5. add `services/oidc`
6. normalize shared auth and domain contracts
7. modernize apps incrementally

## Out of Scope for A01

A01 does not:

- move application files
- upgrade Next.js versions
- extract shared packages
- import `cubid-admin`
- rewire root scripts to Turbo yet
- build OIDC, claims, or passkeys

Those tasks depend on this operating model and are intentionally deferred.
