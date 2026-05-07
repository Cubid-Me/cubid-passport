import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
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

const schema = passportSchemas.z.object({
  stamparray: passportSchemas.z.array(passportSchemas.z.number().int().positive()),
  webhook: passportSchemas.z.enum([
    "credential_added",
    "credential_blacklisted",
    "credential_removed",
    "credential_whitelisted",
    "score_decrease",
    "score_increase",
  ]),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "internal",
      bodySchema: schema,
      rateLimitGroup: "passport_internal",
      route: "passport.internal.webhook_trigger",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()

      await Promise.all(
        body.stamparray.map(async (stampid) => {
          const { data: stampRows, error: stampError } = await supabase
            .from("stamps")
            .select("*")
            .eq("id", stampid)

          if (stampError) {
            throw stampError
          }

          const stampRow = stampRows?.[0]
          if (!stampRow) {
            return
          }

          const { data: dappUsers, error: dappUserError } = await supabase
            .from("dapp_users")
            .select("*")
            .eq("user_id", stampRow.created_by_user_id)

          if (dappUserError) {
            throw dappUserError
          }

          const grantSetsByDappUser = await loadDappDisclosureGrantsForStamp(
            supabase,
            (dappUsers ?? []).map((dappUser) => ({
              dappId: dappUser.dapp_id,
              dappUserUuid: dappUser.uuid,
            })),
            stampRow
          )

          await Promise.all(
            (dappUsers ?? []).map(async (dappUser) => {
              const disclosureGrants = grantSetsByDappUser.get(dappUser.uuid)
              if (!isStampDisclosed(disclosureGrants, stampRow)) {
                return
              }

              const { data: webhookSubscriptions, error: webhookError } =
                await supabase
                  .from("dapp_webhook_subscriptions")
                  .select("*")
                  .match({
                    dapp: dappUser.dapp_id,
                    webhook: body.webhook,
                  })

              if (webhookError) {
                throw webhookError
              }

              const subscription = webhookSubscriptions?.[0]
              if (!subscription) {
                return
              }

              const signingSecret = await resolveWebhookSigningSecret(
                supabase,
                subscription
              )

              if (!signingSecret || !subscription.webhook_url) {
                return
              }

              const payload = buildApiV3WebhookPayload({
                dappId: dappUser.dapp_id,
                dappUserUuid: dappUser.uuid,
                legacyEventType: body.webhook,
                requestId: context.requestId,
                stampId: stampid,
              })
              const payloadBody = serializeApiV3WebhookPayload(payload)
              const headers = buildApiV3WebhookHeaders({
                body: payloadBody,
                eventId: payload.eventId,
                secret: signingSecret,
              })

              const { data: existingEvents, error: existingEventsError } =
                await supabase
                  .from("webhook_events")
                  .select("*")
                  .eq("dapp_id", dappUser.dapp_id)
                  .eq("event_id", payload.eventId)

              if (existingEventsError) {
                throw existingEventsError
              }

              let eventRow = existingEvents?.[0] ?? null
              const attemptNumber = Number(eventRow?.retries ?? 0) + 1
              if (eventRow) {
                const { data: updatedEvents, error: updateError } = await supabase
                  .from("webhook_events")
                  .update({
                    api_version: payload.apiVersion,
                    dapp_id: dappUser.dapp_id,
                    event_id: payload.eventId,
                    event_type: body.webhook,
                    last_attempt_at: new Date().toISOString(),
                    payload,
                    payload_version: payload.payloadVersion,
                    retries: attemptNumber,
                  })
                  .eq("id", eventRow.id)
                  .select("*")

                if (updateError) {
                  throw updateError
                }

                eventRow = updatedEvents?.[0] ?? eventRow
              } else {
                const { data: insertedEvents, error: insertError } = await supabase
                  .from("webhook_events")
                  .insert({
                    api_version: payload.apiVersion,
                    dapp_id: dappUser.dapp_id,
                    event_id: payload.eventId,
                    event_type: body.webhook,
                    last_attempt_at: new Date().toISOString(),
                    payload,
                    payload_version: payload.payloadVersion,
                    retries: attemptNumber,
                  })
                  .select("*")

                if (insertError) {
                  throw insertError
                }

                eventRow = insertedEvents?.[0] ?? null
              }

              try {
                const response = await axios.post(
                  subscription.webhook_url,
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
                    dapp_id: dappUser.dapp_id,
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
                    webhook_event_id: eventRow?.id,
                  })

                if (deliveryError) {
                  throw deliveryError
                }
              } catch (error: any) {
                const { error: deliveryError } = await supabase
                  .from("webhook_event_deliveries")
                  .insert({
                    attempt_number: attemptNumber,
                    delivery_status: "failed",
                    dapp_id: dappUser.dapp_id,
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
                    response_status_code: error?.response?.status ?? 500,
                    signature_version: headers["X-Cubid-Signature-Version"],
                    webhook_event_id: eventRow?.id,
                  })

                if (deliveryError) {
                  throw deliveryError
                }
              }
            })
          )
        })
      )

      return res.status(200).json({ data: { success: true } })
    }
  )
}
