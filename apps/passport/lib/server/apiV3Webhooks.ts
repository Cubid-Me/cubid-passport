import crypto from "crypto"

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

export type ApiV3WebhookPayload = {
  apiVersion: typeof API_V3_WEBHOOK_VERSION
  createdAt: string
  dapp: {
    id: string
  }
  data: {
    stampId: number
  }
  eventId: string
  eventType: (typeof LEGACY_TO_API_V3_WEBHOOK_EVENT)[LegacyWebhookEventType]
  legacyEventType: LegacyWebhookEventType
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
  legacyEventType: LegacyWebhookEventType
  stampId: number
}) => {
  const digest = sha256Hex(
    [
      API_V3_WEBHOOK_VERSION,
      input.dappId,
      input.dappUserUuid,
      input.legacyEventType,
      input.stampId,
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
