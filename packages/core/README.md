# `@cubid/core`

Runtime-agnostic Cubid foundation client for server-side integrations.

This package is intentionally small and standards-only. It does not import
React, Next.js, Firebase, Supabase, Node built-ins, or browser-only helpers.
All requests use `fetch`, `RequestInit`, `Headers`, and plain JSON so the same
client can run in Node, Deno, Supabase Edge Functions, workers, and tests.

## Install

```sh
npm install @cubid/core
```

```ts
// Deno / Supabase Edge, after the package is published to JSR.
import { createCubidApiClient } from "jsr:@cubid/core"
```

## Basic Usage

```ts
import { createCubidApiClient } from "@cubid/core"

const cubid = createCubidApiClient({
  baseUrl: "https://passport.cubid.me",
  apiKey: process.env.CUBID_API_KEY!,
  dappId: process.env.CUBID_DAPP_ID!,
})

const created = await cubid.createUser({
  email: "person@example.com",
})

const score = await cubid.fetchScore({
  userId: created.userId!,
})
```

For server-side "resolve or create by email" flows, prefer
`ensureUserByEmail` so callers always receive a canonical app-scoped Cubid user
identifier or a structured error.

```ts
const user = await cubid.ensureUserByEmail({
  email: "person@example.com",
})

const snapshot = await cubid.syncIdentitySnapshot({
  userId: user.userId,
})
```

## Supabase Edge / Deno

Pass `fetch` explicitly when a runtime or test harness provides its own
instrumented fetch implementation.

```ts
import { createCubidApiClient } from "jsr:@cubid/core"

const cubid = createCubidApiClient({
  baseUrl: Deno.env.get("CUBID_API_BASE_URL") ?? "https://passport.cubid.me",
  apiKey: Deno.env.get("CUBID_API_KEY")!,
  dappId: Deno.env.get("CUBID_DAPP_ID")!,
  fetch,
})
```

Keep `apiKey` server-side. Do not expose dapp API keys to browsers or public
client bundles.

## Foundation Surface

The foundation client provides normalized wrappers around current Passport v2
endpoints:

- `createUser`
- `ensureUserByEmail`
- `addStamp`
- `fetchIdentity`
- `fetchScore`
- `fetchStamps`
- `fetchApproxLocation`
- `fetchExactLocation`
- `fetchRoughLocation`
- `fetchUserData`
- `searchLocation`
- `sendEmailOtp`
- `verifyEmailOtp`
- `sendPhoneOtp`
- `verifyPhoneOtp`
- `syncIdentitySnapshot`

Responses use SDK-friendly camelCase fields while retaining the original
server payload in `raw` for migration/debugging. Malformed successful responses
throw `CubidApiError` with `code: "MALFORMED_RESPONSE"` instead of returning an
unsafe partial shape.

OTP helpers intentionally return delivery or verification metadata only. They
never expose raw OTP values, even if a legacy server payload includes one.

Profile-completion flows and React components are intentionally deferred to
later SDK tasks.

## Deno Validation

The package includes a Supabase-Edge-style Deno smoke check that imports the
TypeScript source directly before publish:

```sh
pnpm --filter @cubid/core deno:check
```

After trusted publishing is configured and the package is released, Edge
Functions should import from `jsr:@cubid/core`.

See `docs/engineering/next-supabase-edge-integration-guide.md` for Next.js and
Supabase Edge examples.

## Errors

Failed requests throw `CubidApiError` with:

- `category`: `config`, `auth`, `validation`, `rate_limit`, `not_found`,
  `upstream`, or `unknown`
- `code`: machine-readable detail such as `NETWORK_ERROR` or
  `MALFORMED_RESPONSE` when available
- `endpoint`: Cubid endpoint associated with the failure when available
- `status`: HTTP status when available
- `requestId`: Cubid `X-Request-Id` when returned by the API
- `details`: parsed error payload when available

Error messages never include API key material.

## Publishing

This package is designed for npm Trusted Publishing and JSR trusted publishing
through GitHub Actions. Do not publish with a local npm user token.

The npm Trusted Publisher should be configured as:

- Provider: GitHub Actions
- Organization/user: `Cubid-Me`
- Repository: `cubid-passport`
- Workflow filename: `publish.yml`
- Environment: blank unless a protected release environment is intentionally
  added

The JSR package should be linked to:

- Package: `@cubid/core`
- Repository: `Cubid-Me/cubid-passport`
- Workflow: `.github/workflows/publish.yml`

See `docs/engineering/core-publishing-runbook.md` in the repository for the
full npm/JSR setup checklist and first-version bootstrap notes.
