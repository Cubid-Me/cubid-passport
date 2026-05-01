import crypto from "crypto"
import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import { handlePassportRoute } from "@/lib/server/passportApi"
import {
  isStampDisclosed,
  loadDappDisclosureGrants,
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

function createSignature(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
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
    async () => {
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

          await Promise.all(
            (dappUsers ?? []).map(async (dappUser: any) => {
              const dappId = dappUser?.dapp_id ?? dappUser?.id
              const disclosureGrants = await loadDappDisclosureGrants(supabase, {
                dappId,
                dappUserUuid: dappUser.uuid,
              })
              if (!isStampDisclosed(disclosureGrants, stampRows?.[0])) {
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

              const signature = createSignature(
                JSON.stringify({ stampid }),
                signingSecret
              )

              let insertedData: any
              const { data: existingEvents, error: existingEventsError } =
                await supabase
                  .from("webhook_events")
                  .select("*")
                  .match({
                    event_type: webhook,
                    payload: {
                      stampid,
                    },
                  })

              if (existingEventsError) {
                throw existingEventsError
              }

              if ((webhookRows ?? []).length !== 0) {
                const { data: updatedEvents, error: updateError } = await supabase
                  .from("webhook_events")
                  .update({
                    event_type: webhook,
                    payload: { stampid },
                    retires: (existingEvents ?? []).length,
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
                    event_type: webhook,
                    payload: { stampid },
                    retires: (existingEvents ?? []).length,
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
                    attempt_number: insertedData?.attempt_number,
                    delivery_status: "succeeded",
                    dapp_id: dappId,
                    response_body: response.data,
                    response_status_code: response.status,
                    webhook_event_id: insertedData.id,
                  })

                if (deliveryError) {
                  throw deliveryError
                }
              } catch (error: any) {
                await supabase.from("webhook_event_deliveries").insert({
                  attempt_number: insertedData?.attempt_number,
                  delivery_status: "failed",
                  dapp_id: dappId,
                  error_category: error?.response ? "client_error" : "request_error",
                  response_body: error?.response?.data ?? error?.message ?? error,
                  response_status_code: error?.response?.status ?? null,
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
