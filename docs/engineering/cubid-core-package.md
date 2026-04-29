# Cubid Core Package

`@cubid/core` is the foundation package for external Cubid integrations. It is
runtime-agnostic by design: no React, Next.js, Firebase, Supabase, Node-only
APIs, or browser-only helpers. The package uses standard `fetch` and plain JSON
contracts so it can run in Node, Deno, Supabase Edge Functions, workers, and
tests.

## E02.1 Contract

- Package name: `@cubid/core`
- Initial version: `0.1.0`
- Runtime target: ESM, standards-only
- Initial surface: low-level wrappers for current Passport v2 routes
- Deferred to E02.2: `ensureUserByEmail`, identity snapshot helpers, and
  normalized high-level sync flows

## Publishing

Use trusted publishing only. Do not publish this package with a local npm user
or a long-lived npm token.

npm Trusted Publisher setup:

- Provider: GitHub Actions
- Organization/user: `Cubid-Me`
- Repository: `cubid-passport`
- Workflow filename: `publish.yml`
- Environment: blank unless release approvals are added intentionally

JSR setup:

- Scope/package: `@cubid/core`
- Linked GitHub repository: `Cubid-Me/cubid-passport`
- Workflow: `.github/workflows/publish.yml`

The publish workflow is manual (`workflow_dispatch`) so maintainers choose when
to release. Normal CI performs npm pack and JSR dry-runs to catch packaging
regressions before release.
