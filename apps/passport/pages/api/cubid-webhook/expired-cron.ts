import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import { handlePassportRoute } from "@/lib/server/passportApi"
import {
  buildApiV3WebhookHeaders,
  buildApiV3WebhookPayload,
  classifyApiV3WebhookDeliveryError,
  serializeApiV3WebhookPayload,
} from "@/lib/server/apiV3Webhooks"
import {
  isStampDisclosed,
  loadDappDisclosureGrantsForStamp,
} from "@/lib/server/disclosureGrants"
import { getPassportSupabase } from "@/lib/server/supabase"
import { resolveWebhookSigningSecret } from "@/lib/server/webhookSigningSecrets"

async function fetchOldStamps() {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data, error } = await getPassportSupabase()
    .from("stamps")
    .select("*")
    .lt("updated_at", oneYearAgo.toISOString())

  if (error) {
    throw error
  }

  return data ?? []
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "internal",
      allowedMethods: ["POST"],
      rateLimitGroup: "passport_internal",
      route: "internal.cubid_webhook.expired_cron",
    },
    async ({ context }) => {
      const supabase = getPassportSupabase()
      const allStampsToFetch = await fetchOldStamps()
      const webhook = "credential_expired"

      await Promise.all(
        allStampsToFetch.map(async ({ id: stampid }: any) => {
          const { data: stampRows, error: stampError } = await supabase
            .from("stamps")
            .select("*")
            .eq("id", stampid)

          if (stampError) {
            throw stampError
          }

          const { data: dappUsers, error: dappUsersError } = await supabase
            .from("dapp_users")
            .select("*")
            .eq("user_id", stampRows?.[0]?.created_by_user_id)

          if (dappUsersError) {
            throw dappUsersError
          }

          const stampRow = stampRows?.[0]
          const grantSetsByDappUser = await loadDappDisclosureGrantsForStamp(
            supabase,
            (dappUsers ?? []).map((dappUser: any) => ({
              dappId: dappUser?.dapp_id ?? dappUser?.id,
              dappUserUuid: dappUser.uuid,
            })),
            stampRow
          )

          await Promise.all(
            (dappUsers ?? []).map(async (dappUser: any) => {
              const dappId = dappUser?.dapp_id ?? dappUser?.id
              const disclosureGrants = grantSetsByDappUser.get(dappUser.uuid)
              if (!isStampDisclosed(disclosureGrants, stampRow)) {
                return
              }

              const { data: webhookRows, error: webhookError } = await supabase
                .from("dapp_webhook_subscriptions")
                .select("*")
                .match({
                  dapp: dappId,
                  webhook,
                })

              if (webhookError) {
                throw webhookError
              }

              const target = webhookRows?.[0]
              const targetUrl = target?.webhook_url ?? target?.url
              if (!target || !targetUrl) {
                return
              }

              const signingSecret = await resolveWebhookSigningSecret(
                supabase,
                target
              )

              if (!signingSecret) {
                return
              }

              const payload = buildApiV3WebhookPayload({
                dappId,
                dappUserUuid: dappUser.uuid,
                legacyEventType: webhook,
                requestId: context.requestId,
                stampId: stampid,
              })
              const payloadBody = serializeApiV3WebhookPayload(payload)
              const headers = buildApiV3WebhookHeaders({
                body: payloadBody,
                eventId: payload.eventId,
                secret: signingSecret,
              })

              let insertedData: any
              const { data: existingEvents, error: existingEventsError } =
                await supabase
                  .from("webhook_events")
                  .select("*")
                  .eq("dapp_id", dappId)
                  .eq("event_id", payload.eventId)

              if (existingEventsError) {
                throw existingEventsError
              }

              const attemptNumber = Number(existingEvents?.[0]?.retries ?? 0) + 1
              if (existingEvents?.[0]) {
                const { data: updatedEvents, error: updateError } = await supabase
                  .from("webhook_events")
                  .update({
                    api_version: payload.apiVersion,
                    dapp_id: dappId,
                    event_id: payload.eventId,
                    event_type: webhook,
                    last_attempt_at: new Date().toISOString(),
                    payload,
                    payload_version: payload.payloadVersion,
                    retries: attemptNumber,
                  })
                  .eq("id", existingEvents?.[0]?.id)
                  .select("*")

                if (updateError) {
                  throw updateError
                }

                insertedData = updatedEvents?.[0]
              } else {
                const { data: insertedEvents, error: insertError } = await supabase
                  .from("webhook_events")
                  .insert({
                    api_version: payload.apiVersion,
                    dapp_id: dappId,
                    event_id: payload.eventId,
                    event_type: webhook,
                    last_attempt_at: new Date().toISOString(),
                    payload,
                    payload_version: payload.payloadVersion,
                    retries: attemptNumber,
                  })
                  .select("*")

                if (insertError) {
                  throw insertError
                }

                insertedData = insertedEvents?.[0]
              }

              try {
                const response = await axios.post(
                  targetUrl,
                  payloadBody,
                  {
                    headers,
                  }
                )

                const { error: deliveryError } = await supabase
                  .from("webhook_event_deliveries")
                  .insert({
                    attempt_number: attemptNumber,
                    delivery_status: "succeeded",
                    dapp_id: dappId,
                    event_id: payload.eventId,
                    request_body: payload,
                    request_headers: {
                      "X-Cubid-Event-Id": headers["X-Cubid-Event-Id"],
                      "X-Cubid-Signature-Version":
                        headers["X-Cubid-Signature-Version"],
                      "X-Cubid-Timestamp": headers["X-Cubid-Timestamp"],
                    },
                    response_body:
                      typeof response.data === "string"
                        ? response.data
                        : JSON.stringify(response.data ?? null),
                    response_status_code: response.status,
                    signature_version: headers["X-Cubid-Signature-Version"],
                    webhook_event_id: insertedData.id,
                  })

                if (deliveryError) {
                  throw deliveryError
                }
              } catch (error: any) {
                await supabase.from("webhook_event_deliveries").insert({
                  attempt_number: attemptNumber,
                  delivery_status: "failed",
                  dapp_id: dappId,
                  error_category: classifyApiV3WebhookDeliveryError(error),
                  event_id: payload.eventId,
                  request_body: payload,
                  request_headers: {
                    "X-Cubid-Event-Id": headers["X-Cubid-Event-Id"],
                    "X-Cubid-Signature-Version":
                      headers["X-Cubid-Signature-Version"],
                    "X-Cubid-Timestamp": headers["X-Cubid-Timestamp"],
                  },
                  response_body:
                    typeof error?.response?.data === "string"
                      ? error.response.data
                      : JSON.stringify(
                          error?.response?.data ??
                            error?.message ??
                            "Unknown error"
                        ),
                  response_status_code: error?.response?.status ?? null,
                  signature_version: headers["X-Cubid-Signature-Version"],
                  webhook_event_id: insertedData.id,
                })
              }
            })
          )
        })
      )

      return res.status(200).json({ data: true })
    }
  )
}
