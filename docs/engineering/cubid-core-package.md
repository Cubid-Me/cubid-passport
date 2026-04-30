# Cubid Core Package

This Passport-repo copy is historical implementation context only. The
canonical public SDK home is `Cubid-Me/cubid-sdk`, and public package
implementation and publication should happen there rather than from
`cubid-passport`. The private repo no longer carries a manual package publish
workflow.

`@cubid/core` is the foundation package for external Cubid integrations. It is
runtime-agnostic by design: no React, Next.js, Firebase, Supabase, Node-only
APIs, or browser-only helpers. The package uses standard `fetch` and plain JSON
contracts so it can run in Node, Deno, Supabase Edge Functions, workers, and
tests.

## Current Contract

- Package name: `@cubid/core`
- Initial version: `0.1.0`
- License: Apache-2.0
- Runtime target: ESM, standards-only
- Surface: normalized wrappers for current Passport v2 routes plus
  server-facing identity sync helpers
- Identity helpers: `ensureUserByEmail`, `fetchIdentity`, `fetchScore`,
  `fetchStamps`, and `syncIdentitySnapshot`
- Additional wrappers: `addStamp`, location fetches, user-data fetch, location
  search, and email/phone OTP send/verify helpers
- Response model: SDK-friendly camelCase fields with the original server
  payload retained in `raw` for migration and debugging
- Error model: `CubidApiError` includes category, optional code, optional
  endpoint, request ID, status, and parsed details

Malformed successful responses must throw `CubidApiError` with
`code: "MALFORMED_RESPONSE"` so integrators do not accidentally depend on
partial or unsafe response shapes.

OTP helpers must not expose raw OTP values. They normalize only delivery and
verification metadata even if a legacy server payload contains a code.

## Publishing

Use trusted publishing only. Do not publish this package with a local npm user
or a long-lived npm token.

The operator checklist lives in
`docs/engineering/core-publishing-runbook.md`. Use that runbook for the first
registry setup, first-version bootstrap decision, and manual GitHub Actions
release flow.

npm Trusted Publisher setup:

- Provider: GitHub Actions
- Organization/user: `Cubid-Me`
- Repository: `cubid-sdk`
- Workflow filename: `publish.yml`
- Environment: blank unless release approvals are added intentionally

JSR setup:

- Scope/package: `@cubid/core`
- Linked GitHub repository: `Cubid-Me/cubid-sdk`
- Workflow: `.github/workflows/publish.yml`

The publish workflow is manual (`workflow_dispatch`) so maintainers choose when
to release. Normal CI performs npm pack and JSR dry-runs to catch packaging
regressions before release.

## Deno And Edge Validation

The package includes a Deno smoke check at
`packages/core/deno/supabase-edge-smoke.ts`. It imports the TypeScript source
directly and models a Supabase Edge Function using `Deno.env`, injected `fetch`,
`ensureUserByEmail`, and `syncIdentitySnapshot`.

Run:

```sh
pnpm --filter @cubid/core deno:check
```

This validates Deno/Supabase Edge importability before publication. The
published JSR import path remains `jsr:@cubid/core` and is documented in
`docs/engineering/next-supabase-edge-integration-guide.md`.
