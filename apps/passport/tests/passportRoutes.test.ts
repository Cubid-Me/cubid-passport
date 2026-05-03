import assert from "node:assert/strict"
import test from "node:test"

import axios from "axios"
import { hashDappApiKey } from "@cubid/auth/server"

import actorProfileGetHandler from "../pages/api/actors/profile/get"
import actorProfileUpsertHandler from "../pages/api/actors/profile/upsert"
import appDisclosureGrantListHandler from "../pages/api/disclosures/app-grants/list"
import appDisclosureGrantRevokeHandler from "../pages/api/disclosures/app-grants/revoke"
import consentListHandler from "../pages/api/oidc/consents/list"
import supabaseSelectHandler from "../pages/api/supabase/select"
import sendOtpHandler from "../pages/api/twillio/send-otp"
import sendEmailOtpHandler from "../pages/api/v2/email/send_otp"
import verifyEmailOtpHandler from "../pages/api/v2/email/verify_otp"
import saveSecretV2Handler from "../pages/api/v2/save_secret"
import generateAccountV3Handler from "../pages/api/v3/accounts/generate"
import listAccountsV3Handler from "../pages/api/v3/accounts/list"
import saveSecretV3Handler from "../pages/api/v3/save_secret"
import webhookTriggerHandler from "../pages/api/cubid-webhook/trigger-url"
import createUserHandler from "../pages/api/v2/create_user"
import { hashApiV3IdempotencyRequest } from "../lib/server/apiV3Idempotency"
import { signApiV3WebhookPayload } from "../lib/server/apiV3Webhooks"
import { decryptBlockchainPrivateKeyWithKey } from "../lib/server/blockchainAccounts"
import {
  DAPP_USER_SECRET_LEGACY_SENTINEL,
  decryptDappUserSecretWithKey,
} from "../lib/server/dappUserSecrets"
import {
  hashEmailOtp,
  setSendOtpEmailForTests,
} from "../lib/server/emailOtp"
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

type DataResponse<T> = {
  data: T
}

const originalAxiosPost = axios.post

test.afterEach(() => {
  axios.post = originalAxiosPost
  setPassportSupabaseForTests(null)
  setPassportFirebaseAdminAuthForTests(null)
  setSendOtpEmailForTests(null)
})

const addDappAuth = (supabase: MockPassportSupabase) => {
  const apiKey = "cubid_live_emailotp123456_secret"
  supabase.setDapp({ id: 42, appname: "OTP Test App" })
  supabase.setDappApiKey({
    dapp_id: 42,
    id: 10,
    key_hash: hashDappApiKey(apiKey),
    key_prefix: "emailotp123456",
    status: "active",
  })
  return apiKey
}

const addFirebaseUserAuth = () => {
  setPassportFirebaseAdminAuthForTests({
    verifyIdToken: async () =>
      ({
        email: "person@example.com",
        name: "Test Person",
        uid: "firebase_actor_123",
      }) as never,
  })
}

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

test("Passport app disclosure grants list and revoke Allow Page grants", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.setDapp({ appname: "Allow Test App", id: 42 })
  supabase.appScopedSubjects.push({
    app_identifier: "dapp:42",
    app_scoped_subject: "app_subject_42",
    cubid_user_id: 1234,
    dapp_id: 42,
    dapp_user_uuid: "dapp_user_1",
    id: "subject_1",
    status: "active",
  })
  supabase.selectiveDisclosureGrants.push({
    app_scoped_subject_id: "subject_1",
    consent_version: 1,
    dapp_id: 42,
    granted_at: "2026-05-01T00:00:00Z",
    granted_claims: [
      {
        claim: "stamp:email",
        dataClass: "identity",
        purpose: "Allow Page stamp sharing",
        required: false,
      },
    ],
    granted_scopes: ["cubid:stamps"],
    id: "grant_1",
    policy_version: "allow-page:v1",
    revoked_at: null,
    revoked_by: null,
    source: "allow_page",
    status: "active",
  })
  supabase.setStamp({
    created_by_user_id: 1234,
    id: 99,
    stamptype: 13,
  })
  supabase.stampPermissions.push({
    dappuser_id: "dapp_user_1",
    stamp_id: 99,
  })

  const listReq = createApiRequest({
    body: {},
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/disclosures/app-grants/list",
  })
  const listRes = createApiResponse()
  await appDisclosureGrantListHandler(listReq, listRes)

  assert.equal(listRes.statusCode, 200)
  assert.deepEqual(
    (listRes.body as DataResponse<Array<{ appName: string; grantId: string }>>)
      .data.map((grant) => ({
        appName: grant.appName,
        grantId: grant.grantId,
      })),
    [{ appName: "Allow Test App", grantId: "grant_1" }]
  )

  const revokeReq = createApiRequest({
    body: { grantId: "grant_1" },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_revoke_grant_1",
    },
    url: "/api/disclosures/app-grants/revoke",
  })
  const revokeRes = createApiResponse()
  await appDisclosureGrantRevokeHandler(revokeReq, revokeRes)

  assert.equal(revokeRes.statusCode, 200)
  assert.equal(supabase.selectiveDisclosureGrants[0]?.status, "revoked")
  assert.equal(supabase.stampPermissions.length, 0)
  assert.equal(
    supabase.eventInserts.some(
      (event) => event.event_type === "disclosure.revoked"
    ),
    true
  )
})

test("Passport actor profile get defaults signed-in users to human", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()

  const req = createApiRequest({
    body: {},
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/actors/profile/get",
  })
  const res = createApiResponse()

  await actorProfileGetHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers["x-request-id"]?.startsWith("passport_"), true)
  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(data.actorType, "human")
  assert.equal(data.displayName, "Test Person")
  assert.equal(
    (data.validationPolicy as Record<string, unknown>).personhoodScoreEligible,
    true
  )
})

test("Passport actor profile upsert persists organization self-identification", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()

  const req = createApiRequest({
    body: {
      actorType: "organization",
      displayName: "Garden Network",
      organizationKind: "network",
    },
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/actors/profile/upsert",
  })
  const res = createApiResponse()

  await actorProfileUpsertHandler(req, res)

  assert.equal(res.statusCode, 200)
  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(data.actorType, "organization")
  assert.equal(data.organizationKind, "network")
  assert.equal(
    (data.validationPolicy as Record<string, unknown>).personhoodScoreEligible,
    false
  )
  const stored = supabase.actorProfiles.get("firebase_actor_123")
  assert.equal(stored?.actor_type, "organization")
  assert.equal(stored?.organization_kind, "network")
  assert.equal(stored?.firebase_uid, "firebase_actor_123")
})

test("Passport actor profile upsert persists agent affiliation without score eligibility", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()

  const req = createApiRequest({
    body: {
      actorType: "agent",
      agentAffiliation: {
        affiliationType: "human_supported",
        description: "Scheduling assistant",
        supportedHumanSubjectKey: "human_subject_reference",
      },
      displayName: "Scheduling Agent",
    },
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/actors/profile/upsert",
  })
  const res = createApiResponse()

  await actorProfileUpsertHandler(req, res)

  assert.equal(res.statusCode, 200)
  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(data.actorType, "agent")
  assert.equal(
    (data.agentAffiliation as Record<string, unknown>).affiliationType,
    "human_supported"
  )
  assert.equal(
    (data.validationPolicy as Record<string, unknown>).personhoodScoreEligible,
    false
  )
  const stored = supabase.actorProfiles.get("firebase_actor_123")
  assert.equal(stored?.agent_affiliation_type, "human_supported")
  assert.equal(stored?.supported_human_subject_key, "human_subject_reference")
})

test("Passport actor profile rejects contradictory self-identification", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()

  const req = createApiRequest({
    body: {
      actorType: "human",
      organizationKind: "team",
    },
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/actors/profile/upsert",
  })
  const res = createApiResponse()

  await actorProfileUpsertHandler(req, res)

  assert.equal(res.statusCode, 400)
  assert.equal((res.body as { error: { code: string } }).error.code, "invalid_request")
  assert.equal(supabase.actorProfiles.size, 0)
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

test("Passport email OTP send stores only hash metadata", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  let sentCode: number | null = null
  setPassportSupabaseForTests(supabase as never)
  setSendOtpEmailForTests(async (_email, code) => {
    sentCode = code
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      email: "Alice@Example.COM",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v2/email/send_otp",
  })
  const res = createApiResponse()

  await sendEmailOtpHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(
    (res.body as DataResponse<{ email: string }>).data.email,
    "alice@example.com"
  )
  assert.equal(typeof sentCode, "number")
  const rows = supabase.emailOtps.get("alice@example.com") ?? []
  assert.equal(rows.length, 1)
  assert.equal(rows[0].otp, undefined)
  assert.equal(typeof rows[0].otp_hash, "string")
  assert.equal(rows[0].attempt_count, 0)
  assert.equal(rows[0].consumed_at, null)
  assert.equal(new Date(String(rows[0].expires_at)).getTime() > Date.now(), true)
})

test("Passport email OTP verify consumes successful codes once", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const otpHash = await hashEmailOtp(
    supabase as never,
    "alice@example.com",
    "1234"
  )
  supabase.setEmailOtp({
    attempt_count: 0,
    consumed_at: null,
    email: "alice@example.com",
    expires_at: new Date(Date.now() + 60000).toISOString(),
    id: 99,
    otp_hash: otpHash,
  })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      email: "alice@example.com",
      otp: "1234",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v2/email/verify_otp",
  })
  const res = createApiResponse()

  await verifyEmailOtpHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, {
    data: {
      dappId: 42,
      email: "alice@example.com",
      is_verified: true,
    },
  })
  const row = supabase.emailOtps.get("alice@example.com")?.[0]
  assert.equal(typeof row?.consumed_at, "string")

  const replayRes = createApiResponse()
  await verifyEmailOtpHandler(req, replayRes)
  assert.equal(
    (replayRes.body as DataResponse<{ is_verified: boolean }>).data
      .is_verified,
    false
  )
})

test("Passport email OTP verify increments failed attempts", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const otpHash = await hashEmailOtp(
    supabase as never,
    "alice@example.com",
    "1234"
  )
  supabase.setEmailOtp({
    attempt_count: 0,
    consumed_at: null,
    email: "alice@example.com",
    expires_at: new Date(Date.now() + 60000).toISOString(),
    id: 100,
    otp_hash: otpHash,
  })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      email: "alice@example.com",
      otp: "9999",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
  })
  const res = createApiResponse()

  await verifyEmailOtpHandler(req, res)

  assert.equal(
    (res.body as DataResponse<{ is_verified: boolean }>).data.is_verified,
    false
  )
  assert.equal(supabase.emailOtps.get("alice@example.com")?.[0].attempt_count, 1)
})

test("Passport email OTP verify rejects expired and over-attempted codes", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const otpHash = await hashEmailOtp(
    supabase as never,
    "alice@example.com",
    "1234"
  )
  supabase.setEmailOtp({
    attempt_count: 3,
    consumed_at: null,
    email: "alice@example.com",
    expires_at: new Date(Date.now() - 1000).toISOString(),
    id: 101,
    otp_hash: otpHash,
  })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      email: "alice@example.com",
      otp: "1234",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
  })
  const res = createApiResponse()

  await verifyEmailOtpHandler(req, res)

  assert.equal(
    (res.body as DataResponse<{ is_verified: boolean }>).data.is_verified,
    false
  )
  assert.equal(supabase.emailOtps.get("alice@example.com")?.[0].attempt_count, 3)
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

test("Passport v2 save_secret keeps legacy public-table behavior", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const userId = "00000000-0000-4000-8000-000000000041"
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      api_key: apiKey,
      secret: "legacy plaintext dapp user secret",
      user_id: userId,
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v2/save_secret",
  })
  const res = createApiResponse()

  await saveSecretV2Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true })
  assert.equal(supabase.dappUserSecrets.length, 1)
  assert.equal(supabase.privateDappUserSecrets.length, 0)
  assert.equal(supabase.dappUserSecrets[0].secret, "legacy plaintext dapp user secret")
  assert.equal(supabase.dappUserSecrets[0].secret_sequential_id, 1)
})

test("Passport v3 save_secret stores only encrypted dapp user secrets", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const userId = "00000000-0000-4000-8000-000000000042"
  supabase.setDappUser({ dapp_id: 42, uuid: userId })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      api_key: apiKey,
      secret: "raw dapp user secret",
      user_id: userId,
    },
    headers: {
      "idempotency-key": "save-secret-primary",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/save_secret",
  })
  const res = createApiResponse()

  await saveSecretV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true })
  assert.equal(supabase.dappUserSecrets.length, 0)
  assert.equal(supabase.privateDappUserSecrets.length, 1)
  const storedSecret = supabase.privateDappUserSecrets[0]
  assert.equal(storedSecret.secret, DAPP_USER_SECRET_LEGACY_SENTINEL)
  assert.equal(storedSecret.secret_sequential_id, 1)
  assert.notEqual(storedSecret.secret_ciphertext, "raw dapp user secret")
  assert.equal(
    String(storedSecret.secret_ciphertext).includes("raw dapp user secret"),
    false
  )
  assert.equal(storedSecret.encryption_algorithm, "aes-256-gcm-envelope")
  assert.equal(
    storedSecret.encryption_key_id,
    "passport_dapp_user_secret_wrapping_key_v1"
  )

  const decrypted = decryptDappUserSecretWithKey(
    storedSecret as never,
    Buffer.from("0123456789abcdef0123456789abcdef"),
    {
      dappId: 42,
      dappUserUuid: userId,
    }
  )
  assert.equal(decrypted, "raw dapp user secret")
  assert.equal(
    supabase.eventInserts.some(
      (event) => event.event_type === "dapp_user_secret.encrypted"
    ),
    true
  )

  const secondReq = createApiRequest({
    body: {
      api_key: apiKey,
      secret: "second raw dapp user secret",
      user_id: userId,
    },
    headers: {
      "idempotency-key": "save-secret-second",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/save_secret",
  })
  const secondRes = createApiResponse()

  await saveSecretV3Handler(secondReq, secondRes)

  assert.equal(secondRes.statusCode, 200)
  assert.equal(supabase.privateDappUserSecrets.length, 2)
  assert.equal(supabase.privateDappUserSecrets[1].secret_sequential_id, 2)
})

test("Passport v3 save_secret rejects dapp users outside the authenticated app", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const userId = "00000000-0000-4000-8000-000000000043"
  supabase.setDappUser({ dapp_id: 99, uuid: userId })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      secret: "raw dapp user secret",
      user_id: userId,
    },
    headers: {
      "idempotency-key": "save-secret-cross-dapp",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/save_secret",
  })
  const res = createApiResponse()

  await saveSecretV3Handler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal(supabase.dappUserSecrets.length, 0)
  assert.equal(supabase.privateDappUserSecrets.length, 0)
  assert.deepEqual(res.body, {
    error: {
      code: "not_found",
      message: "Dapp user was not found for the authenticated app.",
      requestId: res.headers["x-request-id"],
    },
  })
})

test("Passport v3 save_secret requires and replays Idempotency-Key writes", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const userId = "00000000-0000-4000-8000-000000000044"
  supabase.setDappUser({ dapp_id: 42, uuid: userId })
  setPassportSupabaseForTests(supabase as never)

  const body = {
    api_key: apiKey,
    secret: "idempotent dapp user secret",
    user_id: userId,
  }
  const makeReq = () =>
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "save-secret-replay",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    })

  const firstRes = createApiResponse()
  await saveSecretV3Handler(makeReq(), firstRes)
  const replayRes = createApiResponse()
  await saveSecretV3Handler(makeReq(), replayRes)

  assert.equal(firstRes.statusCode, 200)
  assert.equal(replayRes.statusCode, 200)
  assert.deepEqual(replayRes.body, { success: true })
  assert.equal(supabase.privateDappUserSecrets.length, 1)
  assert.equal(
    supabase.apiIdempotencyKeys[0]?.status,
    "completed"
  )
})

test("Passport v3 save_secret rejects missing, conflicting, and pending idempotency keys", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const userId = "00000000-0000-4000-8000-000000000045"
  const body = {
    api_key: apiKey,
    secret: "first secret",
    user_id: userId,
  }
  supabase.setDappUser({ dapp_id: 42, uuid: userId })
  setPassportSupabaseForTests(supabase as never)

  const missingKeyRes = createApiResponse()
  await saveSecretV3Handler(
    createApiRequest({
      body,
      headers: {
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    missingKeyRes
  )
  assert.equal(missingKeyRes.statusCode, 400)
  assert.equal(
    (missingKeyRes.body as { error: { message: string } }).error.message,
    "Missing Idempotency-Key header."
  )

  await saveSecretV3Handler(
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "save-secret-conflict",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    createApiResponse()
  )

  const conflictRes = createApiResponse()
  await saveSecretV3Handler(
    createApiRequest({
      body: {
        ...body,
        secret: "different secret",
      },
      headers: {
        "idempotency-key": "save-secret-conflict",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    conflictRes
  )
  assert.equal(conflictRes.statusCode, 409)
  assert.equal(
    (conflictRes.body as { error: { code: string } }).error.code,
    "idempotency_conflict"
  )

  supabase.apiIdempotencyKeys.push({
    actor_identifier: "42",
    actor_type: "dapp",
    expires_at: new Date(Date.now() + 60000).toISOString(),
    idempotency_key: "save-secret-pending",
    request_hash: hashApiV3IdempotencyRequest(body),
    request_id: "passport_pending_1",
    route: "v3.save_secret",
    status: "pending",
  })
  const pendingRes = createApiResponse()
  await saveSecretV3Handler(
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "save-secret-pending",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    pendingRes
  )
  assert.equal(pendingRes.statusCode, 409)
  assert.equal(
    (pendingRes.body as { error: { code: string } }).error.code,
    "request_in_progress"
  )

  supabase.apiIdempotencyKeys.push({
    actor_identifier: "42",
    actor_type: "dapp",
    expires_at: new Date(Date.now() + 60000).toISOString(),
    idempotency_key: "save-secret-failed",
    request_hash: hashApiV3IdempotencyRequest(body),
    request_id: "passport_failed_1",
    route: "v3.save_secret",
    status: "failed",
  })
  const priorSecretCount = supabase.privateDappUserSecrets.length
  const failedRetryRes = createApiResponse()
  await saveSecretV3Handler(
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "save-secret-failed",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    failedRetryRes
  )
  assert.equal(failedRetryRes.statusCode, 200)
  assert.equal(
    supabase.privateDappUserSecrets.length,
    priorSecretCount + 1
  )
  assert.equal(
    supabase.apiIdempotencyKeys.find(
      (row) => row.idempotency_key === "save-secret-failed"
    )?.status,
    "completed"
  )
})

test("Passport v3 save_secret rejects dapp-id mismatches and rate-limit denials", async () => {
  const now = Date.now()
  const windowStartMs = now - (now % 60000)
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const userId = "00000000-0000-4000-8000-000000000046"
  supabase.setDappUser({ dapp_id: 42, uuid: userId })
  setPassportSupabaseForTests(supabase as never)

  const mismatchRes = createApiResponse()
  await saveSecretV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        dapp_id: 99,
        secret: "raw dapp user secret",
        user_id: userId,
      },
      headers: {
        "idempotency-key": "save-secret-dapp-mismatch",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    mismatchRes
  )
  assert.equal(mismatchRes.statusCode, 403)
  assert.equal(
    (mismatchRes.body as { error: { code: string } }).error.code,
    "forbidden"
  )

  supabase.setBucket(`passport_dapp_mutation:42:${windowStartMs}`, 20)
  const rateLimitedRes = createApiResponse()
  await saveSecretV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        secret: "raw dapp user secret",
        user_id: userId,
      },
      headers: {
        "idempotency-key": "save-secret-rate-limited",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/save_secret",
    }),
    rateLimitedRes
  )
  assert.equal(rateLimitedRes.statusCode, 429)
  assert.equal(supabase.privateDappUserSecrets.length, 0)
})

test("Passport v3 account generation encrypts private keys and links only the triggering dapp user", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000052"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      api_key: apiKey,
      chain: "evm",
      dapp_user_uuid: dappUserUuid,
      label: "Primary EVM",
    },
    headers: {
      "idempotency-key": "generate-evm-primary",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/accounts/generate",
  })
  const res = createApiResponse()

  await generateAccountV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(data.chain, "evm")
  assert.equal(data.dappUserUuid, dappUserUuid)
  assert.equal(data.label, "Primary EVM")
  assert.equal(String(data.publicAddress).startsWith("0x"), true)
  assert.equal(JSON.stringify(res.body).includes("privateKey"), false)
  assert.equal(JSON.stringify(res.body).includes("private_key"), false)
  assert.equal(supabase.userAccounts.length, 1)
  assert.equal(supabase.privateKeys.length, 1)
  assert.equal(supabase.dappUserAccounts.length, 1)
  assert.equal(supabase.dappUserAccounts[0].dapp_user_uuid, dappUserUuid)

  const storedPrivateKey = supabase.privateKeys[0]
  assert.equal(
    storedPrivateKey.encryption_key_id,
    "passport_blockchain_private_key_wrapping_key_v1"
  )
  assert.equal(storedPrivateKey.encryption_algorithm, "aes-256-gcm-envelope")
  assert.notEqual(storedPrivateKey.private_key_ciphertext, "")
  assert.equal(
    String(storedPrivateKey.private_key_ciphertext).startsWith("0x"),
    false
  )

  const decrypted = decryptBlockchainPrivateKeyWithKey(
    storedPrivateKey,
    Buffer.from("fedcba9876543210fedcba9876543210"),
    {
      chainKey: "evm",
      publicAddressNormalized: String(
        supabase.userAccounts[0].public_address_normalized
      ),
      userAccountId: String(supabase.userAccounts[0].id),
      userId: 1234,
    }
  )
  assert.equal(decrypted.startsWith("0x"), true)
})

test("Passport v3 account generation rejects dapp users outside the authenticated app", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000053"
  supabase.setDappUser({ dapp_id: 99, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      chain: "solana",
      dapp_user_uuid: dappUserUuid,
    },
    headers: {
      "idempotency-key": "generate-cross-dapp",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/accounts/generate",
  })
  const res = createApiResponse()

  await generateAccountV3Handler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal(supabase.userAccounts.length, 0)
  assert.equal(supabase.privateKeys.length, 0)
  assert.equal(supabase.dappUserAccounts.length, 0)
})

test("Passport v3 account generation rejects unsupported Sui requests", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000054"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {
      api_key: apiKey,
      chain: "sui",
      dapp_user_uuid: dappUserUuid,
    },
    headers: {
      "idempotency-key": "generate-sui",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/accounts/generate",
  })
  const res = createApiResponse()

  await generateAccountV3Handler(req, res)

  assert.equal(res.statusCode, 400)
  assert.equal((res.body as { error: { code: string } }).error.code, "invalid_request")
  assert.equal(supabase.userAccounts.length, 0)
})

test("Passport v3 account generation replays Idempotency-Key writes without creating duplicate accounts", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000056"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const body = {
    api_key: apiKey,
    chain: "near",
    dapp_user_uuid: dappUserUuid,
    label: "Primary NEAR",
  }
  const makeReq = () =>
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "generate-near-replay",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    })

  const firstRes = createApiResponse()
  await generateAccountV3Handler(makeReq(), firstRes)
  const replayRes = createApiResponse()
  await generateAccountV3Handler(makeReq(), replayRes)

  assert.equal(firstRes.statusCode, 200)
  assert.equal(replayRes.statusCode, 200)
  assert.deepEqual(replayRes.body, firstRes.body)
  assert.equal(supabase.userAccounts.length, 1)
  assert.equal(supabase.privateKeys.length, 1)
  assert.equal(supabase.dappUserAccounts.length, 1)
})

test("Passport v3 account generation rejects idempotency conflicts and pending requests", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000057"
  const body = {
    api_key: apiKey,
    chain: "evm",
    dapp_user_uuid: dappUserUuid,
  }
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  await generateAccountV3Handler(
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "generate-conflict",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    createApiResponse()
  )

  const conflictRes = createApiResponse()
  await generateAccountV3Handler(
    createApiRequest({
      body: {
        ...body,
        label: "Different body",
      },
      headers: {
        "idempotency-key": "generate-conflict",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    conflictRes
  )
  assert.equal(conflictRes.statusCode, 409)
  assert.equal(
    (conflictRes.body as { error: { code: string } }).error.code,
    "idempotency_conflict"
  )

  supabase.apiIdempotencyKeys.push({
    actor_identifier: "42",
    actor_type: "dapp",
    expires_at: new Date(Date.now() + 60000).toISOString(),
    idempotency_key: "generate-pending",
    request_hash: hashApiV3IdempotencyRequest(body),
    request_id: "passport_pending_2",
    route: "v3.accounts.generate",
    status: "pending",
  })
  const pendingRes = createApiResponse()
  await generateAccountV3Handler(
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "generate-pending",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    pendingRes
  )
  assert.equal(pendingRes.statusCode, 409)
  assert.equal(
    (pendingRes.body as { error: { code: string } }).error.code,
    "request_in_progress"
  )
})

test("Passport v3 account generation cleans up public account rows on private-key failure", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000058"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.failNextPrivateKeyInsert = true
  setPassportSupabaseForTests(supabase as never)

  const res = createApiResponse()
  await generateAccountV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "evm",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        "idempotency-key": "generate-private-key-failure",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    res
  )

  assert.equal(res.statusCode, 500)
  assert.equal(supabase.userAccounts.length, 0)
  assert.equal(supabase.privateKeys.length, 0)
  assert.equal(supabase.dappUserAccounts.length, 0)
  assert.equal(supabase.apiIdempotencyKeys[0]?.status, "failed")
})

test("Passport v3 account list returns dapp-user-visible metadata without secret material", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000055"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const generateReq = createApiRequest({
    body: {
      api_key: apiKey,
      chain: "solana",
      dapp_user_uuid: dappUserUuid,
    },
    headers: {
      "idempotency-key": "generate-solana-for-list",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/accounts/generate",
  })
  await generateAccountV3Handler(generateReq, createApiResponse())

  const listReq = createApiRequest({
    body: {
      api_key: apiKey,
      dapp_user_uuid: dappUserUuid,
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/accounts/list",
  })
  const listRes = createApiResponse()

  await listAccountsV3Handler(listReq, listRes)

  assert.equal(listRes.statusCode, 200)
  const accounts = (listRes.body as DataResponse<Array<Record<string, unknown>>>).data
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].chain, "solana")
  assert.equal(accounts[0].dappUserUuid, dappUserUuid)
  assert.equal(JSON.stringify(listRes.body).includes("ciphertext"), false)
  assert.equal(JSON.stringify(listRes.body).includes("private"), false)
})

test("Passport v3 account list validates auth, payloads, ownership, and chain filtering", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000059"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const invalidAuthRes = createApiResponse()
  await listAccountsV3Handler(
    createApiRequest({
      body: {
        api_key: "cubid_live_missing_secret",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/list",
    }),
    invalidAuthRes
  )
  assert.equal(invalidAuthRes.statusCode, 401)

  const malformedRes = createApiResponse()
  await listAccountsV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        dapp_user_uuid: "not-a-uuid",
      },
      headers: {
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/list",
    }),
    malformedRes
  )
  assert.equal(malformedRes.statusCode, 400)

  const crossDappRes = createApiResponse()
  await listAccountsV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        dapp_user_uuid: "00000000-0000-4000-8000-000000000060",
      },
      headers: {
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/list",
    }),
    crossDappRes
  )
  assert.equal(crossDappRes.statusCode, 404)

  await generateAccountV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "evm",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        "idempotency-key": "generate-evm-for-filter",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    createApiResponse()
  )
  await generateAccountV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "solana",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        "idempotency-key": "generate-solana-for-filter",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    createApiResponse()
  )

  const filteredRes = createApiResponse()
  await listAccountsV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "evm",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        origin: "https://passport.cubid.me",
        "x-request-id": "passport_v3_list_filter",
      },
      url: "/api/v3/accounts/list",
    }),
    filteredRes
  )
  const accounts = (filteredRes.body as DataResponse<Array<Record<string, unknown>>>).data
  assert.equal(filteredRes.statusCode, 200)
  assert.equal(filteredRes.headers["x-request-id"], "passport_v3_list_filter")
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].chain, "evm")
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

test("Passport API v3 webhook trigger sends signed disclosure-filtered payloads", async () => {
  const supabase = new MockPassportSupabase()
  const dappUserUuid = "00000000-0000-4000-8000-000000000061"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setStamp({
    created_by_user_id: 1234,
    id: 610,
    stamptype: 13,
  })
  supabase.stampPermissions.push({
    dappuser_id: dappUserUuid,
    stamp_id: 610,
  })
  supabase.setWebhookSubscription({
    dapp: 42,
    secret: "webhook-signing-secret",
    webhook: "credential_added",
    webhook_url: "https://example.test/webhook",
  })
  setPassportSupabaseForTests(supabase as never)

  let deliveredBody = ""
  let deliveredHeaders: Record<string, string> = {}
  axios.post = (async (_url: string, body: unknown, config?: unknown) => {
    deliveredBody = String(body)
    deliveredHeaders = ((config as { headers?: Record<string, string> })
      ?.headers ?? {}) as Record<string, string>
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  const req = createApiRequest({
    body: {
      stamparray: [610],
      webhook: "credential_added",
    },
    headers: {
      authorization: "Bearer passport-internal-test-token",
      "x-request-id": "passport_webhook_v3_1",
    },
    url: "/api/cubid-webhook/trigger-url",
  })
  const res = createApiResponse()

  await webhookTriggerHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(supabase.webhookEvents.length, 1)
  assert.equal(supabase.webhookEventDeliveries.length, 1)

  const payload = JSON.parse(deliveredBody) as Record<string, unknown>
  assert.equal(payload.apiVersion, "v3")
  assert.equal(payload.eventType, "stamp.created")
  assert.equal(payload.legacyEventType, "credential_added")
  assert.equal(payload.requestId, "passport_webhook_v3_1")
  assert.deepEqual(payload.data, { stampId: 610 })
  assert.deepEqual(payload.subject, { dappUserUuid })
  assert.equal(JSON.stringify(payload).includes("created_by_user_id"), false)
  assert.equal(JSON.stringify(payload).includes("human_subject_key"), false)

  const expectedSignature = signApiV3WebhookPayload({
    body: deliveredBody,
    eventId: String(payload.eventId),
    secret: "webhook-signing-secret",
    timestamp: deliveredHeaders["X-Cubid-Timestamp"],
  })
  assert.equal(deliveredHeaders["X-Cubid-Event-Id"], payload.eventId)
  assert.equal(deliveredHeaders["X-Cubid-Signature"], expectedSignature)
  assert.equal(deliveredHeaders["X-Cubid-Signature-Version"], "v1")

  assert.equal(supabase.webhookEvents[0].event_id, payload.eventId)
  assert.equal(supabase.webhookEvents[0].api_version, "v3")
  assert.equal(supabase.webhookEventDeliveries[0].delivery_status, "succeeded")
  assert.equal(supabase.webhookEventDeliveries[0].attempt_number, 1)
  assert.equal(supabase.webhookEventDeliveries[0].event_id, payload.eventId)
})

test("Passport API v3 webhook trigger skips undisclosed stamps", async () => {
  const supabase = new MockPassportSupabase()
  const dappUserUuid = "00000000-0000-4000-8000-000000000062"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setStamp({
    created_by_user_id: 1234,
    id: 620,
    stamptype: 13,
  })
  supabase.setWebhookSubscription({
    dapp: 42,
    secret: "webhook-signing-secret",
    webhook: "credential_added",
    webhook_url: "https://example.test/webhook",
  })
  setPassportSupabaseForTests(supabase as never)
  let wasDelivered = false
  axios.post = (async () => {
    wasDelivered = true
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  await webhookTriggerHandler(
    createApiRequest({
      body: {
        stamparray: [620],
        webhook: "credential_added",
      },
      headers: {
        authorization: "Bearer passport-internal-test-token",
      },
      url: "/api/cubid-webhook/trigger-url",
    }),
    createApiResponse()
  )

  assert.equal(wasDelivered, false)
  assert.equal(supabase.webhookEvents.length, 0)
  assert.equal(supabase.webhookEventDeliveries.length, 0)
})

test("Passport API v3 webhook trigger records failed delivery attempts and retry metadata", async () => {
  const supabase = new MockPassportSupabase()
  const dappUserUuid = "00000000-0000-4000-8000-000000000063"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setStamp({
    created_by_user_id: 1234,
    id: 630,
    stamptype: 13,
  })
  supabase.stampPermissions.push({
    dappuser_id: dappUserUuid,
    stamp_id: 630,
  })
  supabase.setWebhookSubscription({
    dapp: 42,
    secret: "webhook-signing-secret",
    webhook: "credential_removed",
    webhook_url: "https://example.test/webhook",
  })
  setPassportSupabaseForTests(supabase as never)
  axios.post = (async () => {
    throw {
      response: {
        data: { error: "temporarily unavailable" },
        status: 503,
      },
    }
  }) as typeof axios.post

  const makeReq = () =>
    createApiRequest({
      body: {
        stamparray: [630],
        webhook: "credential_removed",
      },
      headers: {
        authorization: "Bearer passport-internal-test-token",
      },
      url: "/api/cubid-webhook/trigger-url",
    })

  await webhookTriggerHandler(makeReq(), createApiResponse())
  await webhookTriggerHandler(makeReq(), createApiResponse())

  assert.equal(supabase.webhookEvents.length, 1)
  assert.equal(supabase.webhookEvents[0].retries, 2)
  assert.equal(supabase.webhookEventDeliveries.length, 2)
  assert.equal(supabase.webhookEventDeliveries[0].delivery_status, "failed")
  assert.equal(supabase.webhookEventDeliveries[0].error_category, "server_error")
  assert.equal(supabase.webhookEventDeliveries[0].attempt_number, 1)
  assert.equal(supabase.webhookEventDeliveries[1].attempt_number, 2)
})
