import assert from "node:assert/strict"
import test from "node:test"

import { hashDappApiKey, hashLegacyDappApiKey } from "@cubid/auth/server"

import {
  handlePassportRoute,
  passportSchemas,
} from "../lib/server/passportApi"
import { setPassportSupabaseForTests } from "../lib/server/supabase"

import {
  createApiRequest,
  createApiResponse,
  MockPassportSupabase,
} from "./helpers"

process.env.PASSPORT_CORS_ALLOWED_ORIGINS ??= "https://passport.cubid.me"
process.env.PASSPORT_INTERNAL_API_TOKEN ??= "passport-internal-test-token"

test.afterEach(() => {
  setPassportSupabaseForTests(null)
})

test("handlePassportRoute reuses request ids and emits allowlisted CORS headers", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://passport.cubid.me",
      "x-request-id": "incoming_passport_request",
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "anonymous",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.test.request_id",
    },
    async ({ context }) => {
      res.status(200).json({ data: { requestId: context.requestId } })
    }
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers["x-request-id"], "incoming_passport_request")
  assert.equal(
    res.headers["access-control-allow-origin"],
    "https://passport.cubid.me"
  )
  assert.deepEqual(res.body, {
    data: { requestId: "incoming_passport_request" },
  })
})

test("handlePassportRoute rejects disallowed origins with the shared envelope", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://evil.example.com",
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "anonymous",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.test.origin_denied",
    },
    async () => {
      throw new Error("handler should not run")
    }
  )

  assert.equal(res.statusCode, 403)
  assert.match(String(res.headers["x-request-id"]), /^passport_/)
  assert.deepEqual(res.body, {
    error: {
      code: "origin_not_allowed",
      message: "Origin is not allowed for this API.",
      requestId: res.headers["x-request-id"],
      details: {
        origin: "https://evil.example.com",
      },
    },
  })
})

test("handlePassportRoute rejects missing dapp credentials before handler execution", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      dapp_id: 42,
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: passportSchemas.z.object({
        dapp_id: passportSchemas.z.number(),
      }),
      rateLimitGroup: "passport_dapp_mutation",
      route: "passport.test.dapp_auth",
    },
    async () => {
      throw new Error("handler should not run")
    }
  )

  assert.equal(res.statusCode, 401)
  assert.match(String(res.headers["x-request-id"]), /^passport_/)
  assert.deepEqual(res.body, {
    error: {
      code: "unauthorized",
      message: "Missing dapp API key.",
      requestId: res.headers["x-request-id"],
    },
  })
})

test("handlePassportRoute authenticates dapp actors through dapp_api_keys", async () => {
  const apiKey = "cubid_live_abc123def4567890_secret"
  const supabase = new MockPassportSupabase()
  supabase.setDapp({ id: 42, appname: "Test App" })
  supabase.setDappApiKey({
    dapp_id: 42,
    id: 7,
    key_hash: hashDappApiKey(apiKey),
    key_prefix: "abc123def4567890",
    status: "active",
  })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      dapp_id: 42,
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: passportSchemas.z.object({
        apikey: passportSchemas.z.string(),
        dapp_id: passportSchemas.z.number(),
      }),
      rateLimitGroup: "passport_dapp_read",
      route: "passport.test.dapp_auth_success",
    },
    async ({ context }) => {
      res.status(200).json({ data: { dappId: context.dapp.id } })
    }
  )

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { data: { dappId: 42 } })
  assert.deepEqual(supabase.lastUsedUpdates, [7])
})

test("handlePassportRoute supports migrated legacy dapp API key hashes", async () => {
  const apiKey = "22222222-2222-2222-2222-222222222222"
  const supabase = new MockPassportSupabase()
  supabase.setDapp({ id: 42, appname: "Legacy App" })
  supabase.setDappApiKey({
    dapp_id: 42,
    id: 8,
    key_hash: hashLegacyDappApiKey(apiKey),
    key_prefix: "22222222-222",
    status: "active",
  })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      dapp_id: apiKey,
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: passportSchemas.z.object({
        dapp_id: passportSchemas.z.string(),
      }),
      rateLimitGroup: "passport_dapp_read",
      route: "passport.test.legacy_dapp_auth_success",
    },
    async ({ context }) => {
      res.status(200).json({ data: { dappId: context.dapp.id } })
    }
  )

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { data: { dappId: 42 } })
})

test("handlePassportRoute rejects invalid dapp API keys from dapp_api_keys", async () => {
  const supabase = new MockPassportSupabase()
  supabase.setDapp({ id: 42, appname: "Test App" })
  supabase.setDappApiKey({
    dapp_id: 42,
    id: 7,
    key_hash: hashDappApiKey("cubid_live_abc123def4567890_secret"),
    key_prefix: "abc123def4567890",
    status: "active",
  })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: "cubid_live_abc123def4567890_wrong",
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: passportSchemas.z.object({
        apikey: passportSchemas.z.string(),
      }),
      rateLimitGroup: "passport_dapp_read",
      route: "passport.test.dapp_auth_invalid",
    },
    async () => {
      throw new Error("handler should not run")
    }
  )

  assert.equal(res.statusCode, 401)
  assert.deepEqual(res.body, {
    error: {
      code: "unauthorized",
      message: "Invalid dapp API key.",
      requestId: res.headers["x-request-id"],
    },
  })
})

test("handlePassportRoute rejects missing internal bearer tokens", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({ body: {} })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "internal",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_internal",
      route: "passport.test.internal_auth",
    },
    async () => {
      throw new Error("handler should not run")
    }
  )

  assert.equal(res.statusCode, 401)
  assert.match(String(res.headers["x-request-id"]), /^passport_/)
  assert.deepEqual(res.body, {
    error: {
      code: "unauthorized",
      message: "Missing or invalid internal bearer token.",
      requestId: res.headers["x-request-id"],
    },
  })
})

test("handlePassportRoute returns rate-limit denials with retry-after headers", async () => {
  const now = Date.now()
  const windowStartMs = now - (now % 60000)
  const supabase = new MockPassportSupabase()
  supabase.setBucket(`passport_otp:203.0.113.10:${windowStartMs}`, 5)
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://passport.cubid.me",
      "x-forwarded-for": "203.0.113.10",
    },
  })
  const res = createApiResponse()

  await handlePassportRoute(
    req,
    res,
    {
      actor: "anonymous",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_otp",
      route: "passport.test.rate_limit",
    },
    async () => {
      throw new Error("handler should not run")
    }
  )

  assert.equal(res.statusCode, 429)
  assert.equal(typeof res.headers["retry-after"], "string")
  assert.deepEqual(res.body, {
    error: {
      code: "rate_limit_exceeded",
      message: "Too many requests.",
      requestId: res.headers["x-request-id"],
    },
  })
  assert.ok(supabase.eventInserts.length >= 1)
  assert.equal(
    supabase.eventInserts.some(
      (event) => event.event_type === "rate_limit.denied"
    ),
    true
  )
})
