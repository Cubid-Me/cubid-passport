# Next.js And Supabase Edge Integration Guide

This guide shows how downstream apps should consume `@cubid/core` from a
Next.js server and from Supabase Edge Functions. `@cubid/core` is
runtime-agnostic: keep it on the server, inject `fetch` when useful, and never
ship Cubid dapp API keys to browser bundles.

The live public package source for this guide is
`/Users/botmaster/src/cubid/cubid-sdk-v2`. Keep `cubid-passport` private and do
not treat it as the package implementation or publication source.

## Server-Side Next.js Usage

Use `@cubid/core` from route handlers, server actions, or backend-only modules.
Browser components should call your app server, not Cubid directly.

```ts
import { createCubidApiClient } from "@cubid/core"

const cubid = createCubidApiClient({
  apiKey: process.env.CUBID_API_KEY!,
  baseUrl: process.env.CUBID_API_BASE_URL ?? "https://passport.cubid.me",
  dappId: process.env.CUBID_DAPP_ID!,
})

export async function ensureCubidUser(email: string) {
  return cubid.ensureUserByEmail({ email })
}
```

## Supabase Edge Usage

Use the JSR package after publication:

```ts
import { createCubidApiClient } from "jsr:@cubid/core"

const cubid = createCubidApiClient({
  apiKey: Deno.env.get("CUBID_API_KEY")!,
  baseUrl: Deno.env.get("CUBID_API_BASE_URL") ?? "https://passport.cubid.me",
  dappId: Deno.env.get("CUBID_DAPP_ID")!,
  fetch,
})

Deno.serve(async (request) => {
  const { email } = await request.json()
  const user = await cubid.ensureUserByEmail({ email })
  const snapshot = await cubid.syncIdentitySnapshot({ userId: user.userId })

  return Response.json({
    score: snapshot.score.cubidScore,
    stamps: snapshot.stamps.allStamps.map((stamp) => stamp.stampType),
    userId: user.userId,
  })
})
```

The repo validates Deno compatibility before publish with
`pnpm --filter @cubid/core deno:check`. Live `jsr:@cubid/core` imports are
available after the package is linked and published through trusted publishing.

## Secrets

Store these as server-side or Edge Function secrets only:

- `CUBID_API_KEY`
- `CUBID_DAPP_ID`
- `CUBID_API_BASE_URL`, optional and usually `https://passport.cubid.me`

Do not place Cubid dapp API keys in `NEXT_PUBLIC_*`, browser local storage, or
client-rendered JavaScript.

## Identity Snapshot Pattern

For signup or login flows, resolve the Cubid user first and then fetch a
snapshot for local app state.

```ts
const user = await cubid.ensureUserByEmail({ email: session.user.email })
const snapshot = await cubid.syncIdentitySnapshot({ userId: user.userId })

await saveLocalIdentitySnapshot({
  cubidUserId: user.userId,
  score: snapshot.score.cubidScore,
  stampTypes: snapshot.stamps.allStamps.map((stamp) => stamp.stampType),
  syncedAt: snapshot.syncedAt,
})
```

Apps should store the app-scoped `userId` and a refresh timestamp, not raw Cubid
credentials or unnecessary identity details.

## Phone OTP And Provider Handoff

`@cubid/core` exposes low-level OTP wrappers for server-controlled flows:

```ts
await cubid.sendPhoneOtp({ phone: "+15555550123" })
const verified = await cubid.verifyPhoneOtp({
  otp: form.otp,
  phone: "+15555550123",
})
```

The OTP helpers return delivery or verification metadata only; they never return
raw OTP codes. React UI primitives, AllowPage helpers, and provider handoff
flows belong in later `@cubid/react` work, not in `@cubid/core`.

## Post-Return Refresh

After a user returns from an AllowPage or provider-stamp flow, refresh Cubid
state server-side and update the app's cached view.

```ts
const snapshot = await cubid.syncIdentitySnapshot({ userId: cubidUserId })

return {
  linked: snapshot.stamps.allStamps.map((stamp) => stamp.stampType),
  score: snapshot.score.cubidScore,
  syncedAt: snapshot.syncedAt,
}
```

## Stability Notes

`@cubid/core` `0.x` is the pre-1.0 SDK foundation. The package should preserve
runtime-agnostic imports, structured `CubidApiError`, and the high-level helper
names introduced in E02.2. Breaking changes before `1.0` must be documented in
the package README and this guide before publication.
