import assert from "node:assert/strict"
import test from "node:test"

import axios from "axios"
import { hashDappApiKey } from "@cubid/auth/server"
import { ethers } from "ethers"

import actorProfileGetHandler from "../pages/api/actors/profile/get"
import actorProfileUpsertHandler from "../pages/api/actors/profile/upsert"
import appDisclosureGrantListHandler from "../pages/api/disclosures/app-grants/list"
import appDisclosureGrantRevokeHandler from "../pages/api/disclosures/app-grants/revoke"
import notificationChannelCompleteVerificationHandler from "../pages/api/notifications/channels/complete-verification"
import notificationChannelListHandler from "../pages/api/notifications/channels/list"
import notificationChannelStartVerificationHandler from "../pages/api/notifications/channels/start-verification"
import notificationChannelUpdateHandler from "../pages/api/notifications/channels/update"
import notificationGrantAllowPageListHandler from "../pages/api/notifications/grants/allow-page/list"
import notificationGrantAllowPageUpdateHandler from "../pages/api/notifications/grants/allow-page/update"
import notificationHistoryListHandler from "../pages/api/notifications/history/list"
import notificationPreferenceListHandler from "../pages/api/notifications/preferences/list"
import notificationPreferenceUpdateHandler from "../pages/api/notifications/preferences/update"
import notificationSendV3Handler from "../pages/api/v3/notifications/send"
import notificationStatusV3Handler from "../pages/api/v3/notifications/status"
import consentListHandler from "../pages/api/oidc/consents/list"
import siwcAccountListHandler from "../pages/api/siwc/accounts/list"
import approveSiwcSigningRequestHandler from "../pages/api/siwc/signing/requests/approve"
import listPassportSiwcSigningRequestsHandler from "../pages/api/siwc/signing/requests/list"
import rejectSiwcSigningRequestHandler from "../pages/api/siwc/signing/requests/reject"
import supabaseSelectHandler from "../pages/api/supabase/select"
import sendOtpHandler from "../pages/api/twillio/send-otp"
import sendEmailOtpHandler from "../pages/api/v2/email/send_otp"
import verifyEmailOtpHandler from "../pages/api/v2/email/verify_otp"
import saveSecretV2Handler from "../pages/api/v2/save_secret"
import generateAccountV3Handler from "../pages/api/v3/accounts/generate"
import listAccountsV3Handler from "../pages/api/v3/accounts/list"
import enrollRecoveryBundleV3Handler from "../pages/api/v3/recovery-bundles/enroll"
import recoveryBundleStatusV3Handler from "../pages/api/v3/recovery-bundles/status"
import saveSecretV3Handler from "../pages/api/v3/save_secret"
import cancelSiwcSigningRequestHandler from "../pages/api/v3/signing/requests/cancel"
import createSiwcSigningRequestHandler from "../pages/api/v3/signing/requests/create"
import getSiwcSigningRequestHandler from "../pages/api/v3/signing/requests/get"
import listSiwcSigningRequestsHandler from "../pages/api/v3/signing/requests/list"
import webhookTriggerHandler from "../pages/api/cubid-webhook/trigger-url"
import createUserHandler from "../pages/api/v2/create_user"
import { hashApiV3IdempotencyRequest } from "../lib/server/apiV3Idempotency"
import { signApiV3WebhookPayload } from "../lib/server/apiV3Webhooks"
import {
  encryptBlockchainPrivateKeyWithKey,
  decryptBlockchainPrivateKeyWithKey,
} from "../lib/server/blockchainAccounts"
import {
  DAPP_USER_SECRET_LEGACY_SENTINEL,
  decryptDappUserSecretWithKey,
} from "../lib/server/dappUserSecrets"
import {
  hashEmailOtp,
  setSendNotificationEmailForTests,
  setSendOtpEmailForTests,
} from "../lib/server/emailOtp"
import { setPassportFirebaseAdminAuthForTests } from "../lib/server/firebaseAdmin"
import { encryptNotificationChannelDestination } from "../lib/server/notificationChannels"
import { setPassportSupabaseForTests } from "../lib/server/supabase"
import { setSendNotificationTelegramForTests } from "../lib/server/telegramNotifications"

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
  setSendNotificationEmailForTests(null)
  setSendNotificationTelegramForTests(null)
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

const addSiwcWebhookSubscription = (
  supabase: MockPassportSupabase,
  webhook: string
) => {
  supabase.setWebhookSubscription({
    dapp: 42,
    secret: "webhook-signing-secret",
    status: "active",
    webhook,
    webhook_url: `https://example.test/${webhook}`,
  })
}

const DAPP_USER_UUID = "00000000-0000-4000-8000-000000000042"

const addNotificationSendFixture = (supabase: MockPassportSupabase) => {
  const apiKey = addDappAuth(supabase)
  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.setDappUser({
    dapp_id: 42,
    user_id: 1234,
    uuid: DAPP_USER_UUID,
  })
  supabase.notificationAppPolicies.push({
    allowed_categories: ["TRANSACTIONAL", "WORKFLOW"],
    allowed_priorities: ["LOW", "NORMAL", "HIGH"],
    allowed_providers: ["email_smtp", "telegram_bot"],
    dapp_id: 42,
    security_category_enabled: false,
    status: "enabled",
  })
  supabase.notificationProviders.push(
    {
      provider_key: "email_smtp",
      status: "active",
    },
    {
      provider_key: "telegram_bot",
      status: "active",
    }
  )
  supabase.notificationAppGrants.push({
    category_key: "TRANSACTIONAL",
    dapp_id: 42,
    dapp_user_uuid: DAPP_USER_UUID,
    id: "grant_1",
    status: "active",
    user_id: 1234,
  })
  supabase.notificationChannels.push({
    channel_type: "email",
    created_at: "2026-05-01T00:00:00Z",
    display_hint: "p***@example.com",
    id: "channel_1",
    is_default: true,
    label: "Personal email",
    provider_key: "email_smtp",
    status: "active",
    updated_at: "2026-05-01T00:00:00Z",
    user_id: 1234,
    verification_status: "verified",
    verified_at: "2026-05-01T00:00:00Z",
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

test("Passport notification channel list requires Firebase bearer auth", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/channels/list",
  })
  const res = createApiResponse()

  await notificationChannelListHandler(req, res)

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

test("Passport notification channel verification stores encrypted destinations and verifies one-time codes", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })

  let deliveredCode: number | null = null
  setSendOtpEmailForTests(async (toEmail, verificationCode) => {
    assert.equal(toEmail, "person@example.com")
    deliveredCode = verificationCode
  })

  const startReq = createApiRequest({
    body: {
      channelType: "email",
      destination: "Person@Example.com",
      isDefault: true,
      label: "Personal email",
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_notifications_1",
    },
    url: "/api/notifications/channels/start-verification",
  })
  const startRes = createApiResponse()

  await notificationChannelStartVerificationHandler(startReq, startRes)

  assert.equal(startRes.statusCode, 200)
  assert.equal(startRes.headers["x-request-id"], "passport_notifications_1")
  assert.equal(supabase.notificationChannels.length, 1)
  assert.equal(supabase.privateNotificationChannelDestinations.length, 1)
  assert.equal(supabase.notificationVerificationChallenges.length, 1)
  assert.equal(deliveredCode !== null, true)
  assert.equal(
    supabase.notificationChannels[0]?.display_hint,
    "p***@example.com"
  )
  assert.equal(
    supabase.privateNotificationChannelDestinations[0]?.destination_ciphertext ===
      "person@example.com",
    false
  )
  assert.equal(
    (startRes.body as DataResponse<{
      channel: { displayHint: string }
      challenge: { setupCode?: string }
    }>).data.channel.displayHint,
    "p***@example.com"
  )
  assert.equal(
    (startRes.body as DataResponse<{
      channel: { displayHint: string }
      challenge: { setupCode?: string }
    }>).data.challenge.setupCode,
    undefined
  )
  assert.equal(
    JSON.stringify(startRes.body).includes("person@example.com"),
    false
  )

  const wrongReq = createApiRequest({
    body: {
      challengeId: supabase.notificationVerificationChallenges[0]?.id,
      code: "0000",
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/channels/complete-verification",
  })
  const wrongRes = createApiResponse()
  await notificationChannelCompleteVerificationHandler(wrongReq, wrongRes)

  assert.equal(wrongRes.statusCode, 400)
  assert.equal(
    supabase.notificationVerificationChallenges[0]?.attempt_count,
    1
  )

  const completeReq = createApiRequest({
    body: {
      challengeId: supabase.notificationVerificationChallenges[0]?.id,
      code: String(deliveredCode),
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/channels/complete-verification",
  })
  const completeRes = createApiResponse()
  await notificationChannelCompleteVerificationHandler(completeReq, completeRes)

  assert.equal(completeRes.statusCode, 200)
  assert.equal(
    (completeRes.body as DataResponse<{ verificationStatus: string }>).data
      .verificationStatus,
    "verified"
  )
  assert.equal(
    supabase.notificationVerificationChallenges[0]?.status,
    "consumed"
  )
  assert.equal(supabase.notificationChannels[0]?.verification_status, "verified")
})

test("Passport Telegram notification setup stores encrypted destinations and one-time setup codes", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })

  const startReq = createApiRequest({
    body: {
      channelType: "telegram",
      destination: "@cubid_person",
      isDefault: true,
      label: "Telegram",
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/channels/start-verification",
  })
  const startRes = createApiResponse()

  await notificationChannelStartVerificationHandler(startReq, startRes)

  assert.equal(startRes.statusCode, 200)
  assert.equal(supabase.notificationChannels[0]?.provider_key, "telegram_bot")
  assert.equal(supabase.notificationChannels[0]?.display_hint, "Telegram ending rson")
  assert.equal(supabase.privateNotificationChannelDestinations.length, 1)
  assert.equal(
    supabase.privateNotificationChannelDestinations[0]?.destination_ciphertext ===
      "cubid_person",
    false
  )
  const setupCode = (startRes.body as DataResponse<{
    challenge: { setupCode?: string; setupInstructions?: string }
  }>).data.challenge.setupCode
  assert.match(String(setupCode), /^\d{4}$/)
  assert.match(
    String(
      (startRes.body as DataResponse<{
        challenge: { setupInstructions?: string }
      }>).data.challenge.setupInstructions
    ),
    /Cubid Telegram bot/
  )
  assert.equal(JSON.stringify(startRes.body).includes("cubid_person"), false)

  const completeReq = createApiRequest({
    body: {
      challengeId: supabase.notificationVerificationChallenges[0]?.id,
      code: setupCode,
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/channels/complete-verification",
  })
  const completeRes = createApiResponse()
  await notificationChannelCompleteVerificationHandler(completeReq, completeRes)

  assert.equal(completeRes.statusCode, 200)
  assert.equal(supabase.notificationChannels[0]?.verification_status, "verified")
  assert.equal(
    supabase.notificationVerificationChallenges[0]?.status,
    "consumed"
  )
})

test("Passport notification channel update redacts destinations and can revoke encrypted storage", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.notificationChannels.push({
    channel_type: "email",
    created_at: "2026-05-01T00:00:00Z",
    display_hint: "p***@example.com",
    id: "channel_1",
    is_default: false,
    label: "Old label",
    provider_key: "email_smtp",
    status: "active",
    updated_at: "2026-05-01T00:00:00Z",
    user_id: 1234,
    verification_status: "verified",
    verified_at: "2026-05-01T00:00:00Z",
  })
  supabase.privateNotificationChannelDestinations.push({
    channel_id: "channel_1",
    status: "active",
    user_id: 1234,
  })

  const updateReq = createApiRequest({
    body: {
      channelId: "channel_1",
      isDefault: true,
      label: "Updated label",
      status: "revoked",
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/channels/update",
  })
  const updateRes = createApiResponse()

  await notificationChannelUpdateHandler(updateReq, updateRes)

  assert.equal(updateRes.statusCode, 200)
  assert.equal(
    (updateRes.body as DataResponse<{ label: string; status: string }>).data
      .label,
    "Updated label"
  )
  assert.equal(
    (updateRes.body as DataResponse<{ label: string; status: string }>).data
      .status,
    "revoked"
  )
  assert.equal(
    supabase.privateNotificationChannelDestinations[0]?.status,
    "revoked"
  )
  assert.equal(JSON.stringify(updateRes.body).includes("ciphertext"), false)
})

test("Passport notification preferences can be listed and updated without raw channel destinations", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.notificationChannels.push({
    channel_type: "email",
    created_at: "2026-05-01T00:00:00Z",
    display_hint: "p***@example.com",
    id: "channel_1",
    is_default: true,
    label: "Personal email",
    provider_key: "email_smtp",
    status: "active",
    updated_at: "2026-05-01T00:00:00Z",
    user_id: 1234,
    verification_status: "verified",
    verified_at: "2026-05-01T00:00:00Z",
  })

  const updateReq = createApiRequest({
    body: {
      categoryKey: "SECURITY",
      channelId: "channel_1",
      priorityFloor: "HIGH",
      status: "active",
    },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/preferences/update",
  })
  const updateRes = createApiResponse()

  await notificationPreferenceUpdateHandler(updateReq, updateRes)

  assert.equal(updateRes.statusCode, 200)
  assert.equal(
    (updateRes.body as DataResponse<{ categoryKey: string; channelId: string }>)
      .data.categoryKey,
    "SECURITY"
  )
  assert.equal(
    (updateRes.body as DataResponse<{ categoryKey: string; channelId: string }>)
      .data.channelId,
    "channel_1"
  )

  const listReq = createApiRequest({
    body: {},
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/preferences/list",
  })
  const listRes = createApiResponse()
  await notificationPreferenceListHandler(listReq, listRes)

  assert.equal(listRes.statusCode, 200)
  assert.equal(
    (listRes.body as DataResponse<Array<{ categoryKey: string }>>).data[0]
      ?.categoryKey,
    "SECURITY"
  )
  assert.equal(JSON.stringify(listRes.body).includes("person@example.com"), false)
})

test("Passport Allow Page notification grants are app scoped and replace category permissions", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  supabase.setDapp({ appname: "Notify Test App", id: 42 })
  supabase.setDappPage({ dapp_id: 42, id: 77 })
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: "dapp_user_1" })

  const updateReq = createApiRequest({
    body: {
      categories: ["SECURITY", "TRANSACTIONAL"],
      pageId: 77,
      uid: "dapp_user_1",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/grants/allow-page/update",
  })
  const updateRes = createApiResponse()

  await notificationGrantAllowPageUpdateHandler(updateReq, updateRes)

  assert.equal(updateRes.statusCode, 200)
  assert.deepEqual(
    (updateRes.body as DataResponse<{
      grants: Array<{ categoryKey: string; status: string }>
    }>).data.grants
      .filter((grant) => grant.status === "active")
      .map((grant) => grant.categoryKey)
      .sort(),
    ["SECURITY", "TRANSACTIONAL"]
  )
  assert.equal(supabase.notificationAppGrants.length, 2)

  const replaceReq = createApiRequest({
    body: {
      categories: ["WORKFLOW"],
      pageId: 77,
      uid: "dapp_user_1",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/grants/allow-page/update",
  })
  const replaceRes = createApiResponse()
  await notificationGrantAllowPageUpdateHandler(replaceReq, replaceRes)

  assert.equal(replaceRes.statusCode, 200)
  const activeCategories = (
    replaceRes.body as DataResponse<{
      grants: Array<{ categoryKey: string; status: string }>
    }>
  ).data.grants
    .filter((grant) => grant.status === "active")
    .map((grant) => grant.categoryKey)
  assert.deepEqual(activeCategories, ["WORKFLOW"])

  const listReq = createApiRequest({
    body: {
      pageId: 77,
      uid: "dapp_user_1",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/grants/allow-page/list",
  })
  const listRes = createApiResponse()
  await notificationGrantAllowPageListHandler(listReq, listRes)

  assert.equal(listRes.statusCode, 200)
  assert.equal(
    JSON.stringify(listRes.body).includes("person@example.com"),
    false
  )
  assert.deepEqual(
    (listRes.body as DataResponse<{ availableCategories: string[] }>).data
      .availableCategories,
    ["SECURITY", "TRANSACTIONAL", "WORKFLOW"]
  )
})

test("Passport Allow Page notification grants reject cross-dapp page and user pairs", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  supabase.setDappPage({ dapp_id: 99, id: 77 })
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: "dapp_user_1" })

  const req = createApiRequest({
    body: {
      categories: ["SECURITY"],
      pageId: 77,
      uid: "dapp_user_1",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/notifications/grants/allow-page/update",
  })
  const res = createApiResponse()

  await notificationGrantAllowPageUpdateHandler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal((res.body as { error: { code: string } }).error.code, "not_found")
  assert.equal(supabase.notificationAppGrants.length, 0)
})

test("API v3 notification send accepts and queues app-scoped granted notifications", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      metadata: {
        contract_id: "contract_123",
      },
      priority: "HIGH",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_1",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_notifications_send_1",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers["x-request-id"], "passport_notifications_send_1")
  assert.deepEqual(
    (res.body as DataResponse<{
      category: string
      priority: string
      selectedChannelType: string
      status: string
    }>).data,
    {
      category: "TRANSACTIONAL",
      createdAt: (res.body as DataResponse<{ createdAt: string }>).data
        .createdAt,
      eventId: "notification-events-1",
      priority: "HIGH",
      selectedChannelType: "email",
      status: "accepted",
    }
  )
  assert.equal(supabase.notificationEvents.length, 1)
  assert.equal(supabase.notificationDeliveryAttempts.length, 1)
  assert.equal(
    supabase.notificationDeliveryAttempts[0]?.provider_key,
    "email_smtp"
  )
  assert.equal(JSON.stringify(res.body).includes("person@example.com"), false)
  assert.equal(JSON.stringify(res.body).includes("ciphertext"), false)
})

test("API v3 notification send delivers verified email channels through the SMTP adapter", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  const encryptedDestination = await encryptNotificationChannelDestination(
    supabase as never,
    "person@example.com",
    {
      channelId: "channel_1",
      channelType: "email",
      userId: 1234,
    }
  )
  supabase.privateNotificationChannelDestinations.push({
    ...encryptedDestination,
    channel_id: "channel_1",
    channel_type: "email",
    id: "destination_1",
    status: "active",
    user_id: 1234,
  })

  const delivered: Array<{
    fromAppName: string
    title: string
    toEmail: string
  }> = []
  setSendNotificationEmailForTests(async (input) => {
    delivered.push({
      fromAppName: input.fromAppName,
      title: input.title,
      toEmail: input.toEmail,
    })
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_email_delivery",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(delivered, [
    {
      fromAppName: "OTP Test App",
      title: "Milestone approved",
      toEmail: "person@example.com",
    },
  ])
  assert.equal(supabase.notificationDeliveryAttempts[0]?.status, "sent")
  assert.equal(supabase.notificationEvents[0]?.status, "queued")
  assert.equal(JSON.stringify(res.body).includes("person@example.com"), false)
})

test("API v3 notification send records email provider failures without exposing destinations", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  const encryptedDestination = await encryptNotificationChannelDestination(
    supabase as never,
    "person@example.com",
    {
      channelId: "channel_1",
      channelType: "email",
      userId: 1234,
    }
  )
  supabase.privateNotificationChannelDestinations.push({
    ...encryptedDestination,
    channel_id: "channel_1",
    channel_type: "email",
    id: "destination_1",
    status: "active",
    user_id: 1234,
  })
  setSendNotificationEmailForTests(async () => {
    throw new Error("smtp unavailable")
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_email_failure",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(supabase.notificationDeliveryAttempts[0]?.status, "failed")
  assert.equal(
    supabase.notificationDeliveryAttempts[0]?.error_code,
    "email_delivery_failed"
  )
  assert.equal(supabase.notificationEvents[0]?.status, "failed")
  assert.equal(JSON.stringify(res.body).includes("person@example.com"), false)
})

test("API v3 notification send delivers verified Telegram channels through the bot adapter", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  supabase.notificationPreferences.push({
    category_key: "TRANSACTIONAL",
    channel_id: "telegram_channel_1",
    dapp_id: null,
    id: "preference_telegram",
    priority_floor: "LOW",
    status: "active",
    user_id: 1234,
  })
  supabase.notificationChannels.push({
    channel_type: "telegram",
    created_at: "2026-05-01T00:00:00Z",
    display_hint: "Telegram ending 6789",
    id: "telegram_channel_1",
    is_default: false,
    label: "Telegram",
    provider_key: "telegram_bot",
    status: "active",
    updated_at: "2026-05-01T00:00:00Z",
    user_id: 1234,
    verification_status: "verified",
    verified_at: "2026-05-01T00:00:00Z",
  })
  const encryptedDestination = await encryptNotificationChannelDestination(
    supabase as never,
    "123456789",
    {
      channelId: "telegram_channel_1",
      channelType: "telegram",
      userId: 1234,
    }
  )
  supabase.privateNotificationChannelDestinations.push({
    ...encryptedDestination,
    channel_id: "telegram_channel_1",
    channel_type: "telegram",
    id: "telegram_destination_1",
    status: "active",
    user_id: 1234,
  })

  const delivered: Array<{
    chatId: string
    fromAppName: string
    title: string
  }> = []
  setSendNotificationTelegramForTests(async (input) => {
    delivered.push({
      chatId: input.chatId,
      fromAppName: input.fromAppName,
      title: input.title,
    })
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_telegram_delivery",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual(delivered, [
    {
      chatId: "123456789",
      fromAppName: "OTP Test App",
      title: "Milestone approved",
    },
  ])
  assert.equal(
    (res.body as DataResponse<{ selectedChannelType: string }>).data
      .selectedChannelType,
    "telegram"
  )
  assert.equal(supabase.notificationDeliveryAttempts[0]?.status, "sent")
  assert.equal(
    supabase.notificationDeliveryAttempts[0]?.provider_key,
    "telegram_bot"
  )
  assert.equal(JSON.stringify(res.body).includes("123456789"), false)
})

test("API v3 notification send records Telegram provider failures without exposing chat ids", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  supabase.notificationPreferences.push({
    category_key: "TRANSACTIONAL",
    channel_id: "telegram_channel_1",
    dapp_id: null,
    id: "preference_telegram",
    priority_floor: "LOW",
    status: "active",
    user_id: 1234,
  })
  supabase.notificationChannels.push({
    channel_type: "telegram",
    created_at: "2026-05-01T00:00:00Z",
    display_hint: "Telegram ending 6789",
    id: "telegram_channel_1",
    is_default: false,
    label: "Telegram",
    provider_key: "telegram_bot",
    status: "active",
    updated_at: "2026-05-01T00:00:00Z",
    user_id: 1234,
    verification_status: "verified",
    verified_at: "2026-05-01T00:00:00Z",
  })
  const encryptedDestination = await encryptNotificationChannelDestination(
    supabase as never,
    "123456789",
    {
      channelId: "telegram_channel_1",
      channelType: "telegram",
      userId: 1234,
    }
  )
  supabase.privateNotificationChannelDestinations.push({
    ...encryptedDestination,
    channel_id: "telegram_channel_1",
    channel_type: "telegram",
    id: "telegram_destination_1",
    status: "active",
    user_id: 1234,
  })
  setSendNotificationTelegramForTests(async () => {
    throw new Error("telegram unavailable")
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_telegram_failure",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(supabase.notificationDeliveryAttempts[0]?.status, "failed")
  assert.equal(
    supabase.notificationDeliveryAttempts[0]?.error_code,
    "telegram_delivery_failed"
  )
  assert.equal(supabase.notificationEvents[0]?.status, "failed")
  assert.equal(JSON.stringify(res.body).includes("123456789"), false)
})

test("API v3 notification send replays idempotent accepted responses", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  const requestBody = {
    apikey: apiKey,
    body: "Milestone #4 was approved.",
    category: "TRANSACTIONAL",
    dapp_user_uuid: DAPP_USER_UUID,
    priority: "NORMAL",
    title: "Milestone approved",
  }

  for (const requestId of ["passport_replay_1", "passport_replay_2"]) {
    const req = createApiRequest({
      body: requestBody,
      headers: {
        "idempotency-key": "notification_send_replay",
        origin: "https://passport.cubid.me",
        "x-request-id": requestId,
      },
      url: "/api/v3/notifications/send",
    })
    const res = createApiResponse()
    await notificationSendV3Handler(req, res)
    assert.equal(res.statusCode, 200)
    assert.equal(
      (res.body as DataResponse<{ eventId: string }>).data.eventId,
      "notification-events-1"
    )
  }

  assert.equal(supabase.notificationEvents.length, 1)
  assert.equal(supabase.notificationDeliveryAttempts.length, 1)
})

test("API v3 notification send denies missing user grants without exposing channel data", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  supabase.notificationAppGrants.splice(0)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_denied",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 403)
  assert.equal(
    (res.body as { error: { code: string } }).error.code,
    "notification_grant_required"
  )
  assert.equal(supabase.notificationEvents.length, 1)
  assert.equal(supabase.notificationEvents[0]?.status, "denied")
  assert.equal(
    supabase.notificationEvents[0]?.denied_reason,
    "notification_grant_required"
  )
  assert.equal(supabase.notificationDeliveryAttempts.length, 0)
  assert.equal(JSON.stringify(res.body).includes("person@example.com"), false)
})

test("API v3 notification send denies disabled providers before delivery", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  const provider = supabase.notificationProviders.find(
    (row) => row.provider_key === "email_smtp"
  )
  if (provider) {
    provider.status = "disabled"
  }

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_provider_disabled",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 403)
  assert.equal(
    (res.body as { error: { code: string } }).error.code,
    "notification_provider_disabled"
  )
  assert.equal(supabase.notificationEvents[0]?.status, "denied")
  assert.equal(
    supabase.notificationEvents[0]?.denied_reason,
    "notification_provider_disabled"
  )
  assert.equal(supabase.notificationDeliveryAttempts.length, 0)
})

test("API v3 notification send enforces per-user app quotas with denial evidence", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  const policy = supabase.notificationAppPolicies[0]
  if (policy) {
    policy.minute_limit = 1
    policy.daily_limit = 5
  }
  supabase.notificationEvents.push({
    category_key: "TRANSACTIONAL",
    created_at: new Date().toISOString(),
    dapp_id: 42,
    dapp_user_uuid: DAPP_USER_UUID,
    id: "quota_event_1",
    status: "accepted",
    user_id: 1234,
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Milestone #4 was approved.",
      category: "TRANSACTIONAL",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Milestone approved",
    },
    headers: {
      "idempotency-key": "notification_send_quota_denied",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 429)
  assert.equal(
    (res.body as { error: { code: string } }).error.code,
    "notification_quota_exceeded"
  )
  assert.equal(supabase.notificationEvents.length, 2)
  assert.equal(supabase.notificationEvents[1]?.status, "denied")
  assert.equal(
    supabase.notificationEvents[1]?.denied_reason,
    "notification_quota_exceeded"
  )
  assert.equal(supabase.notificationDeliveryAttempts.length, 0)
})

test("API v3 notification send rejects malformed payloads before event creation", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      body: "Test",
      category: "MARKETING",
      dapp_user_uuid: DAPP_USER_UUID,
      priority: "NORMAL",
      title: "Nope",
    },
    headers: {
      "idempotency-key": "notification_send_invalid",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const res = createApiResponse()

  await notificationSendV3Handler(req, res)

  assert.equal(res.statusCode, 400)
  assert.equal((res.body as { error: { code: string } }).error.code, "invalid_request")
  assert.equal(supabase.notificationEvents.length, 0)
})

test("API v3 notification send rejects idempotency-key request conflicts", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addNotificationSendFixture(supabase)
  const firstBody = {
    apikey: apiKey,
    body: "Milestone #4 was approved.",
    category: "TRANSACTIONAL",
    dapp_user_uuid: DAPP_USER_UUID,
    priority: "NORMAL",
    title: "Milestone approved",
  }

  const firstReq = createApiRequest({
    body: firstBody,
    headers: {
      "idempotency-key": "notification_send_conflict",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const firstRes = createApiResponse()
  await notificationSendV3Handler(firstReq, firstRes)
  assert.equal(firstRes.statusCode, 200)

  const conflictReq = createApiRequest({
    body: {
      ...firstBody,
      title: "Different title",
    },
    headers: {
      "idempotency-key": "notification_send_conflict",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/send",
  })
  const conflictRes = createApiResponse()
  await notificationSendV3Handler(conflictReq, conflictRes)

  assert.equal(conflictRes.statusCode, 409)
  assert.equal(
    (conflictRes.body as { error: { code: string } }).error.code,
    "idempotency_conflict"
  )
  assert.equal(supabase.notificationEvents.length, 1)
})

test("Passport notification history lists user-visible redacted delivery evidence", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.setDapp({ appname: "History App", id: 42, uid: "history-app" })
  supabase.notificationChannels.push({
    channel_type: "telegram",
    display_hint: "Telegram ending 6789",
    id: "history_channel_1",
    label: "Telegram",
    provider_key: "telegram_bot",
    user_id: 1234,
  })
  supabase.notificationEvents.push({
    body: "Milestone approved.",
    category_key: "TRANSACTIONAL",
    created_at: "2026-05-14T20:00:00Z",
    dapp_id: 42,
    dapp_user_uuid: DAPP_USER_UUID,
    id: "history_event_1",
    priority: "NORMAL",
    selected_channel_id: "history_channel_1",
    selected_channel_type: "telegram",
    status: "accepted",
    title: "Milestone approved",
    updated_at: "2026-05-14T20:01:00Z",
    user_id: 1234,
  })
  supabase.notificationDeliveryAttempts.push({
    attempt_number: 1,
    completed_at: "2026-05-14T20:01:00Z",
    event_id: "history_event_1",
    id: "history_attempt_1",
    provider_key: "telegram_bot",
    status: "sent",
  })
  supabase.privateNotificationChannelDestinations.push({
    channel_id: "history_channel_1",
    destination_ciphertext: "not-a-chat-id",
    id: "history_destination_1",
    status: "active",
    user_id: 1234,
  })

  const req = createApiRequest({
    body: { limit: 10 },
    headers: {
      authorization: "Bearer firebase-token",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_notification_history_1",
    },
    url: "/api/notifications/history/list",
  })
  const res = createApiResponse()

  await notificationHistoryListHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers["x-request-id"], "passport_notification_history_1")
  const body = res.body as DataResponse<
    Array<{
      app: { appName: string | null }
      deliveryStatus: string | null
      selectedChannel: { displayHint: string | null; label: string | null }
    }>
  >
  assert.equal(body.data[0]?.app.appName, "History App")
  assert.equal(body.data[0]?.deliveryStatus, "sent")
  assert.equal(body.data[0]?.selectedChannel.label, "Telegram")
  assert.equal(JSON.stringify(res.body).includes("1234"), false)
  assert.equal(JSON.stringify(res.body).includes("not-a-chat-id"), false)
})

test("API v3 notification status returns dapp-owned event status without channel destinations", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addDappAuth(supabase)
  supabase.setDappUser({
    dapp_id: 42,
    user_id: 1234,
    uuid: DAPP_USER_UUID,
  })
  supabase.notificationEvents.push({
    body: "Milestone approved.",
    category_key: "TRANSACTIONAL",
    created_at: "2026-05-14T20:00:00Z",
    dapp_id: 42,
    dapp_user_uuid: DAPP_USER_UUID,
    id: "status_event_1",
    priority: "NORMAL",
    selected_channel_id: "status_channel_1",
    selected_channel_type: "email",
    status: "accepted",
    title: "Milestone approved",
    updated_at: "2026-05-14T20:01:00Z",
    user_id: 1234,
  })
  supabase.notificationDeliveryAttempts.push({
    attempt_number: 1,
    completed_at: "2026-05-14T20:01:00Z",
    error_code: null,
    event_id: "status_event_1",
    id: "status_attempt_1",
    provider_key: "email_smtp",
    status: "sent",
  })
  supabase.privateNotificationChannelDestinations.push({
    channel_id: "status_channel_1",
    destination_ciphertext: "person@example.com",
    id: "status_destination_1",
    status: "active",
    user_id: 1234,
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      dapp_user_uuid: DAPP_USER_UUID,
      event_id: "status_event_1",
    },
    headers: {
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_notification_status_1",
    },
    url: "/api/v3/notifications/status",
  })
  const res = createApiResponse()

  await notificationStatusV3Handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers["x-request-id"], "passport_notification_status_1")
  assert.equal(
    (res.body as DataResponse<{ deliveryStatus: string }>).data.deliveryStatus,
    "sent"
  )
  assert.equal(JSON.stringify(res.body).includes("person@example.com"), false)
  assert.equal(JSON.stringify(res.body).includes("1234"), false)
})

test("API v3 notification status rejects cross-dapp event lookups", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const apiKey = addDappAuth(supabase)
  supabase.setDappUser({
    dapp_id: 42,
    user_id: 1234,
    uuid: DAPP_USER_UUID,
  })
  supabase.notificationEvents.push({
    category_key: "TRANSACTIONAL",
    dapp_id: 99,
    dapp_user_uuid: DAPP_USER_UUID,
    id: "other_dapp_event",
    status: "accepted",
    user_id: 1234,
  })

  const req = createApiRequest({
    body: {
      apikey: apiKey,
      dapp_user_uuid: DAPP_USER_UUID,
      event_id: "other_dapp_event",
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/notifications/status",
  })
  const res = createApiResponse()

  await notificationStatusV3Handler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal((res.body as { error: { code: string } }).error.code, "not_found")
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

test("Passport SIWC account list requires Firebase bearer auth", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)

  const req = createApiRequest({
    body: {},
    headers: {
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_siwc_missing_auth",
    },
    url: "/api/siwc/accounts/list",
  })
  const res = createApiResponse()

  await siwcAccountListHandler(req, res)

  assert.equal(res.statusCode, 401)
  assert.equal(res.headers["x-request-id"], "passport_siwc_missing_auth")
  assert.deepEqual(res.body, {
    error: {
      code: "unauthorized",
      message: "Missing Firebase bearer token.",
      requestId: "passport_siwc_missing_auth",
    },
  })
})

test("Passport SIWC account list returns public app-scoped account metadata only", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.setDapp({ appname: "Wallet App", id: 42 })
  supabase.setDapp({ appname: "Other App", id: 99 })
  supabase.userAccounts.push(
    {
      account_label: "Primary EVM",
      chain_key: "evm",
      created_at: "2026-05-01T00:00:00.000Z",
      custody_status: "cubid_custodied",
      id: "account_visible",
      private_key_ciphertext: "must_not_surface",
      public_address: "0xabc",
      status: "active",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_id: 1234,
      wrapped_data_key: "must_not_surface",
    },
    {
      chain_key: "solana",
      created_at: "2026-05-01T00:00:00.000Z",
      custody_status: "cubid_custodied",
      id: "account_other_user",
      public_address: "other",
      status: "active",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_id: 9999,
    },
    {
      chain_key: "sui",
      created_at: "2026-05-01T00:00:00.000Z",
      custody_status: "cubid_custodied",
      id: "account_revoked",
      public_address: "0xdead",
      status: "revoked",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_id: 1234,
    }
  )
  supabase.dappUserAccounts.push(
    {
      created_at: "2026-05-01T00:00:00.000Z",
      dapp_id: 42,
      dapp_user_uuid: "00000000-0000-4000-8000-000000000061",
      id: "link_visible",
      status: "active",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_account_id: "account_visible",
    },
    {
      created_at: "2026-05-01T00:00:00.000Z",
      dapp_id: 99,
      dapp_user_uuid: "00000000-0000-4000-8000-000000000062",
      id: "link_other_user",
      status: "active",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_account_id: "account_other_user",
    },
    {
      created_at: "2026-05-01T00:00:00.000Z",
      dapp_id: 42,
      dapp_user_uuid: "00000000-0000-4000-8000-000000000063",
      id: "link_revoked",
      status: "active",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_account_id: "account_revoked",
    },
    {
      created_at: "2026-05-01T00:00:00.000Z",
      dapp_id: 42,
      dapp_user_uuid: "00000000-0000-4000-8000-000000000064",
      id: "link_archived",
      status: "archived",
      updated_at: "2026-05-02T00:00:00.000Z",
      user_account_id: "account_visible",
    }
  )
  supabase.setSiwcSigningPolicy({
    custody_enabled: true,
    dapp_id: 42,
    policy_version: 3,
    required_acr: "urn:cubid:acr:passkey",
    sandbox_mode: true,
    signing_enabled: true,
    status: "enabled",
  })

  const req = createApiRequest({
    body: {},
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_siwc_accounts",
    },
    url: "/api/siwc/accounts/list",
  })
  const res = createApiResponse()

  await siwcAccountListHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.headers["x-request-id"], "passport_siwc_accounts")
  const accounts = (res.body as DataResponse<Array<Record<string, unknown>>>).data
  assert.equal(accounts.length, 1)
  assert.deepEqual(accounts[0], {
    accountId: "account_visible",
    accountStatus: "active",
    chain: "evm",
    createdAt: "2026-05-01T00:00:00.000Z",
    custodyEnabled: true,
    custodyStatus: "cubid_custodied",
    dappId: "42",
    dappName: "Wallet App",
    dappUserAccountId: "link_visible",
    dappUserUuid: "00000000-0000-4000-8000-000000000061",
    label: "Primary EVM",
    linkStatus: "active",
    policyStatus: "enabled",
    policyVersion: 3,
    publicAddress: "0xabc",
    requiredAcr: "urn:cubid:acr:passkey",
    sandboxMode: true,
    signingEnabled: true,
    updatedAt: "2026-05-02T00:00:00.000Z",
  })
  assert.equal(JSON.stringify(res.body).includes("private"), false)
  assert.equal(JSON.stringify(res.body).includes("ciphertext"), false)
  assert.equal(JSON.stringify(res.body).includes("wrapped"), false)
  assert.equal(JSON.stringify(res.body).includes("user_id"), false)
})

test("Passport SIWC account list returns an empty list for signed-in users without Cubid user ids", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()

  const req = createApiRequest({
    body: {},
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/siwc/accounts/list",
  })
  const res = createApiResponse()

  await siwcAccountListHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.deepEqual((res.body as DataResponse<unknown[]>).data, [])
})

const addSiwcSigningFixtures = (
  supabase: MockPassportSupabase,
  policyOverrides: Record<string, unknown> = {}
) => {
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000071"
  const userAccountId = "00000000-0000-4000-8000-000000000072"
  const dappUserAccountId = "00000000-0000-4000-8000-000000000073"
  const wallet = ethers.Wallet.createRandom()

  supabase.setUser({ email: "person@example.com", id: 1234 })
  supabase.setDappUser({
    dapp_id: 42,
    user_id: 1234,
    uuid: dappUserUuid,
  })
  supabase.userAccounts.push({
    chain_key: "evm",
    created_at: "2026-05-01T00:00:00.000Z",
    custody_status: "cubid_custodied",
    id: userAccountId,
    public_address: wallet.address,
    public_address_normalized: wallet.address.toLowerCase(),
    status: "active",
    updated_at: "2026-05-01T00:00:00.000Z",
    user_id: 1234,
  })
  supabase.dappUserAccounts.push({
    created_at: "2026-05-01T00:00:00.000Z",
    dapp_id: 42,
    dapp_user_uuid: dappUserUuid,
    id: dappUserAccountId,
    status: "active",
    updated_at: "2026-05-01T00:00:00.000Z",
    user_account_id: userAccountId,
  })
  supabase.setSiwcSigningPolicy({
    allowed_chains: ["evm"],
    allowed_request_types: ["message", "typed_data", "transaction"],
    contract_allowlist: [],
    custody_enabled: true,
    dapp_id: 42,
    policy_version: 2,
    required_acr: "urn:cubid:acr:passkey",
    sandbox_mode: true,
    signing_enabled: true,
    status: "enabled",
    transaction_value_limit_usd: null,
    ...policyOverrides,
  })
  supabase.privateKeys.push({
    ...encryptBlockchainPrivateKeyWithKey(
      wallet.privateKey,
      Buffer.from("fedcba9876543210fedcba9876543210"),
      {
        chainKey: "evm",
        publicAddressNormalized: wallet.address.toLowerCase(),
        userAccountId,
        userId: 1234,
      }
    ),
    chain_key: "evm",
    status: "active",
    user_account_id: userAccountId,
  })

  return {
    apiKey,
    dappUserAccountId,
    dappUserUuid,
    userAccountId,
    wallet,
  }
}

const addLegacyVisibleAccount = (
  supabase: MockPassportSupabase,
  input: {
    chain: string
    dappId?: number
    dappUserUuid: string
    id: string
    label?: string
    publicAddress: string
    userId?: number
  }
) => {
  supabase.userAccounts.push({
    account_label: input.label ?? null,
    chain_key: input.chain,
    created_at: "2026-05-01T00:00:00.000Z",
    custody_status: "legacy_cubid_custodied",
    id: input.id,
    public_address: input.publicAddress,
    public_address_normalized:
      input.chain === "solana"
        ? input.publicAddress
        : input.publicAddress.toLowerCase(),
    status: "active",
    updated_at: "2026-05-01T00:00:00.000Z",
    user_id: input.userId ?? 1234,
  })
  supabase.dappUserAccounts.push({
    created_at: "2026-05-01T00:00:00.000Z",
    dapp_id: input.dappId ?? 42,
    dapp_user_uuid: input.dappUserUuid,
    id: `${input.id}_link`,
    status: "active",
    updated_at: "2026-05-01T00:00:00.000Z",
    user_account_id: input.id,
  })
}

test("Passport API v3 rejects new Cubid-generated wallet creation", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000152"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
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
        "idempotency-key": "deprecated-generate-wallet",
        origin: "https://passport.cubid.me",
        "x-request-id": "passport_deprecated_generate",
      },
      url: "/api/v3/accounts/generate",
    }),
    res
  )

  assert.equal(res.statusCode, 410)
  assert.equal(
    (res.body as { error: { code: string; requestId: string } }).error.code,
    "cubid_generated_wallets_deprecated"
  )
  assert.equal(
    (res.body as { error: { code: string; requestId: string } }).error
      .requestId,
    "passport_deprecated_generate"
  )
  assert.equal(supabase.userAccounts.length, 0)
  assert.equal(supabase.privateKeys.length, 0)
  assert.equal(supabase.dappUserAccounts.length, 0)
})

test("Passport API v3 rejects new Cubid normal-signing requests", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const fixtures = addSiwcSigningFixtures(supabase)

  const res = createApiResponse()
  await createSiwcSigningRequestHandler(
    createApiRequest({
      body: {
        apikey: fixtures.apiKey,
        dapp_user_uuid: fixtures.dappUserUuid,
        payload: { message: "deprecated signing" },
        request_type: "message",
        user_account_id: fixtures.userAccountId,
      },
      headers: {
        "idempotency-key": "deprecated-signing-request",
        origin: "https://passport.cubid.me",
        "x-request-id": "passport_deprecated_signing",
      },
      url: "/api/v3/signing/requests/create",
    }),
    res
  )

  assert.equal(res.statusCode, 410)
  assert.equal(
    (res.body as { error: { code: string; requestId: string } }).error.code,
    "cubid_signing_deprecated"
  )
  assert.equal(
    (res.body as { error: { code: string; requestId: string } }).error
      .requestId,
    "passport_deprecated_signing"
  )
  assert.equal(supabase.siwcSigningRequests.length, 0)
})

test("Passport SIWC approval refuses legacy signing without decrypting keys", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  addSiwcSigningFixtures(supabase)

  const res = createApiResponse()
  await approveSiwcSigningRequestHandler(
    createApiRequest({
      body: { signingRequestId: "legacy_signing_request" },
      headers: {
        authorization: "Bearer firebase-test-token",
        origin: "https://passport.cubid.me",
        "x-request-id": "passport_deprecated_approval",
      },
      url: "/api/siwc/signing/requests/approve",
    }),
    res
  )

  assert.equal(res.statusCode, 410)
  assert.equal(
    (res.body as { error: { code: string; requestId: string } }).error.code,
    "cubid_signing_deprecated"
  )
  assert.equal(supabase.privateKeys.length, 1)
})

test.skip("legacy Cubid signing request creation used policy and idempotency", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const fixtures = addSiwcSigningFixtures(supabase)
  const body = {
    apikey: fixtures.apiKey,
    dapp_user_uuid: fixtures.dappUserUuid,
    payload: { message: "hello Cubid" },
    request_type: "message",
    user_account_id: fixtures.userAccountId,
  }

  const createReq = createApiRequest({
    body,
    headers: {
      "idempotency-key": "signing-create-1",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_siwc_signing_create",
    },
    url: "/api/v3/signing/requests/create",
  })
  const createRes = createApiResponse()

  await createSiwcSigningRequestHandler(createReq, createRes)

  assert.equal(createRes.statusCode, 200)
  assert.equal(supabase.siwcSigningRequests.length, 1)
  const created = (createRes.body as DataResponse<Record<string, unknown>>).data
  assert.equal(created.status, "pending_user_approval")
  assert.equal(created.policyVersion, 2)
  assert.equal(created.requiredAcr, "urn:cubid:acr:passkey")
  assert.equal(JSON.stringify(createRes.body).includes('"payload"'), false)
  assert.equal(JSON.stringify(createRes.body).includes("private"), false)

  const replayRes = createApiResponse()
  await createSiwcSigningRequestHandler(createReq, replayRes)
  assert.equal(replayRes.statusCode, 200)
  assert.equal(supabase.siwcSigningRequests.length, 1)
  assert.deepEqual(replayRes.body, createRes.body)

  const getReq = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      signing_request_id: String(created.signingRequestId),
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/get",
  })
  const getRes = createApiResponse()
  await getSiwcSigningRequestHandler(getReq, getRes)
  assert.equal(getRes.statusCode, 200)
  assert.equal(
    (getRes.body as DataResponse<Record<string, unknown>>).data
      .signingRequestId,
    created.signingRequestId
  )

  const listReq = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      dapp_user_uuid: fixtures.dappUserUuid,
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/list",
  })
  const listRes = createApiResponse()
  await listSiwcSigningRequestsHandler(listReq, listRes)
  assert.equal(listRes.statusCode, 200)
  assert.equal((listRes.body as DataResponse<unknown[]>).data.length, 1)
})

test.skip("legacy Cubid signing request policy-denied deferred transactions", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const fixtures = addSiwcSigningFixtures(supabase, {
    contract_allowlist: ["0x0000000000000000000000000000000000000000"],
    transaction_value_limit_usd: 25,
  })
  const req = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      dapp_user_uuid: fixtures.dappUserUuid,
      payload: {
        declaredValueUsd: 10,
        to: "0x0000000000000000000000000000000000000000",
      },
      request_type: "transaction",
      user_account_id: fixtures.userAccountId,
    },
    headers: {
      "idempotency-key": "signing-create-transaction",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/create",
  })
  const res = createApiResponse()

  await createSiwcSigningRequestHandler(req, res)

  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(res.statusCode, 200)
  assert.equal(data.status, "policy_denied")
  assert.equal(data.errorCode, "transaction_signing_deferred")
  assert.equal(data.riskLevel, "high")
  assert.equal(data.transactionOperationType, "native_transfer")
  assert.equal(
    data.transactionRecipient,
    "0x0000000000000000000000000000000000000000"
  )
  assert.equal(data.transactionDeclaredValueUsd, 10)
  assert.deepEqual(data.riskReasons, ["transaction_signing_deferred"])
  assert.equal(data.stepUpRequired, true)
})

test.skip("legacy Cubid signing transaction risk recorded value and allowlist denials", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const fixtures = addSiwcSigningFixtures(supabase, {
    contract_allowlist: ["0x0000000000000000000000000000000000000042"],
    transaction_value_limit_usd: 25,
  })
  const req = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      dapp_user_uuid: fixtures.dappUserUuid,
      payload: {
        data: "0xabcdef",
        declaredValueUsd: 50,
        to: "0x0000000000000000000000000000000000000099",
      },
      request_type: "transaction",
      user_account_id: fixtures.userAccountId,
    },
    headers: {
      "idempotency-key": "signing-create-transaction-denied",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/create",
  })
  const res = createApiResponse()

  await createSiwcSigningRequestHandler(req, res)

  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(res.statusCode, 200)
  assert.equal(data.status, "policy_denied")
  assert.equal(data.errorCode, "transaction_value_limit_exceeded")
  assert.equal(data.transactionOperationType, "contract_call")
  assert.equal(
    data.transactionContractAddress,
    "0x0000000000000000000000000000000000000099"
  )
  assert.deepEqual(data.riskReasons, [
    "contract_not_allowlisted",
    "transaction_value_limit_exceeded",
    "transaction_signing_deferred",
  ])
})

test.skip("legacy Cubid signing transaction risk failed closed for unsupported chains", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const fixtures = addSiwcSigningFixtures(supabase, {
    allowed_chains: ["evm", "solana"],
  })
  const solanaAccountId = "00000000-0000-4000-8000-000000000075"
  supabase.userAccounts.push({
    chain_key: "solana",
    created_at: "2026-05-01T00:00:00.000Z",
    custody_status: "cubid_custodied",
    id: solanaAccountId,
    public_address: "solana-address",
    public_address_normalized: "solana-address",
    status: "active",
    updated_at: "2026-05-01T00:00:00.000Z",
    user_id: 1234,
  })
  supabase.dappUserAccounts.push({
    created_at: "2026-05-01T00:00:00.000Z",
    dapp_id: 42,
    dapp_user_uuid: fixtures.dappUserUuid,
    id: "00000000-0000-4000-8000-000000000076",
    status: "active",
    updated_at: "2026-05-01T00:00:00.000Z",
    user_account_id: solanaAccountId,
  })
  const req = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      dapp_user_uuid: fixtures.dappUserUuid,
      payload: { to: "solana-destination" },
      request_type: "transaction",
      user_account_id: solanaAccountId,
    },
    headers: {
      "idempotency-key": "signing-create-transaction-solana",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/create",
  })
  const res = createApiResponse()

  await createSiwcSigningRequestHandler(req, res)

  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(res.statusCode, 200)
  assert.equal(data.status, "policy_denied")
  assert.equal(data.errorCode, "transaction_chain_risk_unsupported")
  assert.deepEqual(data.riskReasons, ["transaction_chain_risk_unsupported"])
})

test.skip("legacy Cubid signing request emitted created and policy-denied webhooks", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  const fixtures = addSiwcSigningFixtures(supabase, {
    webhook_event_subscriptions: [
      "wallet.policy.denied",
      "wallet.signing_request.created",
    ],
  })
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.created")
  addSiwcWebhookSubscription(supabase, "wallet.policy.denied")
  const delivered: Array<Record<string, unknown>> = []
  axios.post = (async (_url: string, body: unknown) => {
    delivered.push(JSON.parse(String(body)) as Record<string, unknown>)
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  await createSiwcSigningRequestHandler(
    createApiRequest({
      body: {
        apikey: fixtures.apiKey,
        dapp_user_uuid: fixtures.dappUserUuid,
        payload: { message: "webhook me" },
        request_type: "message",
        user_account_id: fixtures.userAccountId,
      },
      headers: {
        "idempotency-key": "signing-created-webhook",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/signing/requests/create",
    }),
    createApiResponse()
  )
  await createSiwcSigningRequestHandler(
    createApiRequest({
      body: {
        apikey: fixtures.apiKey,
        dapp_user_uuid: fixtures.dappUserUuid,
        payload: {
          declaredValueUsd: 10,
          to: "0x0000000000000000000000000000000000000000",
        },
        request_type: "transaction",
        user_account_id: fixtures.userAccountId,
      },
      headers: {
        "idempotency-key": "signing-policy-denied-webhook",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/signing/requests/create",
    }),
    createApiResponse()
  )

  assert.deepEqual(
    delivered.map((payload) => payload.eventType).sort(),
    ["wallet.policy.denied", "wallet.signing_request.created"]
  )
  const denied = delivered.find(
    (payload) => payload.eventType === "wallet.policy.denied"
  )
  assert.equal(
    (denied?.data as Record<string, unknown>).errorCode,
    "transaction_signing_deferred"
  )
  assert.equal(JSON.stringify(delivered).includes('"payload"'), false)
  assert.equal(JSON.stringify(delivered).includes("private"), false)
  assert.equal(JSON.stringify(delivered).includes("human_subject_key"), false)
})

test.skip("legacy Cubid signing approval completed EVM message signatures", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  const fixtures = addSiwcSigningFixtures(supabase)

  const createReq = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      dapp_user_uuid: fixtures.dappUserUuid,
      payload: { message: "approve this" },
      request_type: "message",
      user_account_id: fixtures.userAccountId,
    },
    headers: {
      "idempotency-key": "signing-approve-1",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/create",
  })
  const createRes = createApiResponse()
  await createSiwcSigningRequestHandler(createReq, createRes)
  const signingRequestId = String(
    (createRes.body as DataResponse<Record<string, unknown>>).data
      .signingRequestId
  )

  const missingStepUpReq = createApiRequest({
    body: { signingRequestId },
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_siwc_approve_no_stepup",
    },
    url: "/api/siwc/signing/requests/approve",
  })
  const missingStepUpRes = createApiResponse()
  await approveSiwcSigningRequestHandler(missingStepUpReq, missingStepUpRes)
  assert.equal(missingStepUpRes.statusCode, 403)
  assert.equal(
    (missingStepUpRes.body as { error: { code: string } }).error.code,
    "step_up_required"
  )

  supabase.setOidcHumanSubject({
    cubid_user_id: 1234,
    human_subject_key: "human_subject_1",
    primary_email: "person@example.com",
  })
  supabase.setOidcSession({
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    human_subject_key: "human_subject_1",
    metadata: {
      acr: "urn:cubid:acr:passkey",
      authentication_methods: ["passkey"],
    },
    revoked_at: null,
    session_id: "oidc_session_passkey",
  })

  const approveReq = createApiRequest({
    body: { signingRequestId },
    headers: {
      authorization: "Bearer firebase-test-token",
      cookie: "cubid_oidc_session_id=oidc_session_passkey",
      origin: "https://passport.cubid.me",
    },
    url: "/api/siwc/signing/requests/approve",
  })
  const approveRes = createApiResponse()
  await approveSiwcSigningRequestHandler(approveReq, approveRes)

  assert.equal(approveRes.statusCode, 200)
  const approved = (approveRes.body as DataResponse<Record<string, unknown>>).data
  assert.equal(approved.status, "completed")
  const result = approved.result as { signature: string }
  assert.equal(
    ethers.utils.verifyMessage("approve this", result.signature),
    fixtures.wallet.address
  )
  assert.equal(JSON.stringify(approveRes.body).includes(fixtures.wallet.privateKey), false)
})

test.skip("legacy Cubid signing approval emitted completed webhooks", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  const fixtures = addSiwcSigningFixtures(supabase, {
    webhook_event_subscriptions: [
      "wallet.signature.completed",
      "wallet.signing_request.approved",
      "wallet.signing_request.created",
    ],
  })
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.created")
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.approved")
  addSiwcWebhookSubscription(supabase, "wallet.signature.completed")
  const delivered: Array<Record<string, unknown>> = []
  axios.post = (async (_url: string, body: unknown) => {
    delivered.push(JSON.parse(String(body)) as Record<string, unknown>)
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  const createRes = createApiResponse()
  await createSiwcSigningRequestHandler(
    createApiRequest({
      body: {
        apikey: fixtures.apiKey,
        dapp_user_uuid: fixtures.dappUserUuid,
        payload: { message: "complete webhook" },
        request_type: "message",
        user_account_id: fixtures.userAccountId,
      },
      headers: {
        "idempotency-key": "signing-completed-webhook",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/signing/requests/create",
    }),
    createRes
  )
  const signingRequestId = String(
    (createRes.body as DataResponse<Record<string, unknown>>).data
      .signingRequestId
  )

  supabase.setOidcHumanSubject({
    cubid_user_id: 1234,
    human_subject_key: "human_subject_1",
    primary_email: "person@example.com",
  })
  supabase.setOidcSession({
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    human_subject_key: "human_subject_1",
    metadata: {
      acr: "urn:cubid:acr:passkey",
      authentication_methods: ["passkey"],
    },
    revoked_at: null,
    session_id: "oidc_session_passkey_webhook",
  })

  await approveSiwcSigningRequestHandler(
    createApiRequest({
      body: { signingRequestId },
      headers: {
        authorization: "Bearer firebase-test-token",
        cookie: "cubid_oidc_session_id=oidc_session_passkey_webhook",
        origin: "https://passport.cubid.me",
      },
      url: "/api/siwc/signing/requests/approve",
    }),
    createApiResponse()
  )

  assert.deepEqual(
    delivered.map((payload) => payload.eventType),
    [
      "wallet.signing_request.created",
      "wallet.signing_request.approved",
      "wallet.signature.completed",
    ]
  )
  const completed = delivered[2]
  assert.equal((completed.data as Record<string, unknown>).status, "completed")
  assert.equal(
    ((completed.data as Record<string, unknown>).result as Record<string, unknown>)
      .algorithm,
    "evm_secp256k1"
  )
  assert.equal(
    "signature" in
      (((completed.data as Record<string, unknown>).result as Record<
        string,
        unknown
      >) ?? {}),
    false
  )
  assert.equal(JSON.stringify(completed).includes(fixtures.wallet.privateKey), false)
})

test.skip("legacy Cubid signing approval rejected stale passkey step-up sessions", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  const fixtures = addSiwcSigningFixtures(supabase, {
    webhook_event_subscriptions: [
      "wallet.signing_request.created",
      "wallet.signing_request.step_up_failed",
    ],
  })
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.created")
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.step_up_failed")
  const delivered: Array<Record<string, unknown>> = []
  axios.post = (async (_url: string, body: unknown) => {
    delivered.push(JSON.parse(String(body)) as Record<string, unknown>)
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  const createReq = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      dapp_user_uuid: fixtures.dappUserUuid,
      payload: { message: "stale passkey approval" },
      request_type: "message",
      user_account_id: fixtures.userAccountId,
    },
    headers: {
      "idempotency-key": "signing-approve-stale-stepup",
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/create",
  })
  const createRes = createApiResponse()
  await createSiwcSigningRequestHandler(createReq, createRes)
  const signingRequestId = String(
    (createRes.body as DataResponse<Record<string, unknown>>).data
      .signingRequestId
  )

  supabase.setOidcHumanSubject({
    cubid_user_id: 1234,
    human_subject_key: "human_subject_1",
    primary_email: "person@example.com",
  })
  supabase.setOidcSession({
    created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    human_subject_key: "human_subject_1",
    metadata: {
      acr: "urn:cubid:acr:passkey",
      authentication_methods: ["passkey"],
    },
    revoked_at: null,
    session_id: "oidc_session_stale_passkey",
  })

  const approveReq = createApiRequest({
    body: { signingRequestId },
    headers: {
      authorization: "Bearer firebase-test-token",
      cookie: "cubid_oidc_session_id=oidc_session_stale_passkey",
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_siwc_stale_stepup",
    },
    url: "/api/siwc/signing/requests/approve",
  })
  const approveRes = createApiResponse()
  await approveSiwcSigningRequestHandler(approveReq, approveRes)

  assert.equal(approveRes.statusCode, 403)
  assert.equal(
    (approveRes.body as { error: { code: string } }).error.code,
    "step_up_required"
  )
  assert.equal(
    supabase.eventInserts.some(
      (event) =>
        event.event_type === "signing_request.step_up_failed" &&
        event.request_id === "passport_siwc_stale_stepup"
    ),
    true
  )
  assert.equal(
    delivered.some(
      (payload) => payload.eventType === "wallet.signing_request.step_up_failed"
    ),
    true
  )
})

test.skip("legacy Cubid signing requests could be listed rejected and cancelled", async () => {
  const supabase = new MockPassportSupabase()
  setPassportSupabaseForTests(supabase as never)
  addFirebaseUserAuth()
  const fixtures = addSiwcSigningFixtures(supabase, {
    webhook_event_subscriptions: [
      "wallet.signing_request.cancelled",
      "wallet.signing_request.rejected",
    ],
  })
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.cancelled")
  addSiwcWebhookSubscription(supabase, "wallet.signing_request.rejected")
  const delivered: Array<Record<string, unknown>> = []
  axios.post = (async (_url: string, body: unknown) => {
    delivered.push(JSON.parse(String(body)) as Record<string, unknown>)
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  const createSigning = async (idempotencyKey: string) => {
    const req = createApiRequest({
      body: {
        apikey: fixtures.apiKey,
        dapp_user_uuid: fixtures.dappUserUuid,
        payload: { message: idempotencyKey },
        request_type: "message",
        user_account_id: fixtures.userAccountId,
      },
      headers: {
        "idempotency-key": idempotencyKey,
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/signing/requests/create",
    })
    const res = createApiResponse()
    await createSiwcSigningRequestHandler(req, res)
    return String(
      (res.body as DataResponse<Record<string, unknown>>).data
        .signingRequestId
    )
  }

  const rejectId = await createSigning("signing-reject-1")
  const cancelId = await createSigning("signing-cancel-1")
  const listReq = createApiRequest({
    body: {},
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/siwc/signing/requests/list",
  })
  const listRes = createApiResponse()
  await listPassportSiwcSigningRequestsHandler(listReq, listRes)
  assert.equal(listRes.statusCode, 200)
  assert.equal((listRes.body as DataResponse<unknown[]>).data.length, 2)

  const rejectReq = createApiRequest({
    body: { signingRequestId: rejectId },
    headers: {
      authorization: "Bearer firebase-test-token",
      origin: "https://passport.cubid.me",
    },
    url: "/api/siwc/signing/requests/reject",
  })
  const rejectRes = createApiResponse()
  await rejectSiwcSigningRequestHandler(rejectReq, rejectRes)
  assert.equal(rejectRes.statusCode, 200)
  assert.equal(
    (rejectRes.body as DataResponse<Record<string, unknown>>).data.status,
    "rejected"
  )

  const cancelReq = createApiRequest({
    body: {
      apikey: fixtures.apiKey,
      signing_request_id: cancelId,
    },
    headers: {
      origin: "https://passport.cubid.me",
    },
    url: "/api/v3/signing/requests/cancel",
  })
  const cancelRes = createApiResponse()
  await cancelSiwcSigningRequestHandler(cancelReq, cancelRes)
  assert.equal(cancelRes.statusCode, 200)
  assert.equal(
    (cancelRes.body as DataResponse<Record<string, unknown>>).data.status,
    "cancelled"
  )
  assert.deepEqual(
    delivered.map((payload) => payload.eventType).sort(),
    ["wallet.signing_request.cancelled", "wallet.signing_request.rejected"]
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

test("Passport v2 save_secret is removed and never writes plaintext secrets", async () => {
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
      "x-request-id": "passport_v2_secret_removed",
    },
    url: "/api/v2/save_secret",
  })
  const res = createApiResponse()

  await saveSecretV2Handler(req, res)

  assert.equal(res.statusCode, 410)
  assert.equal(res.headers["x-request-id"], "passport_v2_secret_removed")
  assert.deepEqual(res.body, {
    error: {
      code: "endpoint_removed",
      message:
        "Legacy plaintext dapp user secret writes have been removed. Use /api/v3/save_secret.",
      requestId: "passport_v2_secret_removed",
    },
  })
  assert.equal(supabase.dappUserSecrets.length, 0)
  assert.equal(supabase.privateDappUserSecrets.length, 0)

  const optionsReq = createApiRequest({
    headers: {
      origin: "https://passport.cubid.me",
      "x-request-id": "passport_v2_secret_options",
    },
    method: "OPTIONS",
    url: "/api/v2/save_secret",
  })
  const optionsRes = createApiResponse()

  await saveSecretV2Handler(optionsReq, optionsRes)

  assert.equal(optionsRes.statusCode, 200)
  assert.equal(optionsRes.headers["x-request-id"], "passport_v2_secret_options")
  assert.equal(
    optionsRes.headers["access-control-allow-origin"],
    "https://passport.cubid.me"
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
  assert.equal(failedRetryRes.statusCode, 409)
  assert.equal(
    (failedRetryRes.body as { error: { code: string } }).error.code,
    "idempotency_failed"
  )
  assert.equal(
    supabase.privateDappUserSecrets.length,
    priorSecretCount
  )
  assert.equal(
    supabase.apiIdempotencyKeys.find(
      (row) => row.idempotency_key === "save-secret-failed"
    )?.status,
    "failed"
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

test("Passport v3 recovery bundle enrollment stores encrypted bundle metadata only", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000260"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const res = createApiResponse()
  await enrollRecoveryBundleV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        bundle_material: "recoverable-wallet-client-share",
        bundle_version: 1,
        dapp_user_uuid: dappUserUuid,
        provider_key: "cubid",
        recovery_bundle_id: "rw_bundle_test_primary",
        recovery_reference: "provider-reference-1",
      },
      headers: {
        "idempotency-key": "recovery-bundle-enroll-primary",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/recovery-bundles/enroll",
    }),
    res
  )

  assert.equal(res.statusCode, 200)
  const data = (res.body as DataResponse<Record<string, unknown>>).data
  assert.equal(data.recoveryBundleId, "rw_bundle_test_primary")
  assert.equal(data.dappUserUuid, dappUserUuid)
  assert.equal(data.providerKey, "cubid")
  assert.equal(data.status, "active")
  assert.equal(JSON.stringify(res.body).includes("bundle_material"), false)
  assert.equal(JSON.stringify(res.body).includes("ciphertext"), false)
  assert.equal(JSON.stringify(res.body).includes("wrapped_data_key"), false)
  assert.equal(JSON.stringify(res.body).includes("auth_tag"), false)
  assert.equal(supabase.recoverableWalletRecoveryBundles.length, 1)

  const storedBundle = supabase.recoverableWalletRecoveryBundles[0]
  assert.equal(
    storedBundle.encryption_key_id,
    "passport_recoverable_wallet_recovery_bundle_wrapping_key_v1"
  )
  assert.equal(storedBundle.encryption_algorithm, "aes-256-gcm-envelope")
  assert.notEqual(
    storedBundle.bundle_ciphertext,
    "recoverable-wallet-client-share"
  )
  assert.equal(
    String(storedBundle.bundle_ciphertext).includes(
      "recoverable-wallet-client-share"
    ),
    false
  )
})

test("Passport v3 recovery bundle status returns safe metadata and not enrolled state", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000261"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  const emptyRes = createApiResponse()
  await recoveryBundleStatusV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/recovery-bundles/status",
    }),
    emptyRes
  )

  assert.equal(emptyRes.statusCode, 200)
  assert.equal(
    (emptyRes.body as DataResponse<Record<string, unknown>>).data.status,
    "not_enrolled"
  )

  const enrollRes = createApiResponse()
  await enrollRecoveryBundleV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        bundle_material: "status-visible-client-share",
        dapp_user_uuid: dappUserUuid,
        provider_key: "cubid",
        recovery_bundle_id: "rw_bundle_status_visible",
      },
      headers: {
        "idempotency-key": "recovery-bundle-status-visible",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/recovery-bundles/enroll",
    }),
    enrollRes
  )

  const statusRes = createApiResponse()
  await recoveryBundleStatusV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        dapp_user_uuid: dappUserUuid,
        recovery_bundle_id: "rw_bundle_status_visible",
      },
      headers: {
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/recovery-bundles/status",
    }),
    statusRes
  )

  assert.equal(statusRes.statusCode, 200)
  const data = (statusRes.body as DataResponse<Record<string, unknown>>).data
  assert.equal(data.recoveryBundleId, "rw_bundle_status_visible")
  assert.equal(data.status, "active")
  assert.equal(JSON.stringify(statusRes.body).includes("bundle_ciphertext"), false)
  assert.equal(JSON.stringify(statusRes.body).includes("wrapped_data_key"), false)
  assert.equal(JSON.stringify(statusRes.body).includes("client-share"), false)
})

test("Passport v3 recovery bundle APIs reject cross-dapp users and replay idempotent enrollment", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000262"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setDappUser({
    dapp_id: 99,
    user_id: 9999,
    uuid: "00000000-0000-4000-8000-000000000263",
  })
  setPassportSupabaseForTests(supabase as never)

  const body = {
    api_key: apiKey,
    bundle_material: "idempotent-client-share",
    dapp_user_uuid: dappUserUuid,
    recovery_bundle_id: "rw_bundle_idempotent",
  }
  const makeReq = () =>
    createApiRequest({
      body,
      headers: {
        "idempotency-key": "recovery-bundle-idempotent",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/recovery-bundles/enroll",
    })

  const firstRes = createApiResponse()
  await enrollRecoveryBundleV3Handler(makeReq(), firstRes)
  const replayRes = createApiResponse()
  await enrollRecoveryBundleV3Handler(makeReq(), replayRes)

  assert.equal(firstRes.statusCode, 200)
  assert.equal(replayRes.statusCode, 200)
  assert.deepEqual(replayRes.body, firstRes.body)
  assert.equal(supabase.recoverableWalletRecoveryBundles.length, 1)

  const crossDappRes = createApiResponse()
  await enrollRecoveryBundleV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        bundle_material: "cross-dapp-client-share",
        dapp_user_uuid: "00000000-0000-4000-8000-000000000263",
      },
      headers: {
        "idempotency-key": "recovery-bundle-cross-dapp",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/recovery-bundles/enroll",
    }),
    crossDappRes
  )

  assert.equal(crossDappRes.statusCode, 404)
  assert.equal(
    (crossDappRes.body as { error: { code: string } }).error.code,
    "not_found"
  )
  assert.equal(supabase.recoverableWalletRecoveryBundles.length, 1)
})

test.skip("legacy Cubid account generation encrypted private keys and linked the triggering dapp user", async () => {
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

test.skip("legacy Cubid account generation rejected dapp users outside the authenticated app", async () => {
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

test.skip("legacy Cubid account generation supported Sui without exposing private keys", async () => {
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

  assert.equal(res.statusCode, 200)
  const body = res.body as DataResponse<Record<string, unknown>>
  assert.equal(body.data.chain, "sui")
  assert.equal(String(body.data.publicAddress).startsWith("0x"), true)
  assert.equal(JSON.stringify(res.body).includes("suiprivkey"), false)
  assert.equal(JSON.stringify(res.body).includes("ciphertext"), false)
  assert.equal(JSON.stringify(res.body).includes("private"), false)
  assert.equal(supabase.userAccounts.length, 1)
  assert.equal(supabase.userAccounts[0]?.chain_key, "sui")
  assert.equal(supabase.privateKeys.length, 1)
  assert.equal(supabase.privateKeys[0]?.chain_key, "sui")
  assert.equal(supabase.dappUserAccounts.length, 1)
})

test.skip("legacy Cubid account generation replayed Idempotency-Key writes", async () => {
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

test.skip("legacy Cubid account generation rejected idempotency conflicts and pending requests", async () => {
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

test.skip("legacy Cubid account generation cleaned up public rows on private-key failure", async () => {
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

test.skip("legacy Cubid account generation emitted safe wallet.created webhooks", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000057"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setSiwcSigningPolicy({
    dapp_id: 42,
    webhook_event_subscriptions: ["wallet.created"],
  })
  addSiwcWebhookSubscription(supabase, "wallet.created")
  setPassportSupabaseForTests(supabase as never)

  let deliveredBody = ""
  axios.post = (async (_url: string, body: unknown) => {
    deliveredBody = String(body)
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  const res = createApiResponse()
  await generateAccountV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "evm",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        "idempotency-key": "generate-wallet-created-webhook",
        origin: "https://passport.cubid.me",
        "x-request-id": "passport_wallet_created_webhook",
      },
      url: "/api/v3/accounts/generate",
    }),
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(supabase.webhookEvents.length, 1)
  assert.equal(supabase.webhookEventDeliveries[0]?.delivery_status, "succeeded")
  const payload = JSON.parse(deliveredBody) as Record<string, unknown>
  assert.equal(payload.eventType, "wallet.created")
  assert.equal(payload.requestId, "passport_wallet_created_webhook")
  assert.deepEqual(payload.subject, { dappUserUuid })
  assert.equal(
    (payload.data as Record<string, unknown>).accountId,
    (res.body as DataResponse<Record<string, unknown>>).data.accountId
  )
  assert.equal(JSON.stringify(payload).includes("private"), false)
  assert.equal(JSON.stringify(payload).includes("ciphertext"), false)
  assert.equal(JSON.stringify(payload).includes("wrapped"), false)
  assert.equal(JSON.stringify(payload).includes("human_subject_key"), false)
})

test.skip("legacy Cubid account generation skipped SIWC webhooks not enabled by policy", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000053"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setSiwcSigningPolicy({
    dapp_id: 42,
    webhook_event_subscriptions: [],
  })
  addSiwcWebhookSubscription(supabase, "wallet.created")
  setPassportSupabaseForTests(supabase as never)

  let delivered = false
  axios.post = (async () => {
    delivered = true
    return { data: "accepted", status: 202 }
  }) as typeof axios.post

  const res = createApiResponse()
  await generateAccountV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "evm",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        "idempotency-key": "generate-wallet-created-not-subscribed",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(delivered, false)
  assert.equal(supabase.webhookEvents.length, 0)
  assert.equal(supabase.webhookEventDeliveries.length, 0)
})

test.skip("legacy Cubid account generation recorded failed SIWC webhook delivery", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000054"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  supabase.setSiwcSigningPolicy({
    dapp_id: 42,
    webhook_event_subscriptions: ["wallet.created"],
  })
  addSiwcWebhookSubscription(supabase, "wallet.created")
  setPassportSupabaseForTests(supabase as never)
  axios.post = (async () => {
    throw {
      response: {
        data: { error: "down" },
        status: 503,
      },
    }
  }) as typeof axios.post

  const res = createApiResponse()
  await generateAccountV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "evm",
        dapp_user_uuid: dappUserUuid,
      },
      headers: {
        "idempotency-key": "generate-wallet-created-failed-webhook",
        origin: "https://passport.cubid.me",
      },
      url: "/api/v3/accounts/generate",
    }),
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(supabase.webhookEventDeliveries.length, 1)
  assert.equal(supabase.webhookEventDeliveries[0]?.delivery_status, "failed")
  assert.equal(supabase.webhookEventDeliveries[0]?.error_category, "server_error")
})

test("Passport v3 account list returns dapp-user-visible metadata without secret material", async () => {
  const supabase = new MockPassportSupabase()
  const apiKey = addDappAuth(supabase)
  const dappUserUuid = "00000000-0000-4000-8000-000000000055"
  supabase.setDappUser({ dapp_id: 42, user_id: 1234, uuid: dappUserUuid })
  setPassportSupabaseForTests(supabase as never)

  addLegacyVisibleAccount(supabase, {
    chain: "solana",
    dappUserUuid,
    id: "00000000-0000-4000-8000-000000000155",
    publicAddress: "solana-visible-account",
  })

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

  addLegacyVisibleAccount(supabase, {
    chain: "evm",
    dappUserUuid,
    id: "00000000-0000-4000-8000-000000000159",
    publicAddress: "0x0000000000000000000000000000000000000159",
  })
  addLegacyVisibleAccount(supabase, {
    chain: "sui",
    dappUserUuid,
    id: "00000000-0000-4000-8000-000000000160",
    publicAddress: "0x0000000000000000000000000000000000000160",
  })

  const filteredRes = createApiResponse()
  await listAccountsV3Handler(
    createApiRequest({
      body: {
        api_key: apiKey,
        chain: "sui",
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
  assert.equal(accounts[0].chain, "sui")
  assert.equal(String(accounts[0].publicAddress).startsWith("0x"), true)
  assert.equal(JSON.stringify(filteredRes.body).includes("private"), false)
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
  supabase.appScopedSubjects.push({
    app_identifier: "dapp:42",
    app_scoped_subject: "app_subject_610",
    dapp_id: 42,
    dapp_user_uuid: dappUserUuid,
    id: "subject_610",
    status: "active",
  })
  supabase.selectiveDisclosureGrants.push({
    app_scoped_subject_id: "subject_610",
    dapp_id: 42,
    granted_claims: [
      {
        claim: "stamp:email",
        dataClass: "identity",
        purpose: "Allow Page stamp sharing",
        required: false,
      },
    ],
    granted_scopes: ["cubid:stamps"],
    id: "grant_610",
    status: "active",
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
  supabase.appScopedSubjects.push({
    app_identifier: "dapp:42",
    app_scoped_subject: "app_subject_630",
    dapp_id: 42,
    dapp_user_uuid: dappUserUuid,
    id: "subject_630",
    status: "active",
  })
  supabase.selectiveDisclosureGrants.push({
    app_scoped_subject_id: "subject_630",
    dapp_id: 42,
    granted_claims: [
      {
        claim: "stamp:email",
        dataClass: "identity",
        purpose: "Allow Page stamp sharing",
        required: false,
      },
    ],
    granted_scopes: ["cubid:stamps"],
    id: "grant_630",
    status: "active",
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
