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
  createUser(input: CubidCreateUserInput): Promise<CubidCreateUserResponse>
  ensureUserByEmail(
    input: CubidEnsureUserByEmailInput
  ): Promise<CubidEnsureUserByEmailResponse>
  fetchIdentity(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchIdentityResponse>
  fetchScore(input: CubidFetchScoreInput): Promise<CubidFetchScoreResponse>
  fetchStamps(input: CubidFetchStampsInput): Promise<CubidFetchStampsResponse>
  syncIdentitySnapshot(
    input: CubidIdentitySnapshotInput
  ): Promise<CubidIdentitySnapshot>
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
  }
}
