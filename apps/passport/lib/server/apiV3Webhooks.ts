import crypto from "crypto"

import axios from "axios"
import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveWebhookSigningSecret } from "./webhookSigningSecrets"

export const API_V3_WEBHOOK_VERSION = "v3" as const
export const API_V3_WEBHOOK_PAYLOAD_VERSION = "2026-05-03" as const
export const API_V3_WEBHOOK_SIGNATURE_VERSION = "v1" as const

export const LEGACY_TO_API_V3_WEBHOOK_EVENT = {
  credential_added: "stamp.created",
  credential_blacklisted: "credential.blacklisted",
  credential_expired: "credential.expired",
  credential_removed: "stamp.removed",
  credential_whitelisted: "credential.whitelisted",
  score_decrease: "score.decreased",
  score_increase: "score.increased",
} as const

export type LegacyWebhookEventType = keyof typeof LEGACY_TO_API_V3_WEBHOOK_EVENT

export const SIWC_API_V3_WEBHOOK_EVENTS = [
  "wallet.created",
  "wallet.policy.denied",
  "wallet.signature.completed",
  "wallet.signature.failed",
  "wallet.signing_request.approved",
  "wallet.signing_request.cancelled",
  "wallet.signing_request.created",
  "wallet.signing_request.rejected",
  "wallet.signing_request.step_up_failed",
] as const

export type SiwcApiV3WebhookEventType =
  (typeof SIWC_API_V3_WEBHOOK_EVENTS)[number]

export type ApiV3WebhookPayload = {
  apiVersion: typeof API_V3_WEBHOOK_VERSION
  createdAt: string
  dapp: {
    id: string
  }
  data: Record<string, unknown>
  eventId: string
  eventType:
    | (typeof LEGACY_TO_API_V3_WEBHOOK_EVENT)[LegacyWebhookEventType]
    | SiwcApiV3WebhookEventType
  legacyEventType?: LegacyWebhookEventType
  payloadVersion: typeof API_V3_WEBHOOK_PAYLOAD_VERSION
  requestId: string
  subject: {
    dappUserUuid: string
  }
}

const sha256Hex = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex")

export const buildApiV3WebhookEventId = (input: {
  dappId: number | string
  dappUserUuid: string
  eventKey?: string | number
  eventType?: string
  legacyEventType?: LegacyWebhookEventType
  stampId?: number
}) => {
  const digest = sha256Hex(
    [
      API_V3_WEBHOOK_VERSION,
      input.dappId,
      input.dappUserUuid,
      input.eventType ?? input.legacyEventType,
      input.eventKey ?? input.stampId,
    ].join(":")
  )
  return `wh_evt_${digest.slice(0, 32)}`
}

export const buildApiV3WebhookPayload = (input: {
  createdAt?: string
  dappId: number | string
  dappUserUuid: string
  legacyEventType: LegacyWebhookEventType
  requestId: string
  stampId: number
}): ApiV3WebhookPayload => {
  return {
    apiVersion: API_V3_WEBHOOK_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    dapp: {
      id: String(input.dappId),
    },
    data: {
      stampId: input.stampId,
    },
    eventId: buildApiV3WebhookEventId(input),
    eventType: LEGACY_TO_API_V3_WEBHOOK_EVENT[input.legacyEventType],
    legacyEventType: input.legacyEventType,
    payloadVersion: API_V3_WEBHOOK_PAYLOAD_VERSION,
    requestId: input.requestId,
    subject: {
      dappUserUuid: input.dappUserUuid,
    },
  }
}

export const buildSiwcApiV3WebhookPayload = (input: {
  createdAt?: string
  dappId: number | string
  dappUserUuid: string
  eventKey: string
  eventType: SiwcApiV3WebhookEventType
  requestId: string
  data: Record<string, unknown>
}): ApiV3WebhookPayload => ({
  apiVersion: API_V3_WEBHOOK_VERSION,
  createdAt: input.createdAt ?? new Date().toISOString(),
  dapp: {
    id: String(input.dappId),
  },
  data: input.data,
  eventId: buildApiV3WebhookEventId({
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    eventKey: input.eventKey,
    eventType: input.eventType,
  }),
  eventType: input.eventType,
  payloadVersion: API_V3_WEBHOOK_PAYLOAD_VERSION,
  requestId: input.requestId,
  subject: {
    dappUserUuid: input.dappUserUuid,
  },
})

export const serializeApiV3WebhookPayload = (
  payload: ApiV3WebhookPayload
) => JSON.stringify(payload)

export const signApiV3WebhookPayload = (input: {
  body: string
  eventId: string
  secret: string
  timestamp: string
}) => {
  const signedPayload = [
    input.eventId,
    input.timestamp,
    input.body,
  ].join(".")
  const digest = crypto
    .createHmac("sha256", input.secret)
    .update(signedPayload)
    .digest("hex")

  return `${API_V3_WEBHOOK_SIGNATURE_VERSION}=${digest}`
}

export const buildApiV3WebhookHeaders = (input: {
  body: string
  eventId: string
  secret: string
  timestamp?: string
}) => {
  const timestamp = input.timestamp ?? new Date().toISOString()
  return {
    "Content-Type": "application/json",
    "X-Cubid-Event-Id": input.eventId,
    "X-Cubid-Signature": signApiV3WebhookPayload({
      body: input.body,
      eventId: input.eventId,
      secret: input.secret,
      timestamp,
    }),
    "X-Cubid-Signature-Version": API_V3_WEBHOOK_SIGNATURE_VERSION,
    "X-Cubid-Timestamp": timestamp,
  }
}

export const classifyApiV3WebhookDeliveryError = (error: unknown) => {
  const maybeAxiosError = error as {
    code?: unknown
    response?: { status?: unknown }
  }

  if (maybeAxiosError.response) {
    const status = Number(maybeAxiosError.response.status ?? 0)
    return status >= 500 ? "server_error" : "client_error"
  }

  if (typeof maybeAxiosError.code === "string") {
    return "network_error"
  }

  return "request_error"
}

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []

const upsertApiV3WebhookEvent = async (
  supabase: SupabaseClient,
  payload: ApiV3WebhookPayload
) => {
  const { data: existingEvents, error: existingError } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("dapp_id", payload.dapp.id)
    .eq("event_id", payload.eventId)

  if (existingError) {
    throw existingError
  }

  let eventRow = existingEvents?.[0] ?? null
  const attemptNumber = Number(eventRow?.retries ?? 0) + 1
  const patch = {
    api_version: payload.apiVersion,
    dapp_id: payload.dapp.id,
    event_id: payload.eventId,
    event_type: payload.eventType,
    last_attempt_at: new Date().toISOString(),
    payload,
    payload_version: payload.payloadVersion,
    retries: attemptNumber,
  }

  if (eventRow) {
    const { data, error } = await supabase
      .from("webhook_events")
      .update(patch)
      .eq("id", eventRow.id)
      .select("*")

    if (error) {
      throw error
    }

    eventRow = data?.[0] ?? eventRow
  } else {
    const { data, error } = await supabase
      .from("webhook_events")
      .insert(patch)
      .select("*")

    if (error) {
      throw error
    }

    eventRow = data?.[0] ?? null
  }

  return { attemptNumber, eventRow }
}

export const deliverApiV3WebhookPayload = async (input: {
  payload: ApiV3WebhookPayload
  signingSecret: string
  supabase: SupabaseClient
  webhookUrl: string
}) => {
  const payloadBody = serializeApiV3WebhookPayload(input.payload)
  const headers = buildApiV3WebhookHeaders({
    body: payloadBody,
    eventId: input.payload.eventId,
    secret: input.signingSecret,
  })
  const { attemptNumber, eventRow } = await upsertApiV3WebhookEvent(
    input.supabase,
    input.payload
  )

  try {
    const response = await axios.post(input.webhookUrl, payloadBody, {
      headers,
    })

    await input.supabase.from("webhook_event_deliveries").insert({
      attempt_number: attemptNumber,
      delivery_status: "succeeded",
      dapp_id: input.payload.dapp.id,
      event_id: input.payload.eventId,
      request_body: input.payload,
      request_headers: {
        "X-Cubid-Event-Id": headers["X-Cubid-Event-Id"],
        "X-Cubid-Signature-Version": headers["X-Cubid-Signature-Version"],
        "X-Cubid-Timestamp": headers["X-Cubid-Timestamp"],
      },
      response_body:
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data ?? null),
      response_status_code: response.status,
      signature_version: headers["X-Cubid-Signature-Version"],
      webhook_event_id: eventRow?.id,
    })
  } catch (error) {
    await input.supabase.from("webhook_event_deliveries").insert({
      attempt_number: attemptNumber,
      delivery_status: "failed",
      dapp_id: input.payload.dapp.id,
      error_category: classifyApiV3WebhookDeliveryError(error),
      event_id: input.payload.eventId,
      request_body: input.payload,
      request_headers: {
        "X-Cubid-Event-Id": headers["X-Cubid-Event-Id"],
        "X-Cubid-Signature-Version": headers["X-Cubid-Signature-Version"],
        "X-Cubid-Timestamp": headers["X-Cubid-Timestamp"],
      },
      response_body:
        typeof (error as { response?: { data?: unknown } })?.response?.data ===
        "string"
          ? String((error as { response?: { data?: unknown } }).response?.data)
          : JSON.stringify(
              (error as { response?: { data?: unknown }; message?: unknown })
                ?.response?.data ??
                (error as { message?: unknown })?.message ??
                "Unknown error"
            ),
      response_status_code:
        (error as { response?: { status?: number } })?.response?.status ?? 500,
      signature_version: headers["X-Cubid-Signature-Version"],
      webhook_event_id: eventRow?.id,
    })
  }
}

export const deliverSiwcApiV3Webhook = async (input: {
  dappId: number | string
  dappUserUuid: string
  eventKey: string
  eventType: SiwcApiV3WebhookEventType
  requestId: string
  data: Record<string, unknown>
  supabase: SupabaseClient
}) => {
  try {
    const { data: policy, error: policyError } = await input.supabase
      .from("siwc_signing_policies")
      .select("webhook_event_subscriptions")
      .eq("dapp_id", input.dappId)
      .maybeSingle()

    if (policyError) {
      throw policyError
    }

    if (
      !normalizeStringArray(policy?.webhook_event_subscriptions).includes(
        input.eventType
      )
    ) {
      return
    }

    const { data: subscriptions, error: subscriptionError } = await input.supabase
      .from("dapp_webhook_subscriptions")
      .select("*")
      .match({
        dapp: input.dappId,
        webhook: input.eventType,
      })

    if (subscriptionError) {
      throw subscriptionError
    }

    const subscription = (subscriptions ?? []).find(
      (row) => row.status === undefined || row.status === "active"
    )

    if (!subscription?.webhook_url) {
      return
    }

    const signingSecret = await resolveWebhookSigningSecret(
      input.supabase,
      subscription
    )

    if (!signingSecret) {
      return
    }

    await deliverApiV3WebhookPayload({
      payload: buildSiwcApiV3WebhookPayload({
        dappId: input.dappId,
        dappUserUuid: input.dappUserUuid,
        eventKey: input.eventKey,
        eventType: input.eventType,
        requestId: input.requestId,
        data: input.data,
      }),
      signingSecret,
      supabase: input.supabase,
      webhookUrl: String(subscription.webhook_url),
    })
  } catch (error) {
    try {
      await input.supabase.from("api_security_events").insert({
        actor_identifier: String(input.dappId),
        actor_type: "dapp",
        details: {
          dappUserUuid: input.dappUserUuid,
          error: error instanceof Error ? error.message : String(error),
          eventType: input.eventType,
        },
        event_id: `api_event_${crypto.randomUUID().replace(/-/g, "")}`,
        event_type: "siwc_webhook.delivery_failed",
        outcome: "failure",
        request_id: input.requestId,
        route: "api_v3.webhook.siwc",
      })
    } catch {
      // SIWC webhooks are best-effort and must not roll back signing state.
    }
  }
}
