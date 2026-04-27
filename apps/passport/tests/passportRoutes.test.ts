import assert from "node:assert/strict"
import test from "node:test"

import consentListHandler from "../pages/api/oidc/consents/list"
import supabaseSelectHandler from "../pages/api/supabase/select"
import sendOtpHandler from "../pages/api/twillio/send-otp"
import webhookTriggerHandler from "../pages/api/cubid-webhook/trigger-url"
import createUserHandler from "../pages/api/v2/create_user"
import { setPassportFirebaseAdminAuthForTests } from "../lib/server/firebaseAdmin"
import { setPassportSupabaseForTests } from "../lib/server/supabase"

import {
  createApiRequest,
  createApiResponse,
  MockPassportSupabase,
} from "./helpers"

process.env.PASSPORT_CORS_ALLOWED_ORIGINS ??= "https://passport.cubid.me"
process.env.PASSPORT_INTERNAL_API_TOKEN ??= "passport-internal-test-token"
process.env.SUPABASE_URL ??= "https://supabase.example.com"
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key"

test.afterEach(() => {
  setPassportSupabaseForTests(null)
  setPassportFirebaseAdminAuthForTests(null)
})

test("legacy Passport Supabase select endpoint is hard-disabled with a request id", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    headers: {
      "x-request-id": "passport_removed_1",
    },
    method: "POST",
    url: "/api/supabase/select",
  })
  const res = createApiResponse()

  await supabaseSelectHandler(req, res)

  assert.equal(res.statusCode, 410)
  assert.equal(res.headers["x-request-id"], "passport_removed_1")
  assert.deepEqual(res.body, {
    error: {
      code: "endpoint_removed",
      message: "Generic Passport Supabase CRUD endpoints have been removed.",
      requestId: "passport_removed_1",
    },
  })
})

test("Passport OIDC consent list uses the shared user baseline for missing bearer tokens", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/oidc/consents/list",
  })
  const res = createApiResponse()

  await consentListHandler(req, res)

  assert.equal(res.statusCode, 401)
  assert.match(String(res.headers["x-request-id"]), /^passport_/)
  assert.deepEqual(res.body, {
    error: {
      code: "unauthorized",
      message: "Missing Firebase bearer token.",
      requestId: res.headers["x-request-id"],
    },
  })
})

test("Passport OTP send rejects malformed payloads with the shared envelope", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/twillio/send-otp",
  })
  const res = createApiResponse()

  await sendOtpHandler(req, res)

  assert.equal(res.statusCode, 400)
  assert.match(String(res.headers["x-request-id"]), /^passport_/)
  const body = res.body as {
    error: { code: string; details?: { issues?: unknown[] }; message: string; requestId: string }
  }
  assert.equal(body.error.code, "invalid_request")
  assert.equal(body.error.message, "Request validation failed.")
  assert.equal(body.error.requestId, res.headers["x-request-id"])
  assert.ok(Array.isArray(body.error.details?.issues))
})

test("Passport OTP send returns a rate-limit denial before executing the handler body", async () => {
  const now = Date.now()
  const windowStartMs = now - (now % 60000)
  const supabase = new MockPassportSupabase()
  supabase.setBucket(`passport_otp:198.51.100.10:${windowStartMs}`, 5)
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      phone: "+15555550123",
    },
    headers: {
      origin: "https://passport.cubid.me",
      "x-forwarded-for": "198.51.100.10",
    },
    url: "/api/twillio/send-otp",
  })
  const res = createApiResponse()

  await sendOtpHandler(req, res)

  assert.equal(res.statusCode, 429)
  assert.equal(typeof res.headers["retry-after"], "string")
  assert.equal((res.body as { error: { code: string } }).error.code, "rate_limit_exceeded")
})

test("Passport v2 create_user rejects malformed dapp payloads before execution", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      dapp_id: 42,
      email: "alice@example.com",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v2/create_user",
  })
  const res = createApiResponse()

  await createUserHandler(req, res)

  assert.equal(res.statusCode, 400)
  assert.equal((res.body as { error: { code: string } }).error.code, "invalid_request")
  assert.equal(
    (res.body as { error: { message: string } }).error.message,
    "Request validation failed."
  )
})

test("Passport internal webhook trigger rejects missing internal bearer tokens", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      stamparray: [1],
      webhook: "credential_added",
    },
    url: "/api/cubid-webhook/trigger-url",
  })
  const res = createApiResponse()

  await webhookTriggerHandler(req, res)

  assert.equal(res.statusCode, 401)
  assert.equal((res.body as { error: { code: string } }).error.code, "unauthorized")
  assert.equal(
    (res.body as { error: { message: string } }).error.message,
    "Missing or invalid internal bearer token."
  )
})
