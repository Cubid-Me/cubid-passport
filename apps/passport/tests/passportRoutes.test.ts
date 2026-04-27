import assert from "node:assert/strict"
import test from "node:test"

import { hashDappApiKey } from "@cubid/auth/server"

import consentListHandler from "../pages/api/oidc/consents/list"
import supabaseSelectHandler from "../pages/api/supabase/select"
import sendOtpHandler from "../pages/api/twillio/send-otp"
import sendEmailOtpHandler from "../pages/api/v2/email/send_otp"
import verifyEmailOtpHandler from "../pages/api/v2/email/verify_otp"
import generateAccountV3Handler from "../pages/api/v3/accounts/generate"
import listAccountsV3Handler from "../pages/api/v3/accounts/list"
import saveSecretV3Handler from "../pages/api/v3/save_secret"
import webhookTriggerHandler from "../pages/api/cubid-webhook/trigger-url"
import createUserHandler from "../pages/api/v2/create_user"
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

test.afterEach(() => {
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
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/save_secret",
  })
  const res = createApiResponse()

  await saveSecretV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { success: true })
  assert.equal(supabase.dappUserSecrets.length, 1)
  const storedSecret = supabase.dappUserSecrets[0]
  assert.equal(storedSecret.secret, DAPP_USER_SECRET_LEGACY_SENTINEL)
  assert.notEqual(storedSecret.secret_ciphertext, "raw dapp user secret")
  assert.equal(
    String(storedSecret.secret_ciphertext).includes("raw dapp user secret"),
    false
  )
  assert.equal(storedSecret.encryption_algorithm, "aes-256-gcm-envelope")
  assert.equal(storedSecret.encryption_key_id, "passport_dapp_user_secret_wrapping_key_v1")

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
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/save_secret",
  })
  const res = createApiResponse()

  await saveSecretV3Handler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal(supabase.dappUserSecrets.length, 0)
  assert.deepEqual(res.body, {
    error: {
      code: "not_found",
      message: "Dapp user was not found for the authenticated app.",
      requestId: res.headers["x-request-id"],
    },
  })
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
