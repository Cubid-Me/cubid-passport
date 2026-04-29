/**
 * Runtime-agnostic Cubid API client.
 *
 * This package intentionally depends only on standard Web APIs so it can run in
 * Node, Deno, Supabase Edge Functions, workers, and browser-capable runtimes.
 */

export type CubidFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type CubidApiErrorCategory =
  | "auth"
  | "config"
  | "not_found"
  | "rate_limit"
  | "unknown"
  | "upstream"
  | "validation"

export type CubidApiErrorInput = {
  category: CubidApiErrorCategory
  code?: string
  details?: unknown
  endpoint?: string
  message: string
  requestId?: string | null
  status?: number
}

export class CubidApiError extends Error {
  readonly category: CubidApiErrorCategory
  readonly code?: string
  readonly details?: unknown
  readonly endpoint?: string
  readonly requestId?: string | null
  readonly status?: number

  constructor(input: CubidApiErrorInput) {
    super(input.message)
    this.name = "CubidApiError"
    this.category = input.category
    this.code = input.code
    this.details = input.details
    this.endpoint = input.endpoint
    this.requestId = input.requestId
    this.status = input.status
  }
}

export type CubidApiClientOptions = {
  /**
   * Passport/Cubid API origin, for example `https://passport.cubid.me`.
   */
  baseUrl: string | URL
  /**
   * Dapp API key. Keep this value server-side.
   */
  apiKey: string
  /**
   * Optional dapp id included on endpoints that currently require it.
   */
  dappId?: number | string
  /**
   * Optional fetch implementation for Deno, Edge Functions, tests, or custom
   * instrumentation. Defaults to globalThis.fetch.
   */
  fetch?: CubidFetch
  /**
   * Optional headers for tracing or caller-owned instrumentation. Do not pass
   * browser-visible secrets here.
   */
  headers?: HeadersInit
}

export type CubidCreateUserInput = {
  dappId?: number | string
  email?: string
  evm?: string
  githubSub?: string
  googleSub?: string
  linkedinSub?: string
  phone?: string
  twitterSub?: string
}

export type CubidCreateUserResponse = {
  error: unknown
  isBlacklisted: boolean
  isNewAppUser: boolean
  isSybilAttack: boolean
  raw: Record<string, unknown>
  userId: string | null
}

export type CubidEnsureUserByEmailInput = {
  dappId?: number | string
  email: string
}

export type CubidEnsureUserByEmailResponse = CubidCreateUserResponse & {
  email: string
  userId: string
}

export type CubidFetchIdentityInput = {
  userId: string
}

export type CubidStampDetail = {
  raw: Record<string, unknown>
  stampType: string
  status: "Verified" | "Unverified" | string | null
  value: unknown
}

export type CubidFetchIdentityResponse = {
  error: unknown
  raw: Record<string, unknown>
  stampDetails: CubidStampDetail[]
}

export type CubidFetchScoreInput = {
  userId: string
}

export type CubidFetchScoreResponse = {
  cubidScore: number
  error: unknown
  raw: Record<string, unknown>
  scoringSchema: number | string | null
}

export type CubidFetchStampsInput = {
  userId: string
}

export type CubidRawStamp = Record<string, unknown> & {
  emailForVerification?: string | null
  permAvailable?: boolean
  stamptype_string?: string
}

export type CubidStampRecord = {
  emailForVerification?: string | null
  id?: number
  identity?: string | null
  isValid?: boolean | null
  permAvailable?: boolean
  raw: Record<string, unknown>
  stampType?: string | null
  stampTypeId?: number
  uniqueValue?: string | null
}

export type CubidFetchStampsResponse = {
  allStamps: CubidStampRecord[]
  email?: string | null
  error?: unknown
  raw: Record<string, unknown>
}

export type CubidCoordinates = {
  lat: number
  lng: number
}

export type CubidFetchApproxLocationResponse = {
  coordinates?: CubidCoordinates
  country?: string | null
  error: unknown
  placeName?: string | null
  plusCode?: string | null
  postalCode?: string | null
  raw: Record<string, unknown>
}

export type CubidFetchExactLocationResponse = {
  coordinates?: CubidCoordinates
  country?: string | null
  error: unknown
  place?: unknown
  raw: Record<string, unknown>
}

export type CubidFetchRoughLocationResponse = {
  coordinates?: CubidCoordinates
  country?: unknown
  error: unknown
  plusCode?: string | null
  raw: Record<string, unknown>
}

export type CubidFetchUserDataResponse = {
  coordinates?: CubidCoordinates
  country?: string | null
  error: unknown
  name?: string | null
  placeName?: string | null
  raw: Record<string, unknown>
}

export type CubidSearchLocationInput = {
  locationInput: string
}

export type CubidSearchLocationResponse = Array<Record<string, unknown>>

export type CubidAddStampInput = {
  pageId: number | string
  stampData: Record<string, unknown>
  stampType: string
  userId: string
}

export type CubidAddStampResponse = {
  raw: Record<string, unknown>
  success: boolean
}

export type CubidSendEmailOtpInput = {
  email: string
}

export type CubidSendEmailOtpResponse = {
  dappId?: number | string
  email?: string | null
  raw: Record<string, unknown>
  sent: boolean
}

export type CubidVerifyEmailOtpInput = {
  email: string
  otp: number | string
}

export type CubidVerifyEmailOtpResponse = {
  dappId?: number | string
  email?: string | null
  isVerified: boolean
  raw: Record<string, unknown>
}

export type CubidSendPhoneOtpInput = {
  phone: string
}

export type CubidSendPhoneOtpResponse = {
  raw: Record<string, unknown>
  status?: string | null
}

export type CubidVerifyPhoneOtpInput = {
  otp: number | string
  phone: string
}

export type CubidVerifyPhoneOtpResponse = {
  isVerified: boolean
  raw: Record<string, unknown>
  status?: string | null
}

export type CubidIdentitySnapshotInput = {
  userId: string
}

export type CubidIdentitySnapshot = {
  identity: CubidFetchIdentityResponse
  score: CubidFetchScoreResponse
  stamps: CubidFetchStampsResponse
  syncedAt: string
  userId: string
}

export type CubidApiClient = {
  addStamp(input: CubidAddStampInput): Promise<CubidAddStampResponse>
  createUser(input: CubidCreateUserInput): Promise<CubidCreateUserResponse>
  ensureUserByEmail(
    input: CubidEnsureUserByEmailInput
  ): Promise<CubidEnsureUserByEmailResponse>
  fetchApproxLocation(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchApproxLocationResponse>
  fetchExactLocation(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchExactLocationResponse>
  fetchIdentity(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchIdentityResponse>
  fetchRoughLocation(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchRoughLocationResponse>
  fetchScore(input: CubidFetchScoreInput): Promise<CubidFetchScoreResponse>
  fetchStamps(input: CubidFetchStampsInput): Promise<CubidFetchStampsResponse>
  fetchUserData(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchUserDataResponse>
  searchLocation(
    input: CubidSearchLocationInput
  ): Promise<CubidSearchLocationResponse>
  sendEmailOtp(
    input: CubidSendEmailOtpInput
  ): Promise<CubidSendEmailOtpResponse>
  sendPhoneOtp(
    input: CubidSendPhoneOtpInput
  ): Promise<CubidSendPhoneOtpResponse>
  syncIdentitySnapshot(
    input: CubidIdentitySnapshotInput
  ): Promise<CubidIdentitySnapshot>
  verifyEmailOtp(
    input: CubidVerifyEmailOtpInput
  ): Promise<CubidVerifyEmailOtpResponse>
  verifyPhoneOtp(
    input: CubidVerifyPhoneOtpInput
  ): Promise<CubidVerifyPhoneOtpResponse>
}

type CubidRequestBody = Record<string, unknown>

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "")

const normalizeBaseUrl = (baseUrl: string | URL): string => {
  const raw = String(baseUrl).trim()

  if (!raw) {
    throw new CubidApiError({
      category: "config",
      message: "Cubid API baseUrl is required.",
    })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new CubidApiError({
      category: "config",
      message: "Cubid API baseUrl must be an absolute URL.",
    })
  }

  const isLoopbackHost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]"
  const isAllowedProtocol =
    parsed.protocol === "https:" || (parsed.protocol === "http:" && isLoopbackHost)

  if (!isAllowedProtocol) {
    throw new CubidApiError({
      category: "config",
      message:
        "Cubid API baseUrl must use HTTPS, except for loopback development hosts over HTTP.",
    })
  }

  return trimTrailingSlashes(parsed.toString())
}

const resolveFetch = (fetchImpl?: CubidFetch): CubidFetch => {
  if (fetchImpl) {
    return fetchImpl
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis) as CubidFetch
  }

  throw new CubidApiError({
    category: "config",
    message:
      "No fetch implementation is available. Pass fetch when creating the Cubid API client.",
  })
}

const assertApiKey = (apiKey: string): string => {
  const normalized = apiKey.trim()
  if (!normalized) {
    throw new CubidApiError({
      category: "config",
      message: "Cubid API key is required.",
    })
  }
  return normalized
}

const assertNonEmptyString = (
  value: string,
  field: string,
  endpoint: string
): string => {
  const normalized = value.trim()
  if (!normalized) {
    throw new CubidApiError({
      category: "validation",
      code: "INVALID_INPUT",
      endpoint,
      message: `${field} is required.`,
    })
  }
  return normalized
}

const categoryForStatus = (status: number): CubidApiErrorCategory => {
  if (status === 401 || status === 403) {
    return "auth"
  }
  if (status === 404) {
    return "not_found"
  }
  if (status === 408 || status === 429) {
    return "rate_limit"
  }
  if (status >= 400 && status < 500) {
    return "validation"
  }
  if (status >= 500) {
    return "upstream"
  }
  return "unknown"
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined

const asCoordinates = (value: unknown): CubidCoordinates | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const lat = value.lat
  const lng = value.lng

  if (typeof lat !== "number" || typeof lng !== "number") {
    return undefined
  }

  return { lat, lng }
}

const assertRecord = (
  value: unknown,
  endpoint: string,
  requestId?: string | null,
  status?: number
): Record<string, unknown> => {
  if (isRecord(value)) {
    return value
  }

  throw new CubidApiError({
    category: "upstream",
    code: "MALFORMED_RESPONSE",
    details: value,
    endpoint,
    message: `Malformed response from ${endpoint}.`,
    requestId,
    status,
  })
}

const messageFromPayload = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const record = payload as Record<string, unknown>
  const error = record.error

  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (error && typeof error === "object") {
    const nested = error as Record<string, unknown>
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message
    }
    if (typeof nested.code === "string" && nested.code.trim()) {
      return nested.code
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message
  }

  return fallback
}

const safeJson = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

const makeRequest = async <Result>(
  fetchImpl: CubidFetch,
  baseUrl: string,
  path: string,
  body: CubidRequestBody,
  endpoint: string,
  normalize: (
    payload: unknown,
    requestId?: string | null,
    status?: number
  ) => Result,
  headers?: HeadersInit
): Promise<Result> => {
  let response: Response
  try {
    const requestHeaders = new Headers(headers)
    if (!requestHeaders.has("content-type")) {
      requestHeaders.set("content-type", "application/json")
    }

    response = await fetchImpl(`${baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: requestHeaders,
      method: "POST",
    })
  } catch (error) {
    throw new CubidApiError({
      category: "upstream",
      code: "NETWORK_ERROR",
      details: error,
      endpoint,
      message: "Cubid API request failed before receiving a response.",
    })
  }

  const requestId = response.headers.get("x-request-id")
  const payload = await safeJson(response)

  if (!response.ok) {
    throw new CubidApiError({
      category: categoryForStatus(response.status),
      details: payload,
      endpoint,
      message: messageFromPayload(
        payload,
        `Cubid API request failed with status ${response.status}.`
      ),
      requestId,
      status: response.status,
    })
  }

  return normalize(payload, requestId, response.status)
}

const normalizeCreateUser = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidCreateUserResponse => {
  const record = assertRecord(payload, "create_user", requestId, status)

  return {
    error: record.error ?? null,
    isBlacklisted: Boolean(record.is_blacklisted),
    isNewAppUser: Boolean(record.is_new_app_user),
    isSybilAttack: Boolean(record.is_sybil_attack),
    raw: record,
    userId: asString(record.user_id),
  }
}

const normalizeIdentity = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchIdentityResponse => {
  const record = assertRecord(payload, "identity/fetch_identity", requestId, status)
  const stampDetails = Array.isArray(record.stamp_details)
    ? record.stamp_details
    : []

  return {
    error: record.error ?? null,
    raw: record,
    stampDetails: stampDetails.map((item) => {
      const detail = assertRecord(
        item,
        "identity/fetch_identity.stamp_details",
        requestId,
        status
      )

      return {
        raw: detail,
        stampType: asString(detail.stamp_type) ?? "unknown",
        status: asString(detail.status),
        value: detail.value,
      }
    }),
  }
}

const normalizeScore = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchScoreResponse => {
  const record = assertRecord(payload, "score/fetch_score", requestId, status)

  return {
    cubidScore: typeof record.cubid_score === "number" ? record.cubid_score : 0,
    error: record.error ?? null,
    raw: record,
    scoringSchema:
      typeof record.scoring_schema === "number" ||
      typeof record.scoring_schema === "string"
        ? record.scoring_schema
        : null,
  }
}

const normalizeStampRecord = (
  raw: unknown,
  requestId?: string | null,
  status?: number
): CubidStampRecord => {
  const record = assertRecord(
    raw,
    "identity/fetch_stamps.all_stamps",
    requestId,
    status
  )

  return {
    emailForVerification: asString(record.emailForVerification),
    id: asNumber(record.id),
    identity: asString(record.identity),
    isValid: asBoolean(record.is_valid),
    permAvailable: asBoolean(record.permAvailable),
    raw: record,
    stampType: asString(record.stamptype_string),
    stampTypeId: asNumber(record.stamptype),
    uniqueValue: asString(record.uniquevalue),
  }
}

const normalizeStamps = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchStampsResponse => {
  const record = assertRecord(payload, "identity/fetch_stamps", requestId, status)
  const allStamps = Array.isArray(record.all_stamps) ? record.all_stamps : []

  return {
    allStamps: allStamps.map((stamp) =>
      normalizeStampRecord(stamp, requestId, status)
    ),
    email: asString(record.email),
    error: record.error ?? null,
    raw: record,
  }
}

const normalizeApproxLocation = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchApproxLocationResponse => {
  const record = assertRecord(
    payload,
    "identity/fetch_approx_location",
    requestId,
    status
  )

  return {
    coordinates: asCoordinates(record.coordinates),
    country: asString(record.country),
    error: record.error ?? null,
    placeName: asString(record.placename),
    plusCode: asString(record.pluscode),
    postalCode: asString(record.postalcode),
    raw: record,
  }
}

const normalizeExactLocation = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchExactLocationResponse => {
  const record = assertRecord(
    payload,
    "identity/fetch_exact_location",
    requestId,
    status
  )

  return {
    coordinates: asCoordinates(record.coordinates),
    country: asString(record.country),
    error: record.error ?? null,
    place: record.place,
    raw: record,
  }
}

const normalizeRoughLocation = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchRoughLocationResponse => {
  const record = assertRecord(
    payload,
    "identity/fetch_rough_location",
    requestId,
    status
  )

  return {
    coordinates: asCoordinates(record.coordinates),
    country: record.country ?? record.cubid_country ?? null,
    error: record.error ?? null,
    plusCode: asString(record.pluscode),
    raw: record,
  }
}

const normalizeUserData = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidFetchUserDataResponse => {
  const record = assertRecord(payload, "identity/fetch_user_data", requestId, status)

  return {
    coordinates: asCoordinates(record.coordinates),
    country: asString(record.country),
    error: record.error ?? null,
    name: asString(record.name),
    placeName: asString(record.placename),
    raw: record,
  }
}

const normalizeSearchLocation = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidSearchLocationResponse => {
  if (!Array.isArray(payload)) {
    throw new CubidApiError({
      category: "upstream",
      code: "MALFORMED_RESPONSE",
      details: payload,
      endpoint: "search-location",
      message: "Malformed response from search-location.",
      requestId,
      status,
    })
  }

  return payload.map((item) => (isRecord(item) ? item : { value: item }))
}

const normalizeAddStamp = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidAddStampResponse => {
  const record = assertRecord(payload, "identity/add_stamp", requestId, status)

  return {
    raw: record,
    success: Boolean(record.success),
  }
}

const normalizeEmailOtpSent = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidSendEmailOtpResponse => {
  const record = assertRecord(payload, "email/send_otp", requestId, status)
  const data = isRecord(record.data) ? record.data : record

  return {
    dappId:
      typeof data.dappId === "number" || typeof data.dappId === "string"
        ? data.dappId
        : undefined,
    email: asString(data.email),
    raw: record,
    sent: data.sent === undefined ? true : Boolean(data.sent),
  }
}

const normalizeEmailOtpVerified = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidVerifyEmailOtpResponse => {
  const record = assertRecord(payload, "email/verify_otp", requestId, status)
  const data = isRecord(record.data) ? record.data : record

  return {
    dappId:
      typeof data.dappId === "number" || typeof data.dappId === "string"
        ? data.dappId
        : undefined,
    email: asString(data.email),
    isVerified: Boolean(data.is_verified),
    raw: record,
  }
}

const normalizePhoneOtpSent = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidSendPhoneOtpResponse => {
  if (typeof payload === "string") {
    return {
      raw: { message: payload },
      status: payload,
    }
  }

  const record = assertRecord(payload, "twillio/send-otp", requestId, status)
  const data = isRecord(record.data) ? record.data : record

  return {
    raw: record,
    status: asString(data.status) ?? asString(data.message),
  }
}

const normalizePhoneOtpVerified = (
  payload: unknown,
  requestId?: string | null,
  status?: number
): CubidVerifyPhoneOtpResponse => {
  const record = assertRecord(payload, "twillio/verify-otp", requestId, status)
  const data = isRecord(record.data) ? record.data : record
  const verificationStatus = asString(data.status)

  return {
    isVerified:
      Boolean(data.is_verified) ||
      verificationStatus === "approved" ||
      verificationStatus === "verified",
    raw: record,
    status: verificationStatus,
  }
}

export const createCubidApiClient = (
  options: CubidApiClientOptions
): CubidApiClient => {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const apiKey = assertApiKey(options.apiKey)
  const fetchImpl = resolveFetch(options.fetch)
  const headers = options.headers

  const withCredentials = (body: CubidRequestBody): CubidRequestBody => {
    const withApiKey = {
      ...body,
      apikey: apiKey,
    }

    if (options.dappId === undefined || "dapp_id" in withApiKey) {
      return withApiKey
    }

    return {
      ...withApiKey,
      dapp_id: options.dappId,
    }
  }

  return {
    addStamp(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/add_stamp"
      )
      const stampType = assertNonEmptyString(
        input.stampType,
        "stampType",
        "identity/add_stamp"
      )

      return makeRequest<CubidAddStampResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/add_stamp",
        {
          page_id:
            typeof input.pageId === "string"
              ? Number(input.pageId) || input.pageId
              : input.pageId,
          stamp_type: stampType,
          stampData: input.stampData,
          user_data: { uuid: userId },
        },
        "identity/add_stamp",
        normalizeAddStamp,
        headers
      )
    },

    createUser(input) {
      const dappId = input.dappId ?? options.dappId
      if (dappId === undefined) {
        throw new CubidApiError({
          category: "config",
          message: "dappId is required for createUser.",
        })
      }

      return makeRequest<CubidCreateUserResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/create_user",
        withCredentials({
          dapp_id: dappId,
          email: input.email,
          evm: input.evm,
          github_sub: input.githubSub,
          google_sub: input.googleSub,
          linkedin_sub: input.linkedinSub,
          phone: input.phone,
          twitter_sub: input.twitterSub,
        }),
        "create_user",
        normalizeCreateUser,
        headers
      )
    },

    async ensureUserByEmail(input) {
      const email = assertNonEmptyString(
        input.email,
        "email",
        "ensure_user_by_email"
      )
      const created = await this.createUser({
        dappId: input.dappId,
        email,
      })

      if (!created.userId) {
        throw new CubidApiError({
          category: "upstream",
          code: "MALFORMED_RESPONSE",
          details: created.raw,
          endpoint: "create_user",
          message:
            "Cubid create_user did not return a canonical user identifier.",
        })
      }

      return {
        ...created,
        email,
        userId: created.userId,
      }
    },

    fetchApproxLocation(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/fetch_approx_location"
      )

      return makeRequest<CubidFetchApproxLocationResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_approx_location",
        withCredentials({ user_id: userId }),
        "identity/fetch_approx_location",
        normalizeApproxLocation,
        headers
      )
    },

    fetchExactLocation(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/fetch_exact_location"
      )

      return makeRequest<CubidFetchExactLocationResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_exact_location",
        withCredentials({ user_id: userId }),
        "identity/fetch_exact_location",
        normalizeExactLocation,
        headers
      )
    },

    fetchIdentity(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/fetch_identity"
      )

      return makeRequest<CubidFetchIdentityResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_identity",
        withCredentials({
          user_id: userId,
        }),
        "identity/fetch_identity",
        normalizeIdentity,
        headers
      )
    },

    fetchRoughLocation(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/fetch_rough_location"
      )

      return makeRequest<CubidFetchRoughLocationResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_rough_location",
        withCredentials({ user_id: userId }),
        "identity/fetch_rough_location",
        normalizeRoughLocation,
        headers
      )
    },

    fetchScore(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "score/fetch_score"
      )

      return makeRequest<CubidFetchScoreResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/score/fetch_score",
        withCredentials({
          user_id: userId,
        }),
        "score/fetch_score",
        normalizeScore,
        headers
      )
    },

    fetchStamps(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/fetch_stamps"
      )

      return makeRequest<CubidFetchStampsResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_stamps",
        withCredentials({
          user_id: userId,
        }),
        "identity/fetch_stamps",
        normalizeStamps,
        headers
      )
    },

    fetchUserData(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "identity/fetch_user_data"
      )

      return makeRequest<CubidFetchUserDataResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_user_data",
        withCredentials({ user_id: userId }),
        "identity/fetch_user_data",
        normalizeUserData,
        headers
      )
    },

    searchLocation(input) {
      const locationInput = assertNonEmptyString(
        input.locationInput,
        "locationInput",
        "search-location"
      )

      return makeRequest<CubidSearchLocationResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/search-location",
        withCredentials({ location_input: locationInput }),
        "search-location",
        normalizeSearchLocation,
        headers
      )
    },

    sendEmailOtp(input) {
      const email = assertNonEmptyString(input.email, "email", "email/send_otp")

      return makeRequest<CubidSendEmailOtpResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/email/send_otp",
        withCredentials({ email }),
        "email/send_otp",
        normalizeEmailOtpSent,
        headers
      )
    },

    sendPhoneOtp(input) {
      const phone = assertNonEmptyString(input.phone, "phone", "twillio/send-otp")

      return makeRequest<CubidSendPhoneOtpResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/twillio/send-otp",
        withCredentials({ phone }),
        "twillio/send-otp",
        normalizePhoneOtpSent,
        headers
      )
    },

    async syncIdentitySnapshot(input) {
      const userId = assertNonEmptyString(
        input.userId,
        "userId",
        "sync_identity_snapshot"
      )
      const [identity, score, stamps] = await Promise.all([
        this.fetchIdentity({ userId }),
        this.fetchScore({ userId }),
        this.fetchStamps({ userId }),
      ])

      return {
        identity,
        score,
        stamps,
        syncedAt: new Date().toISOString(),
        userId,
      }
    },

    verifyEmailOtp(input) {
      const email = assertNonEmptyString(
        input.email,
        "email",
        "email/verify_otp"
      )
      const otp = String(input.otp).trim()
      if (!otp) {
        throw new CubidApiError({
          category: "validation",
          code: "INVALID_INPUT",
          endpoint: "email/verify_otp",
          message: "otp is required.",
        })
      }

      return makeRequest<CubidVerifyEmailOtpResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/email/verify_otp",
        withCredentials({ email, otp }),
        "email/verify_otp",
        normalizeEmailOtpVerified,
        headers
      )
    },

    verifyPhoneOtp(input) {
      const phone = assertNonEmptyString(
        input.phone,
        "phone",
        "twillio/verify-otp"
      )
      const otpCode = String(input.otp).trim()
      if (!otpCode) {
        throw new CubidApiError({
          category: "validation",
          code: "INVALID_INPUT",
          endpoint: "twillio/verify-otp",
          message: "otp is required.",
        })
      }

      return makeRequest<CubidVerifyPhoneOtpResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/twillio/verify-otp",
        withCredentials({ otpCode, phone }),
        "twillio/verify-otp",
        normalizePhoneOtpVerified,
        headers
      )
    },
  }
}
