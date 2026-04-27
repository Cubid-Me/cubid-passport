import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import crypto from "crypto"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"
import { resolveWebhookSigningSecret } from "@/lib/server/webhookSigningSecrets"

function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

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
    async ({ body }) => {
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

          await Promise.all(
            (dappUsers ?? []).map(async (dappUser) => {
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

              const signature = createSignature(
                JSON.stringify({ stampid }),
                signingSecret
              )

              const { data: existingEvents, error: existingEventsError } =
                await supabase
                  .from("webhook_events")
                  .select("*")
                  .match({
                    dapp_id: dappUser.dapp_id,
                    event_type: body.webhook,
                    payload: { stampid },
                  })

              if (existingEventsError) {
                throw existingEventsError
              }

              let eventRow = existingEvents?.[0] ?? null
              if (eventRow) {
                const { data: updatedEvents, error: updateError } = await supabase
                  .from("webhook_events")
                  .update({
                    dapp_id: dappUser.dapp_id,
                    event_type: body.webhook,
                    payload: { stampid },
                    retries: (existingEvents ?? []).length,
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
                    dapp_id: dappUser.dapp_id,
                    event_type: body.webhook,
                    payload: { stampid },
                    retries: 0,
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
                  { stampid },
                  {
                    headers: {
                      "X-Cubid-Signature": signature,
                    },
                  }
                )

                const { error: deliveryError } = await supabase
                  .from("webhook_event_deliveries")
                  .insert({
                    attempt_number: Number(eventRow?.retries ?? 0) + 1,
                    delivery_status: "succeeded",
                    dapp_id: dappUser.dapp_id,
                    response_body: response.data,
                    response_status_code: response.status,
                    webhook_event_id: eventRow?.id,
                  })

                if (deliveryError) {
                  throw deliveryError
                }
              } catch (error: any) {
                const { error: deliveryError } = await supabase
                  .from("webhook_event_deliveries")
                  .insert({
                    attempt_number: Number(eventRow?.retries ?? 0) + 1,
                    delivery_status: "failed",
                    dapp_id: dappUser.dapp_id,
                    error_category: error?.response ? "client_error" : "network_error",
                    response_body: error?.response?.data ?? error?.message ?? "Unknown error",
                    response_status_code: error?.response?.status ?? 500,
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
