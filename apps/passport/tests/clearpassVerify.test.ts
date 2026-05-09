import assert from "node:assert/strict"
import test from "node:test"

import {
  completeClearPassVerification,
  createClearPassSignedToken,
  createClearPassVerificationRedirect,
} from "../lib/server/clearpassVerify"
import { setPassportSupabaseForTests } from "../lib/server/supabase"
import { MockPassportSupabase } from "./helpers"

const tokenSecret = "clearpass-test-token-secret-with-32-chars"

const setup = () => {
  process.env.CLEARPASS_VERIFY_TOKEN_SECRET = tokenSecret
  process.env.CLEARPASS_VERIFY_ORIGIN = "https://scan.clearpass.app"
  process.env.CLEARPASS_VERIFY_PARTNER_APP_ID = "cubid"
  process.env.PASSPORT_PUBLIC_ORIGIN = "https://passport.cubid.me"
  process.env.PASSPORT_APP_SCOPED_SUBJECT_SECRET =
    "test-app-scoped-subject-secret-with-32-chars"

  const supabase = new MockPassportSupabase()
  supabase.setDapp({ appname: "Test App", id: 42 })
  supabase.setDappPage({ dapp_id: 42, id: 777 })
  supabase.setDappUser({
    dapp_id: 42,
    user_id: 1234,
    uuid: "11111111-1111-4111-8111-111111111111",
  })
  setPassportSupabaseForTests(supabase as never)
  return supabase
}

test("ClearPass launcher creates a pending session and signed start token", async () => {
  const supabase = setup()

  const result = await createClearPassVerificationRedirect({
    pageId: 777,
    requestId: "request_123",
    uid: "11111111-1111-4111-8111-111111111111",
  })

  assert.equal(supabase.clearPassVerificationSessions.length, 1)
  const session = supabase.clearPassVerificationSessions[0]
  assert.equal(session?.dapp_id, 42)
  assert.equal(session?.user_id, 1234)
  assert.equal(session?.status, "pending")

  const redirectUrl = new URL(result.redirectUrl)
  assert.equal(redirectUrl.origin, "https://scan.clearpass.app")
  const startToken = redirectUrl.searchParams.get("start_token")
  assert.ok(startToken)
  const [body] = startToken.split(".")
  const payload = JSON.parse(Buffer.from(body ?? "", "base64url").toString("utf8"))
  assert.equal(payload.appId, "cubid")
  assert.equal(payload.tokenUse, "clearpass_start")
  assert.equal(payload.userId, session?.id)
  assert.equal(payload.redirectUri, "https://passport.cubid.me/verify/clearpass/callback")
})

test("ClearPass completion mints a sanitized stamp and disclosure grant", async () => {
  const supabase = setup()
  const { sessionId } = await createClearPassVerificationRedirect({
    pageId: 777,
    uid: "11111111-1111-4111-8111-111111111111",
  })
  const clearpassSession = createClearPassSignedToken(
    {
      appId: "cubid",
      claims: {
        country: "CA",
        documentImage: "must-not-store",
        fullName: "Ada Lovelace",
        state: "ON",
      },
      exp: Date.now() + 60_000,
      redirectUri: "https://passport.cubid.me/verify/clearpass/callback",
      status: "approved",
      tokenUse: "clearpass_completion",
      userId: sessionId,
      verificationId: "ver_clearpass_123",
    },
    tokenSecret
  )

  const result = await completeClearPassVerification({
    clearpassSession,
    verificationId: "ver_clearpass_123",
  })

  assert.equal(result.returnTo, "https://passport.cubid.me/allow?uid=11111111-1111-4111-8111-111111111111&page_id=777&stamp_type=clearpass_verify&clearpass=success")
  assert.equal(supabase.stamps.length, 1)
  const stamp = supabase.stamps[0]
  assert.equal(stamp?.stamptype, 71)
  const stampData = (stamp?.stamp_json as { stampData?: Record<string, unknown> })?.stampData
  assert.equal(stampData?.provider, "clearpass")
  assert.equal(stampData?.verificationId, "ver_clearpass_123")
  assert.deepEqual(stampData?.derivedClaims, {
    country: "CA",
    legalName: "Ada Lovelace",
    state: "ON",
  })
  assert.equal(JSON.stringify(stampData).includes("documentImage"), false)
  assert.equal(supabase.stampPermissions.length, 1)
  assert.equal(supabase.selectiveDisclosureGrants.length, 1)
  assert.equal(
    supabase.selectiveDisclosureGrants[0]?.granted_claims &&
      JSON.stringify(supabase.selectiveDisclosureGrants[0]?.granted_claims).includes("stamp:clearpass_verify"),
    true
  )
  assert.equal(supabase.clearPassVerificationSessions[0]?.status, "verified")
})

test("ClearPass completion rejects invalid and replayed sessions", async () => {
  const supabase = setup()
  const { sessionId } = await createClearPassVerificationRedirect({
    pageId: 777,
    uid: "11111111-1111-4111-8111-111111111111",
  })
  const clearpassSession = createClearPassSignedToken(
    {
      appId: "cubid",
      exp: Date.now() + 60_000,
      status: "approved",
      tokenUse: "clearpass_completion",
      userId: sessionId,
      verificationId: "ver_replay",
    },
    tokenSecret
  )

  await completeClearPassVerification({
    clearpassSession,
    verificationId: "ver_replay",
  })

  await assert.rejects(
    () =>
      completeClearPassVerification({
        clearpassSession,
        verificationId: "ver_replay",
      }),
    /invalid or expired/
  )

  assert.equal(supabase.stamps.length, 1)
})

test("ClearPass completion rejects launcher tokens and unsigned verification ids", async () => {
  const supabase = setup()
  const { redirectUrl } = await createClearPassVerificationRedirect({
    pageId: 777,
    uid: "11111111-1111-4111-8111-111111111111",
  })
  const startToken = new URL(redirectUrl).searchParams.get("start_token")
  assert.ok(startToken)

  await assert.rejects(
    () =>
      completeClearPassVerification({
        clearpassSession: startToken,
        verificationId: "unsigned_verification_id",
      }),
    /token is invalid/
  )

  assert.equal(supabase.stamps.length, 0)
})

test("ClearPass completion rejects non-approved provider tokens", async () => {
  const supabase = setup()
  const { sessionId } = await createClearPassVerificationRedirect({
    pageId: 777,
    uid: "11111111-1111-4111-8111-111111111111",
  })
  const clearpassSession = createClearPassSignedToken(
    {
      appId: "cubid",
      exp: Date.now() + 60_000,
      status: "pending",
      tokenUse: "clearpass_completion",
      userId: sessionId,
      verificationId: "ver_pending",
    },
    tokenSecret
  )

  await assert.rejects(
    () =>
      completeClearPassVerification({
        clearpassSession,
        verificationId: "ver_pending",
      }),
    /not approved/
  )

  assert.equal(supabase.stamps.length, 0)
})

test("ClearPass launcher rejects cross-dapp page and user pairs", async () => {
  setup()

  await assert.rejects(
    () =>
      createClearPassVerificationRedirect({
        pageId: 777,
        uid: "missing-user",
      }),
    /not found/i
  )
})
