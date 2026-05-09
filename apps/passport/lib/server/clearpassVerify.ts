import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { ApiSecurityError } from "@cubid/auth/server"
import { getOptionalEnv, getRequiredSecret } from "@cubid/config"

import { passportDataCommands } from "./passportData"
import { getPassportSupabase } from "./supabase"

const CLEARPASS_STAMP_TYPE = "clearpass_verify"
const SESSION_TTL_MS = 10 * 60 * 1000

type SignedTokenPayload = Record<string, unknown> & {
  appId?: string
  exp?: number
  redirectUri?: string
  userId?: string
  verificationId?: string
}

type ClearPassSessionRow = {
  dapp_id: number
  dapp_user_uuid: string
  expires_at: string
  id: string
  page_id: number
  request_id?: string | null
  return_to?: string | null
  status: string
  user_id: number
}

type DappUserRow = {
  dapp_id: number
  user_id: number
  uuid: string
}

type DappPageRow = {
  dapp_id: number
  id: number
}

const encodeJson = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url")

const decodeJson = (value: string) =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SignedTokenPayload

const sign = (message: string, secret: string) =>
  createHmac("sha256", secret).update(message).digest("base64url")

export const createClearPassSignedToken = (
  payload: SignedTokenPayload,
  secret: string
) => {
  if (secret.length < 32) {
    throw new Error("CLEARPASS_VERIFY_TOKEN_SECRET must be at least 32 characters")
  }

  const body = encodeJson(payload)
  return `${body}.${sign(body, secret)}`
}

export const verifyClearPassSignedToken = (
  token: string,
  secret: string,
  now = Date.now()
) => {
  if (secret.length < 32) {
    return null
  }

  const [body, signature] = token.split(".")
  if (!body || !signature) {
    return null
  }

  const expected = sign(body, secret)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signature)

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null
  }

  const payload = decodeJson(body)
  return typeof payload.exp === "number" && payload.exp >= now ? payload : null
}

const normalizeOrigin = (value: string) => value.replace(/\/+$/, "")

const getClearPassConfig = () => {
  const passportOrigin = normalizeOrigin(
    getOptionalEnv("PASSPORT_PUBLIC_ORIGIN") ?? "https://passport.cubid.me"
  )
  return {
    clearPassOrigin: normalizeOrigin(
      getOptionalEnv("CLEARPASS_VERIFY_ORIGIN") ?? "https://scan.clearpass.app"
    ),
    partnerAppId: getOptionalEnv("CLEARPASS_VERIFY_PARTNER_APP_ID") ?? "cubid",
    passportOrigin,
    tokenSecret: getRequiredSecret("CLEARPASS_VERIFY_TOKEN_SECRET", {
      minLength: 32,
    }),
  }
}

const asNumber = (value: unknown, field: string) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiSecurityError(400, "invalid_request", `${field} is invalid.`)
  }
  return parsed
}

const asUuid = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiSecurityError(400, "invalid_request", "uid is required.")
  }
  return value.trim()
}

const buildReturnTo = (passportOrigin: string, input: {
  pageId: number
  uid: string
}) => {
  const url = new URL("/allow", passportOrigin)
  url.searchParams.set("uid", input.uid)
  url.searchParams.set("page_id", String(input.pageId))
  url.searchParams.set("stamp_type", CLEARPASS_STAMP_TYPE)
  url.searchParams.set("clearpass", "success")
  return url.toString()
}

const sanitizeDerivedClaims = (payload: SignedTokenPayload) => {
  const source =
    typeof payload.derivedClaims === "object" && payload.derivedClaims !== null
      ? payload.derivedClaims as Record<string, unknown>
      : typeof payload.claims === "object" && payload.claims !== null
        ? payload.claims as Record<string, unknown>
        : payload

  const legalName = stringFrom(source.legalName) ?? stringFrom(source.fullName) ?? stringFrom(source.name)
  const country = stringFrom(source.country) ?? stringFrom(source.countryCode)
  const state = stringFrom(source.state) ?? stringFrom(source.region)
  const age = numberFrom(source.age)
  const isOver18 = booleanFrom(source.isOver18) ?? (age === null ? null : age >= 18)
  const isOver21 = booleanFrom(source.isOver21) ?? (age === null ? null : age >= 21)

  return Object.fromEntries(
    Object.entries({
      age,
      country,
      isOver18,
      isOver21,
      legalName,
      state,
    }).filter((entry) => entry[1] !== null && entry[1] !== undefined)
  )
}

const stringFrom = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null

const numberFrom = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const booleanFrom = (value: unknown) =>
  typeof value === "boolean" ? value : null

const loadDappUserAndPage = async (input: { pageId: number; uid: string }) => {
  const supabase = getPassportSupabase()
  const [dappUserResponse, pageResponse] = await Promise.all([
    supabase
      .from("dapp_users")
      .select("uuid,dapp_id,user_id")
      .eq("uuid", input.uid)
      .maybeSingle(),
    supabase
      .from("dapp_pages")
      .select("id,dapp_id")
      .eq("id", input.pageId)
      .maybeSingle(),
  ])

  if (dappUserResponse.error) {
    throw dappUserResponse.error
  }

  if (pageResponse.error) {
    throw pageResponse.error
  }

  const dappUser = dappUserResponse.data as DappUserRow | null
  const page = pageResponse.data as DappPageRow | null

  if (!dappUser || !page || String(dappUser.dapp_id) !== String(page.dapp_id)) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "ClearPass verification request was not found."
    )
  }

  return { dappUser, page }
}

export const createClearPassVerificationRedirect = async (input: {
  pageId: number | string
  requestId?: string | null
  uid: string
}) => {
  const pageId = asNumber(input.pageId, "page_id")
  const uid = asUuid(input.uid)
  const config = getClearPassConfig()
  const { dappUser, page } = await loadDappUserAndPage({ pageId, uid })
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const returnTo = buildReturnTo(config.passportOrigin, { pageId, uid })
  const callbackUrl = new URL("/verify/clearpass/callback", config.passportOrigin)
  const supabase = getPassportSupabase()

  const { data: session, error } = await supabase
    .from("clearpass_verification_sessions")
    .insert({
      dapp_id: dappUser.dapp_id,
      dapp_user_uuid: dappUser.uuid,
      expires_at: expiresAt.toISOString(),
      page_id: page.id,
      request_id: input.requestId ?? null,
      return_to: returnTo,
      user_id: dappUser.user_id,
    })
    .select("*")
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!session) {
    throw new Error("Failed to create ClearPass verification session.")
  }

  const sessionRow = session as ClearPassSessionRow
  const startToken = createClearPassSignedToken(
    {
      appId: config.partnerAppId,
      exp: expiresAt.getTime(),
      redirectUri: callbackUrl.toString(),
      userId: sessionRow.id,
    },
    config.tokenSecret
  )
  const redirectUrl = new URL("/", config.clearPassOrigin)
  redirectUrl.searchParams.set("start_token", startToken)

  return {
    redirectUrl: redirectUrl.toString(),
    sessionId: sessionRow.id,
  }
}

const loadPendingSession = async (sessionId: string) => {
  const { data, error } = await getPassportSupabase()
    .from("clearpass_verification_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const session = data as ClearPassSessionRow | null
  if (
    !session ||
    session.status !== "pending" ||
    new Date(session.expires_at).getTime() < Date.now()
  ) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "ClearPass verification session is invalid or expired."
    )
  }

  return session
}

export const completeClearPassVerification = async (input: {
  clearpassSession: string
  requestId?: string | null
  verificationId?: string | null
}) => {
  const config = getClearPassConfig()
  const payload = verifyClearPassSignedToken(
    input.clearpassSession,
    config.tokenSecret
  )

  if (!payload?.userId || payload.appId !== config.partnerAppId) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "ClearPass verification token is invalid."
    )
  }

  if (
    input.verificationId &&
    payload.verificationId &&
    input.verificationId !== payload.verificationId
  ) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "ClearPass verification id does not match the signed token."
    )
  }

  const session = await loadPendingSession(payload.userId)
  const verificationId = payload.verificationId ?? input.verificationId

  if (!verificationId) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "ClearPass verification id is required."
    )
  }

  const derivedClaims = sanitizeDerivedClaims(payload)
  const verifiedAt = new Date().toISOString()
  const stampData = {
    assuranceLevel: "clearpass_kyc_v1",
    derivedClaims,
    identity: stringFrom(derivedClaims.legalName) ?? "ClearPass verified",
    provider: "clearpass",
    status: "approved",
    uniquevalue: verificationId,
    verificationId,
    verifiedAt,
  }

  const insertedStamp = await passportDataCommands.createStamp({
    appId: Number(session.dapp_id),
    isAuth: false,
    stampData,
    stampType: CLEARPASS_STAMP_TYPE,
    userId: Number(session.user_id),
    userUuid: session.dapp_user_uuid,
  })

  const { error: updateError } = await getPassportSupabase()
    .from("clearpass_verification_sessions")
    .update({
      consumed_at: verifiedAt,
      derived_claims: derivedClaims,
      metadata: {
        stamp_id: (insertedStamp as Record<string, unknown> | null)?.id ?? null,
      },
      provider_status: "approved",
      provider_verification_id: verificationId,
      request_id: input.requestId ?? session.request_id ?? null,
      status: "verified",
      updated_at: verifiedAt,
    })
    .eq("id", session.id)
    .eq("status", "pending")

  if (updateError) {
    throw updateError
  }

  return {
    returnTo: session.return_to ?? `${config.passportOrigin}/`,
    stamp: insertedStamp,
  }
}

export const clearPassVerify = {
  createClearPassVerificationRedirect,
  completeClearPassVerification,
}
