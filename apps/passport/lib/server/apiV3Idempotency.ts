import { createHash } from "node:crypto"

import { ApiSecurityError } from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextApiRequest } from "next"

type ApiV3IdempotencyRecord = {
  actor_identifier: string
  actor_type: string
  expires_at: string
  idempotency_key: string
  request_hash: string
  request_id: string | null
  response_body: unknown
  response_status: number | null
  route: string
  status: string
}

export type ApiV3RouteResponse = {
  body: unknown
  statusCode: number
}

const IDEMPOTENCY_KEY_MAX_LENGTH = 200
const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableValue(nestedValue)])
    )
  }

  return value
}

const isUniqueConstraintError = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  )
}

const isExpiredRecord = (record: ApiV3IdempotencyRecord) => {
  return new Date(record.expires_at).getTime() <= Date.now()
}

const getHeaderValue = (req: NextApiRequest, headerName: string) => {
  const value = req.headers[headerName.toLowerCase()]

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return typeof value === "string" ? value : null
}

export const getApiV3IdempotencyKey = (req: NextApiRequest) => {
  const value = getHeaderValue(req, "idempotency-key")?.trim()

  if (!value) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Missing Idempotency-Key header."
    )
  }

  if (value.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Idempotency-Key header is too long."
    )
  }

  return value
}

export const hashApiV3IdempotencyRequest = (body: unknown) => {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(body)))
    .digest("hex")
}

const handleExistingRecord = (
  record: ApiV3IdempotencyRecord,
  requestHash: string
): ApiV3RouteResponse | null => {
  if (record.request_hash !== requestHash) {
    throw new ApiSecurityError(
      409,
      "idempotency_conflict",
      "Idempotency-Key was already used with a different request."
    )
  }

  if (record.status === "completed") {
    return {
      body: record.response_body,
      statusCode: Number(record.response_status ?? 200),
    }
  }

  if (record.status === "pending") {
    throw new ApiSecurityError(
      409,
      "request_in_progress",
      "A request with this Idempotency-Key is still in progress."
    )
  }

  return null
}

export async function runApiV3IdempotentWrite(input: {
  actorIdentifier: string
  actorType: string
  body: unknown
  handler: () => Promise<ApiV3RouteResponse>
  idempotencyKey: string
  requestId: string
  route: string
  supabase: SupabaseClient
}): Promise<ApiV3RouteResponse> {
  const requestHash = hashApiV3IdempotencyRequest(input.body)
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_RETENTION_MS).toISOString()
  const lookup = () =>
    input.supabase
      .from("api_idempotency_keys")
      .select("*")
      .eq("route", input.route)
      .eq("actor_type", input.actorType)
      .eq("actor_identifier", input.actorIdentifier)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle()

  const { data: existingRecord, error: existingError } = await lookup()
  let hasClaimedRecord = false

  if (existingError) {
    throw existingError
  }

  if (existingRecord) {
    if (isExpiredRecord(existingRecord as ApiV3IdempotencyRecord)) {
      const { error: reclaimError } = await input.supabase
        .from("api_idempotency_keys")
        .update({
          completed_at: null,
          expires_at: expiresAt,
          failed_at: null,
          request_hash: requestHash,
          request_id: input.requestId,
          response_body: null,
          response_status: null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("route", input.route)
        .eq("actor_type", input.actorType)
        .eq("actor_identifier", input.actorIdentifier)
        .eq("idempotency_key", input.idempotencyKey)

      if (reclaimError) {
        throw reclaimError
      }

      hasClaimedRecord = true
    } else {
      const replay = handleExistingRecord(
        existingRecord as ApiV3IdempotencyRecord,
        requestHash
      )

      if (replay) {
        return replay
      }
    }
  }

  if (!hasClaimedRecord) {
    const { error: insertError } = await input.supabase
      .from("api_idempotency_keys")
      .insert({
        actor_identifier: input.actorIdentifier,
        actor_type: input.actorType,
        expires_at: expiresAt,
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        request_id: input.requestId,
        route: input.route,
        status: "pending",
      })

    if (insertError) {
      if (!isUniqueConstraintError(insertError)) {
        throw insertError
      }

      const { data: racedRecord, error: racedError } = await lookup()

      if (racedError) {
        throw racedError
      }

      if (racedRecord) {
        const replay = handleExistingRecord(
          racedRecord as ApiV3IdempotencyRecord,
          requestHash
        )

        if (replay) {
          return replay
        }
      }
    }
  }

  try {
    const response = await input.handler()
    const { error: completeError } = await input.supabase
      .from("api_idempotency_keys")
      .update({
        completed_at: new Date().toISOString(),
        response_body: response.body,
        response_status: response.statusCode,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("route", input.route)
      .eq("actor_type", input.actorType)
      .eq("actor_identifier", input.actorIdentifier)
      .eq("idempotency_key", input.idempotencyKey)

    if (completeError) {
      throw completeError
    }

    return response
  } catch (error) {
    await input.supabase
      .from("api_idempotency_keys")
      .update({
        failed_at: new Date().toISOString(),
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("route", input.route)
      .eq("actor_type", input.actorType)
      .eq("actor_identifier", input.actorIdentifier)
      .eq("idempotency_key", input.idempotencyKey)

    throw error
  }
}
