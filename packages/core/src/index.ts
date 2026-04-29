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
  details?: unknown
  message: string
  requestId?: string | null
  status?: number
}

export class CubidApiError extends Error {
  readonly category: CubidApiErrorCategory
  readonly details?: unknown
  readonly requestId?: string | null
  readonly status?: number

  constructor(input: CubidApiErrorInput) {
    super(input.message)
    this.name = "CubidApiError"
    this.category = input.category
    this.details = input.details
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
  error: null | string
  is_blacklisted: boolean
  is_new_app_user: boolean
  is_sybil_attack: boolean
  user_id?: string | null
}

export type CubidFetchIdentityInput = {
  userId: string
}

export type CubidStampDetail = {
  stamp_type: string
  status: "Verified" | "Unverified" | string
  value: unknown
}

export type CubidFetchIdentityResponse = {
  error: null | string
  stamp_details: CubidStampDetail[]
}

export type CubidFetchScoreInput = {
  userId: string
}

export type CubidFetchScoreResponse = {
  cubid_score: number
  error: null | string
  scoring_schema: number | string | null
}

export type CubidFetchStampsInput = {
  userId: string
}

export type CubidRawStamp = Record<string, unknown> & {
  emailForVerification?: string | null
  permAvailable?: boolean
  stamptype_string?: string
}

export type CubidFetchStampsResponse = {
  all_stamps: CubidRawStamp[]
  email?: string | null
  error?: string | null
}

export type CubidApiClient = {
  createUser(input: CubidCreateUserInput): Promise<CubidCreateUserResponse>
  fetchIdentity(
    input: CubidFetchIdentityInput
  ): Promise<CubidFetchIdentityResponse>
  fetchScore(input: CubidFetchScoreInput): Promise<CubidFetchScoreResponse>
  fetchStamps(input: CubidFetchStampsInput): Promise<CubidFetchStampsResponse>
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

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new CubidApiError({
      category: "config",
      message:
        "Cubid API baseUrl must use HTTPS, except for localhost development.",
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
  body: CubidRequestBody
): Promise<Result> => {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })
  const requestId = response.headers.get("x-request-id")
  const payload = await safeJson(response)

  if (!response.ok) {
    throw new CubidApiError({
      category: categoryForStatus(response.status),
      details: payload,
      message: messageFromPayload(
        payload,
        `Cubid API request failed with status ${response.status}.`
      ),
      requestId,
      status: response.status,
    })
  }

  return payload as Result
}

export const createCubidApiClient = (
  options: CubidApiClientOptions
): CubidApiClient => {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const apiKey = assertApiKey(options.apiKey)
  const fetchImpl = resolveFetch(options.fetch)

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
        })
      )
    },

    fetchIdentity(input) {
      return makeRequest<CubidFetchIdentityResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_identity",
        withCredentials({
          user_id: input.userId,
        })
      )
    },

    fetchScore(input) {
      return makeRequest<CubidFetchScoreResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/score/fetch_score",
        withCredentials({
          user_id: input.userId,
        })
      )
    },

    fetchStamps(input) {
      return makeRequest<CubidFetchStampsResponse>(
        fetchImpl,
        baseUrl,
        "/api/v2/identity/fetch_stamps",
        withCredentials({
          user_id: input.userId,
        })
      )
    },
  }
}
