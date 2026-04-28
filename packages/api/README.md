# `@cubid/api`

Runtime-agnostic Cubid API client for server-side integrations.

This package is intentionally small and standards-only. It does not import
React, Next.js, Firebase, Supabase, Node built-ins, or browser-only helpers.
All requests use `fetch`, `RequestInit`, `Headers`, and plain JSON so the same
client can run in Node, Deno, Supabase Edge Functions, workers, and tests.

## Install

```sh
npm install @cubid/api
```

```ts
// Deno / Supabase Edge, after the package is published to JSR.
import { createCubidApiClient } from "jsr:@cubid/api"
```

## Basic Usage

```ts
import { createCubidApiClient } from "@cubid/api"

const cubid = createCubidApiClient({
  baseUrl: "https://passport.cubid.me",
  apiKey: process.env.CUBID_API_KEY!,
  dappId: process.env.CUBID_DAPP_ID!,
})

const created = await cubid.createUser({
  email: "person@example.com",
})

const score = await cubid.fetchScore({
  userId: created.user_id!,
})
```

## Supabase Edge / Deno

Pass `fetch` explicitly when a runtime or test harness provides its own
instrumented fetch implementation.

```ts
import { createCubidApiClient } from "jsr:@cubid/api"

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

E02.1 provides low-level wrappers around current Passport v2 endpoints:

- `createUser`
- `fetchIdentity`
- `fetchScore`
- `fetchStamps`

Higher-level helpers such as `ensureUserByEmail`, identity snapshots, and
profile-completion flows are intentionally deferred to E02.2 and later SDK
tasks.

## Errors

Failed requests throw `CubidApiError` with:

- `category`: `config`, `auth`, `validation`, `rate_limit`, `not_found`,
  `upstream`, or `unknown`
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

- Package: `@cubid/api`
- Repository: `Cubid-Me/cubid-passport`
- Workflow: `.github/workflows/publish.yml`
