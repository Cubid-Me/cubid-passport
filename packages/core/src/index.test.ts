import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createCubidApiClient,
  CubidApiError,
  type CubidFetch,
} from "./index"

const createJsonResponse = (payload: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
      "x-request-id": "request_123",
      ...(init.headers ?? {}),
    },
    status: init.status ?? 200,
  })

test("createCubidApiClient rejects invalid configuration safely", () => {
  assert.throws(
    () => createCubidApiClient({ apiKey: "key", baseUrl: "" }),
    (error) =>
      error instanceof CubidApiError &&
      error.category === "config" &&
      !error.message.includes("key")
  )

  assert.throws(
    () => createCubidApiClient({ apiKey: "   ", baseUrl: "https://api.test" }),
    (error) =>
      error instanceof CubidApiError &&
      error.category === "config" &&
      !error.message.includes("api_")
  )

  assert.throws(
    () =>
      createCubidApiClient({
        apiKey: "key",
        baseUrl: "file://localhost/tmp/cubid",
      }),
    (error) =>
      error instanceof CubidApiError &&
      error.category === "config" &&
      error.message.includes("HTTPS")
  )
})

test("createCubidApiClient allows HTTP only for loopback development hosts", async () => {
  const inputs: Array<string | URL> = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    new URL("http://[::1]:3000"),
  ]

  for (const baseUrl of inputs) {
    const client = createCubidApiClient({
      apiKey: "api_key",
      baseUrl,
      fetch: async () => createJsonResponse({ cubid_score: 1 }),
    })

    const response = await client.fetchScore({ userId: "dapp_user_123" })
    assert.equal(response.cubidScore, 1)
  }

  assert.throws(
    () =>
      createCubidApiClient({
        apiKey: "api_key",
        baseUrl: "http://example.com",
      }),
    (error) =>
      error instanceof CubidApiError &&
      error.category === "config" &&
      error.message.includes("loopback")
  )
})

test("createUser posts legacy v2 payload with credentials", async () => {
  const calls: Array<{ body: unknown; input: string | URL | Request }> = []
  const fetchImpl: CubidFetch = async (input, init) => {
    calls.push({
      body: JSON.parse(String(init?.body)),
      input,
    })
    return createJsonResponse({
      error: null,
      is_blacklisted: false,
      is_new_app_user: true,
      is_sybil_attack: false,
      user_id: "dapp_user_123",
    })
  }

  const client = createCubidApiClient({
    apiKey: "cubid_live_lookup_secret",
    baseUrl: "https://passport.cubid.me/",
    dappId: 42,
    fetch: fetchImpl,
  })
  const response = await client.createUser({ email: "user@example.com" })

  assert.equal(response.userId, "dapp_user_123")
  assert.equal(response.isNewAppUser, true)
  assert.equal(response.isSybilAttack, false)
  assert.equal(response.isBlacklisted, false)
  assert.equal(
    String(calls[0]?.input),
    "https://passport.cubid.me/api/v2/create_user"
  )
  assert.deepEqual(calls[0]?.body, {
    apikey: "cubid_live_lookup_secret",
    dapp_id: 42,
    email: "user@example.com",
  })
})

test("low-level wrappers use injected fetch for identity, score, and stamps", async () => {
  const paths: string[] = []
  const fetchImpl: CubidFetch = async (input) => {
    const path = new URL(String(input)).pathname
    paths.push(path)
    if (path.endsWith("/fetch_identity")) {
      return createJsonResponse({
        error: null,
        stamp_details: [
          {
            stamp_type: "email",
            status: "Verified",
            value: "user@example.com",
          },
        ],
      })
    }
    if (path.endsWith("/fetch_score")) {
      return createJsonResponse({
        cubid_score: 10,
        error: null,
        scoring_schema: 1,
      })
    }
    return createJsonResponse({ all_stamps: [], email: "user@example.com" })
  }

  const client = createCubidApiClient({
    apiKey: "api_key",
    baseUrl: "https://passport.cubid.me",
    fetch: fetchImpl,
  })

  const identity = await client.fetchIdentity({ userId: "dapp_user_123" })
  const score = await client.fetchScore({ userId: "dapp_user_123" })
  const stamps = await client.fetchStamps({ userId: "dapp_user_123" })

  assert.deepEqual(identity.stampDetails, [
    {
      raw: {
        stamp_type: "email",
        status: "Verified",
        value: "user@example.com",
      },
      stampType: "email",
      status: "Verified",
      value: "user@example.com",
    },
  ])
  assert.equal(score.cubidScore, 10)
  assert.equal(score.scoringSchema, 1)
  assert.deepEqual(stamps.allStamps, [])
  assert.equal(stamps.email, "user@example.com")

  assert.deepEqual(paths, [
    "/api/v2/identity/fetch_identity",
    "/api/v2/score/fetch_score",
    "/api/v2/identity/fetch_stamps",
  ])
})

test("HTTP failures map to structured CubidApiError values", async () => {
  const fetchImpl: CubidFetch = async () =>
    createJsonResponse(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "Too many requests.",
        },
      },
      { status: 429 }
    )
  const client = createCubidApiClient({
    apiKey: "api_key",
    baseUrl: "https://passport.cubid.me",
    fetch: fetchImpl,
  })

  await assert.rejects(
    () => client.fetchScore({ userId: "dapp_user_123" }),
    (error) => {
      assert.ok(error instanceof CubidApiError)
      assert.equal(error.category, "rate_limit")
      assert.equal(error.status, 429)
      assert.equal(error.requestId, "request_123")
      assert.equal(error.message, "Too many requests.")
      return true
    }
  )
})

test("transport failures map to structured CubidApiError values", async () => {
  const client = createCubidApiClient({
    apiKey: "api_key",
    baseUrl: "https://passport.cubid.me",
    fetch: async () => {
      throw new TypeError("network unavailable")
    },
  })

  await assert.rejects(
    () => client.fetchScore({ userId: "dapp_user_123" }),
    (error) => {
      assert.ok(error instanceof CubidApiError)
      assert.equal(error.category, "upstream")
      assert.equal(error.status, undefined)
      assert.equal(error.requestId, undefined)
      assert.equal(
        error.message,
        "Cubid API request failed before receiving a response."
      )
      assert.ok(error.details instanceof TypeError)
      return true
    }
  )
})

test("createUser requires a dapp id without leaking the API key", async () => {
  const client = createCubidApiClient({
    apiKey: "very-secret-api-key",
    baseUrl: "https://passport.cubid.me",
    fetch: async () => createJsonResponse({}),
  })

  assert.throws(
    () => client.createUser({ email: "user@example.com" }),
    (error) =>
      error instanceof CubidApiError &&
      error.category === "config" &&
      !error.message.includes("very-secret-api-key")
  )
})

test("ensureUserByEmail resolves the canonical user id through create_user", async () => {
  const calls: Array<{ body: unknown; input: string | URL | Request }> = []
  const client = createCubidApiClient({
    apiKey: "api_key",
    baseUrl: "https://passport.cubid.me",
    dappId: "dapp_123",
    fetch: async (input, init) => {
      calls.push({
        body: JSON.parse(String(init?.body)),
        input,
      })
      return createJsonResponse({
        error: null,
        is_blacklisted: false,
        is_new_app_user: false,
        is_sybil_attack: false,
        user_id: "dapp_user_123",
      })
    },
  })

  const response = await client.ensureUserByEmail({
    email: " user@example.com ",
  })

  assert.equal(response.email, "user@example.com")
  assert.equal(response.userId, "dapp_user_123")
  assert.equal(response.isNewAppUser, false)
  assert.deepEqual(calls[0]?.body, {
    apikey: "api_key",
    dapp_id: "dapp_123",
    email: "user@example.com",
  })
})

test("malformed success responses map to structured CubidApiError values", async () => {
  const client = createCubidApiClient({
    apiKey: "api_key",
    baseUrl: "https://passport.cubid.me",
    fetch: async () => createJsonResponse(["not", "an", "object"]),
  })

  await assert.rejects(
    () => client.fetchIdentity({ userId: "dapp_user_123" }),
    (error) => {
      assert.ok(error instanceof CubidApiError)
      assert.equal(error.category, "upstream")
      assert.equal(error.code, "MALFORMED_RESPONSE")
      assert.equal(error.endpoint, "identity/fetch_identity")
      assert.equal(error.requestId, "request_123")
      return true
    }
  )
})

test("syncIdentitySnapshot combines identity, score, and stamp responses", async () => {
  const paths: string[] = []
  const client = createCubidApiClient({
    apiKey: "api_key",
    baseUrl: "https://passport.cubid.me",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname
      paths.push(path)

      if (path.endsWith("/fetch_identity")) {
        return createJsonResponse({ error: null, stamp_details: [] })
      }
      if (path.endsWith("/fetch_score")) {
        return createJsonResponse({
          cubid_score: 99,
          error: null,
          scoring_schema: "v2",
        })
      }
      return createJsonResponse({
        all_stamps: [
          {
            id: 1,
            is_valid: true,
            stamptype: 13,
            stamptype_string: "email",
            uniquevalue: "user@example.com",
          },
        ],
        email: "user@example.com",
      })
    },
  })

  const snapshot = await client.syncIdentitySnapshot({
    userId: "dapp_user_123",
  })

  assert.equal(snapshot.userId, "dapp_user_123")
  assert.equal(snapshot.score.cubidScore, 99)
  assert.equal(snapshot.stamps.allStamps[0]?.stampType, "email")
  assert.match(snapshot.syncedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(paths.sort(), [
    "/api/v2/identity/fetch_identity",
    "/api/v2/identity/fetch_stamps",
    "/api/v2/score/fetch_score",
  ])
})
