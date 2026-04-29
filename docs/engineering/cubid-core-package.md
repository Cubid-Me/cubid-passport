# Cubid Core Package

`@cubid/core` is the foundation package for external Cubid integrations. It is
runtime-agnostic by design: no React, Next.js, Firebase, Supabase, Node-only
APIs, or browser-only helpers. The package uses standard `fetch` and plain JSON
contracts so it can run in Node, Deno, Supabase Edge Functions, workers, and
tests.

## Current Contract

- Package name: `@cubid/core`
- Initial version: `0.1.0`
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
