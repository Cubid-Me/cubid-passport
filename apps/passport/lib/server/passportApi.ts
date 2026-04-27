import { randomUUID } from "node:crypto"

import {
  ApiRateLimitError,
  ApiSecurityError,
  assertAllowedMethod,
  assertAllowedOrigin,
  buildAppErrorEnvelope,
  createCorsHeaders,
  getBearerToken,
  parseDappApiKeyPrefix,
  getRequestIdFromNextRequest,
  validateWithSchema,
  verifyDappApiKey,
  z,
  type ZodTypeAny,
} from "@cubid/auth/server"
import {
  getCsvEnv,
  getRequiredEnv,
} from "@cubid/config"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { DecodedIdToken } from "firebase-admin/auth"
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"

import { getPassportFirebaseAdminAuth } from "./firebaseAdmin"
import { getPassportSupabase } from "./supabase"

type PassportActor = "anonymous" | "dapp" | "internal" | "user"
type PassportRateLimitGroup =
  | "passport_dapp_mutation"
  | "passport_dapp_read"
  | "passport_internal"
  | "passport_otp"
  | "passport_user_mutation"
  | "passport_user_read"

type PassportRateLimitTier = "internal" | "starter" | "trusted"

type PassportRouteOptions<TSchema extends ZodTypeAny | undefined> = {
  actor: PassportActor
  allowedMethods?: string[]
  allowMissingOrigin?: boolean
  bodySchema?: TSchema
  rateLimitGroup: PassportRateLimitGroup
  route: string
}

type PassportRouteBody<TSchema extends ZodTypeAny | undefined> =
  TSchema extends ZodTypeAny ? z.infer<TSchema> : undefined

export type PassportDappRecord = {
  id: number
  name?: string | null
  [key: string]: unknown
}

type PassportDappApiKeyRecord = {
  dapp_id: number
  id: number
  key_hash: string
  key_prefix: string
  status: string
}

type PassportBaseContext = {
  actorIdentifier: string | null
  bearerToken: string | null
  ip: string | null
  method: string
  origin: string | null
  requestId: string
  supabase: SupabaseClient
}

export type PassportAnonymousContext = PassportBaseContext & {
  actorType: "anonymous"
}

export type PassportUserContext = PassportBaseContext & {
  actorIdentifier: string
  actorType: "user"
  firebaseToken: DecodedIdToken
}

export type PassportDappContext = PassportBaseContext & {
  actorIdentifier: string
  actorType: "dapp"
  dapp: PassportDappRecord
}

export type PassportInternalContext = PassportBaseContext & {
  actorIdentifier: string
  actorType: "internal"
}

export type PassportRouteContext<TActor extends PassportActor> =
  TActor extends "user"
    ? PassportUserContext
    : TActor extends "dapp"
      ? PassportDappContext
      : TActor extends "internal"
        ? PassportInternalContext
        : PassportAnonymousContext

type ResponseState = {
  corsHeaders: Record<string, string>
  requestId: string
}

const RESPONSE_STATE_KEY = "__cubidPassportApiState"
const WINDOW_MS = 60 * 1000

const PASSPORT_RATE_LIMITS: Record<
  PassportRateLimitGroup,
  Record<PassportRateLimitTier, number>
> = {
  passport_user_read: { starter: 30, trusted: 120, internal: 600 },
  passport_user_mutation: { starter: 10, trusted: 60, internal: 300 },
  passport_dapp_read: { starter: 60, trusted: 180, internal: 900 },
  passport_dapp_mutation: { starter: 20, trusted: 90, internal: 360 },
  passport_otp: { starter: 5, trusted: 10, internal: 60 },
  passport_internal: { starter: 0, trusted: 0, internal: 600 },
}

const getAllowedOrigins = () => getCsvEnv("PASSPORT_CORS_ALLOWED_ORIGINS")

const logServerError = (error: unknown) => {
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    return
  }

  try {
    process.stderr.write(`${JSON.stringify(error)}\n`)
  } catch {
    process.stderr.write(`${String(error)}\n`)
  }
}

const getResponseState = (
  res: NextApiResponse
): ResponseState | undefined => {
  return (res as NextApiResponse & { [RESPONSE_STATE_KEY]?: ResponseState })[
    RESPONSE_STATE_KEY
  ]
}

const setResponseState = (res: NextApiResponse, state: ResponseState) => {
  ;(res as NextApiResponse & { [RESPONSE_STATE_KEY]?: ResponseState })[
    RESPONSE_STATE_KEY
  ] = state
  res.setHeader("X-Request-Id", state.requestId)
  for (const [key, value] of Object.entries(state.corsHeaders)) {
    res.setHeader(key, value)
  }
}

const ensureResponseState = (req: NextApiRequest, res: NextApiResponse) => {
  const existingState = getResponseState(res)

  if (existingState) {
    return existingState
  }

  const state = {
    corsHeaders: {},
    requestId: getRequestIdFromNextRequest(req, "passport"),
  }
  setResponseState(res, state)
  return state
}

const getParsedBody = (req: NextApiRequest) => {
  if (typeof req.body === "string") {
    if (!req.body.trim()) {
      return {}
    }

    try {
      return JSON.parse(req.body)
    } catch {
      throw new ApiSecurityError(
        400,
        "invalid_request",
        "Request body must be valid JSON."
      )
    }
  }

  return req.body ?? {}
}

const getIpAddress = (req: NextApiRequest) => {
  const forwardedFor = req.headers["x-forwarded-for"]

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(",")[0]?.trim() ?? null
  }

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() ?? null
  }

  const realIp = req.headers["x-real-ip"]

  if (Array.isArray(realIp)) {
    return realIp[0]?.trim() ?? null
  }

  return typeof realIp === "string" ? realIp.trim() : null
}

const getSecurityEventType = (error: ApiSecurityError) => {
  switch (error.code) {
    case "invalid_request":
      return "validation.failed"
    case "method_not_allowed":
      return "method.denied"
    case "origin_not_allowed":
    case "origin_required":
      return "origin.denied"
    case "rate_limit_exceeded":
      return "rate_limit.denied"
    case "forbidden":
      return "authorization.denied"
    case "unauthorized":
      return "authentication.denied"
    default:
      return "request.denied"
  }
}

const logSecurityEvent = async (input: {
  actorIdentifier?: string | null
  actorType: string
  details?: Record<string, unknown>
  eventType: string
  outcome: "failure" | "success"
  requestId: string
  route: string
}) => {
  const { error } = await getPassportSupabase().from("api_security_events").insert({
    actor_identifier: input.actorIdentifier ?? null,
    actor_type: input.actorType,
    details: input.details ?? {},
    event_id: `api_event_${randomUUID().replace(/-/g, "")}`,
    event_type: input.eventType,
    outcome: input.outcome,
    request_id: input.requestId,
    route: input.route,
  })

  if (error) {
    logServerError(error)
  }
}

const createBucketKey = (route: string, key: string, windowStartMs: number) => {
  return `${route}:${key}:${windowStartMs}`
}

const getRateLimitTier = (actorType: PassportActor): PassportRateLimitTier => {
  switch (actorType) {
    case "internal":
      return "internal"
    case "user":
      return "trusted"
    default:
      return "starter"
  }
}

const getRateLimitKey = (
  actorType: PassportActor,
  actorIdentifier: string | null,
  req: NextApiRequest
) => {
  return actorIdentifier || getIpAddress(req) || actorType
}

const enforceRateLimit = async (input: {
  actorIdentifier: string | null
  actorType: PassportActor
  requestId: string
  req: NextApiRequest
  route: PassportRateLimitGroup
}) => {
  const tier = getRateLimitTier(input.actorType)
  const limit = PASSPORT_RATE_LIMITS[input.route][tier]

  if (limit <= 0) {
    throw new ApiSecurityError(
      403,
      "forbidden",
      "This route is not available to the current actor."
    )
  }

  const key = getRateLimitKey(input.actorType, input.actorIdentifier, input.req)
  const now = Date.now()
  const windowStartMs = now - (now % WINDOW_MS)
  const expiresAt = new Date(windowStartMs + WINDOW_MS)
  const bucketKey = createBucketKey(input.route, key, windowStartMs)
  const supabase = getPassportSupabase()

  const { data: existingBucket, error: selectError } = await supabase
    .from("api_rate_limit_buckets")
    .select("bucket_key,count")
    .eq("bucket_key", bucketKey)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  const nextCount = (existingBucket?.count ?? 0) + 1

  if (nextCount > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStartMs + WINDOW_MS - now) / 1000)
    )

    await logSecurityEvent({
      actorIdentifier: input.actorIdentifier,
      actorType: input.actorType,
      details: {
        key,
        limit,
        route: input.route,
        tier,
      },
      eventType: "rate_limit.denied",
      outcome: "failure",
      requestId: input.requestId,
      route: input.route,
    })

    throw new ApiRateLimitError(retryAfterSeconds)
  }

  const { error: upsertError } = await supabase
    .from("api_rate_limit_buckets")
    .upsert({
      bucket_key: bucketKey,
      count: nextCount,
      expires_at: expiresAt.toISOString(),
      limit_key: key,
      metadata: {
        actorIdentifier: input.actorIdentifier,
        actorType: input.actorType,
      },
      route: input.route,
      tier,
      updated_at: new Date(now).toISOString(),
      window_start: new Date(windowStartMs).toISOString(),
    })

  if (upsertError) {
    throw upsertError
  }
}

const getInternalApiToken = () => getRequiredEnv("PASSPORT_INTERNAL_API_TOKEN")

const requireUser = async (
  req: NextApiRequest,
  requestId: string
): Promise<PassportUserContext> => {
  const bearerToken = getBearerToken(req)

  if (!bearerToken) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Missing Firebase bearer token."
    )
  }

  try {
    const firebaseToken = await getPassportFirebaseAdminAuth().verifyIdToken(
      bearerToken
    )

    if (!firebaseToken.uid) {
      throw new ApiSecurityError(
        401,
        "unauthorized",
        "Firebase token is missing a stable subject."
      )
    }

    return {
      actorIdentifier: firebaseToken.uid,
      actorType: "user",
      bearerToken,
      firebaseToken,
      ip: getIpAddress(req),
      method: req.method ?? "GET",
      origin: typeof req.headers.origin === "string" ? req.headers.origin : null,
      requestId,
      supabase: getPassportSupabase(),
    }
  } catch (error) {
    if (error instanceof ApiSecurityError) {
      throw error
    }

    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Invalid Firebase bearer token."
    )
  }
}

const DAPP_CREDENTIAL_SCHEMA = z.object({
  apikey: z.string().min(1).optional(),
  dapp_id: z.union([z.number(), z.string().min(1)]).optional(),
  id_to_read_from: z.string().min(1).optional(),
})

export const resolvePassportDappFromApiKey = async (
  apiKey: string,
  expectedDappId?: number | string
) => {
  const keyPrefix = parseDappApiKeyPrefix(apiKey)

  if (!keyPrefix) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Invalid dapp API key."
    )
  }

  const supabase = getPassportSupabase()
  const { data: apiKeyRow, error: apiKeyError } = await supabase
    .from("dapp_api_keys")
    .select("*")
    .eq("key_prefix", keyPrefix)
    .eq("status", "active")
    .maybeSingle()

  if (apiKeyError) {
    throw apiKeyError
  }

  if (
    !apiKeyRow ||
    !verifyDappApiKey(apiKey, String(apiKeyRow.key_hash ?? ""))
  ) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Invalid dapp API key."
    )
  }

  const keyRecord = apiKeyRow as PassportDappApiKeyRecord
  const { data: dappRow, error: dappError } = await supabase
    .from("dapps")
    .select("*")
    .eq("id", keyRecord.dapp_id)
    .maybeSingle()

  if (dappError) {
    throw dappError
  }

  if (!dappRow) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Invalid dapp API key."
    )
  }

  if (
    expectedDappId !== undefined &&
    String(expectedDappId) !== String(dappRow.id)
  ) {
    throw new ApiSecurityError(
      403,
      "forbidden",
      "Dapp identifier does not match the provided API key."
    )
  }

  void supabase
    .from("dapp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)

  return dappRow as PassportDappRecord
}

const requireDapp = async (
  req: NextApiRequest,
  requestId: string
): Promise<PassportDappContext> => {
  const parsedBody = getParsedBody(req)
  const credentials = validateWithSchema(parsedBody, DAPP_CREDENTIAL_SCHEMA)
  const apiKey =
    credentials.apikey ??
    credentials.id_to_read_from ??
    (typeof credentials.dapp_id === "string" ? credentials.dapp_id : null)

  if (!apiKey) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Missing dapp API key."
    )
  }

  const expectedDappId =
    credentials.apikey || credentials.id_to_read_from
      ? credentials.dapp_id
      : undefined
  const data = await resolvePassportDappFromApiKey(apiKey, expectedDappId)

  return {
    actorIdentifier: String(data.id),
    actorType: "dapp",
    bearerToken: null,
    dapp: data as PassportDappRecord,
    ip: getIpAddress(req),
    method: req.method ?? "GET",
    origin: typeof req.headers.origin === "string" ? req.headers.origin : null,
    requestId,
    supabase: getPassportSupabase(),
  }
}

const requireInternal = async (
  req: NextApiRequest,
  requestId: string
): Promise<PassportInternalContext> => {
  const bearerToken = getBearerToken(req)

  if (!bearerToken || bearerToken !== getInternalApiToken()) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Missing or invalid internal bearer token."
    )
  }

  return {
    actorIdentifier: "passport_internal",
    actorType: "internal",
    bearerToken,
    ip: getIpAddress(req),
    method: req.method ?? "GET",
    origin: typeof req.headers.origin === "string" ? req.headers.origin : null,
    requestId,
    supabase: getPassportSupabase(),
  }
}

export const getPassportRequestId = (req: NextApiRequest) => {
  return getRequestIdFromNextRequest(req, "passport")
}

export const sendPassportApiError = (
  req: NextApiRequest,
  res: NextApiResponse,
  error: unknown,
  fallbackMessage: string,
  route?: string
) => {
  const state = ensureResponseState(req, res)
  const routeName = route ?? req.url ?? "passport.route"
  const envelope = buildAppErrorEnvelope(
    state.requestId,
    error,
    fallbackMessage
  )

  if (error instanceof ApiSecurityError) {
    if (route) {
      void logSecurityEvent({
        actorIdentifier: null,
        actorType: "anonymous",
        details: error.details,
        eventType: getSecurityEventType(error),
        outcome: "failure",
        requestId: state.requestId,
        route: routeName,
      })
    }
  }

  if (!(error instanceof ApiSecurityError)) {
    logServerError(error)
  }

  for (const [key, value] of Object.entries(envelope.headers)) {
    res.setHeader(key, value)
  }

  return res.status(envelope.statusCode).json(envelope.body)
}

export const createPassportOptionsHandler = (
  allowedMethods: string[],
  allowBrowserCors: boolean
): NextApiHandler => {
  return async (req, res) => {
    const state = ensureResponseState(req, res)

    if (allowBrowserCors) {
      const origin = assertAllowedOrigin(
        typeof req.headers.origin === "string" ? req.headers.origin : null,
        getAllowedOrigins()
      )

      state.corsHeaders = createCorsHeaders(origin, allowedMethods)
      setResponseState(res, state)
    }

    res.status(200).end()
  }
}

export async function handlePassportRoute<
  TActor extends PassportActor,
  TSchema extends ZodTypeAny | undefined,
>(
  req: NextApiRequest,
  res: NextApiResponse,
  options: PassportRouteOptions<TSchema> & { actor: TActor },
  handler: (input: {
    body: PassportRouteBody<TSchema>
    context: PassportRouteContext<TActor>
  }) => Promise<void>
) {
  const state = ensureResponseState(req, res)
  const allowedMethods = options.allowedMethods ?? ["POST"]

  try {
    if (req.method === "OPTIONS") {
      if (options.actor === "internal") {
        return res.status(403).json({
          error: {
            code: "origin_not_allowed",
            message: "Origin is not allowed for this API.",
            requestId: state.requestId,
          },
        })
      }

      const origin = assertAllowedOrigin(
        typeof req.headers.origin === "string" ? req.headers.origin : null,
        getAllowedOrigins(),
        {
          allowMissingOrigin: options.allowMissingOrigin ?? true,
        }
      )
      state.corsHeaders = createCorsHeaders(origin, allowedMethods)
      setResponseState(res, state)
      return res.status(200).end()
    }

    assertAllowedMethod(req.method ?? "GET", allowedMethods)

    const origin = typeof req.headers.origin === "string" ? req.headers.origin : null
    const allowBrowserCors = options.actor !== "internal"
    const allowedOrigin = allowBrowserCors
      ? assertAllowedOrigin(origin, getAllowedOrigins(), {
          allowMissingOrigin: options.allowMissingOrigin ?? true,
        })
      : assertAllowedOrigin(origin, [], { allowMissingOrigin: true })

    state.corsHeaders = allowBrowserCors
      ? createCorsHeaders(allowedOrigin, allowedMethods)
      : {}
    setResponseState(res, state)

    const parsedBody = getParsedBody(req)
    const body = options.bodySchema
      ? (validateWithSchema(parsedBody, options.bodySchema) as PassportRouteBody<TSchema>)
      : (undefined as PassportRouteBody<TSchema>)

    const contextBase = {
      ip: getIpAddress(req),
      requestId: state.requestId,
      supabase: getPassportSupabase(),
    }

    let context:
      | PassportAnonymousContext
      | PassportUserContext
      | PassportDappContext
      | PassportInternalContext

    switch (options.actor) {
      case "user":
        context = await requireUser(req, state.requestId)
        break
      case "dapp":
        context = await requireDapp(req, state.requestId)
        break
      case "internal":
        context = await requireInternal(req, state.requestId)
        break
      default:
        context = {
          actorIdentifier: null,
          actorType: "anonymous",
          bearerToken: null,
          method: req.method ?? "GET",
          origin,
          ...contextBase,
        }
        break
    }

    await enforceRateLimit({
      actorIdentifier: context.actorIdentifier,
      actorType: options.actor,
      requestId: state.requestId,
      req,
      route: options.rateLimitGroup,
    })

    await handler({
      body,
      context: context as PassportRouteContext<TActor>,
    })
  } catch (error) {
    return sendPassportApiError(
      req,
      res,
      error,
      "Passport API request failed.",
      options.route
    )
  }
}

export const passportSchemas = { z }
