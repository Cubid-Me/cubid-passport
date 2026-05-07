import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCubidAuthorizationUrl,
  createAllowPageUrl,
  createCubidCallbackState,
  parseCubidCallbackState,
  summarizeCredentials,
} from "./index"

test("@cubid/react summarizes missing recommended credentials", () => {
  assert.deepEqual(
    summarizeCredentials({
      availableStampTypes: ["phone", "email", "phone"],
      recommendedStampTypes: ["email", "phone", "github"],
      verifiedStampTypes: ["email"],
    }),
    {
      availableStampTypes: ["email", "phone"],
      missingRecommendedStampTypes: ["github", "phone"],
      recommendedStampTypes: ["email", "github", "phone"],
      verifiedStampTypes: ["email"],
    }
  )
})

test("@cubid/react builds AllowPage and provider callback URLs", () => {
  const allowUrl = createAllowPageUrl({
    colorMode: "dark",
    extras: { source: "signup" },
    pageId: 42,
    passportOrigin: "https://passport.cubid.me",
    path: "/widget-allow",
    socialProvider: "github",
    userId: "user_123",
  })
  assert.equal(
    allowUrl,
    "https://passport.cubid.me/widget-allow?uid=user_123&page_id=42&colormode=dark&social_provider=github&source=signup"
  )

  const state = createCubidCallbackState({
    metadata: { flow: "signup" },
    provider: "github",
    userId: "user_123",
  })
  assert.deepEqual(parseCubidCallbackState(state), {
    metadata: { flow: "signup" },
    nonce: undefined,
    pageId: undefined,
    provider: "github",
    returnTo: undefined,
    userId: "user_123",
  })

  const authUrl = buildCubidAuthorizationUrl({
    authorizationUrl: "https://github.com/login/oauth/authorize",
    clientId: "client_123",
    redirectUri: "https://app.example/callback",
    scope: ["read:user", "user:email"],
    state,
  })
  assert.equal(authUrl.includes("client_id=client_123"), true)
  assert.equal(authUrl.includes("scope=read%3Auser+user%3Aemail"), true)
})

test("@cubid/react rejects callback state with unsupported providers", () => {
  const state = createCubidCallbackState({
    provider: "github",
    userId: "user_123",
  })
  const payload = JSON.parse(
    Buffer.from(state, "base64url").toString("utf8")
  ) as Record<string, unknown>
  const invalidState = Buffer.from(
    JSON.stringify({ ...payload, provider: "not-a-provider" })
  ).toString("base64url")

  assert.throws(
    () => parseCubidCallbackState(invalidState),
    /unsupported provider/
  )
})
