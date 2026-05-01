import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { ApiSecurityError } from "@cubid/auth/server"
import {
  filterDisclosedStamps,
  loadDappDisclosureGrants,
} from "@/lib/server/disclosureGrants"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  uid: passportSchemas.z.string().min(1),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: schema,
      rateLimitGroup: "passport_dapp_read",
      route: "dapp.get_score_details",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.uid)

      if (dappUsersError) {
        throw dappUsersError
      }

      const dappUser = dappUsers?.[0]
      if (!dappUser || String(dappUser.dapp_id) !== String(context.dapp.id)) {
        throw new ApiSecurityError(
          404,
          "not_found",
          "User not found for this dapp."
        )
      }

      const dappId = dappUser.dapp_id
      const userId = dappUser.user_id
      const [stampDataResponse, scoreDataResponse, stampsListResponse] =
        await Promise.all([
          supabase
            .from("dapp_stamptypes")
            .select("*,stamptypes:stamptype_id(*)")
            .eq("dapp_id", dappId),
          supabase
            .from("stampscore_dapps")
            .select("*,stampscore_schemas:schema_id(*)")
            .eq("dapp_id", dappId),
          supabase.from("stamps").select("*").eq("created_by_user_id", userId),
        ])

      if (stampDataResponse.error) {
        throw stampDataResponse.error
      }
      if (scoreDataResponse.error) {
        throw scoreDataResponse.error
      }
      if (stampsListResponse.error) {
        throw stampsListResponse.error
      }

      const { data: stampScores, error: stampScoresError } = await supabase
        .from("stampscores_available")
        .select("*")
        .eq("schema_id", scoreDataResponse.data?.[0]?.schema_id)

      if (stampScoresError) {
        throw stampScoresError
      }

      const disclosureGrants = await loadDappDisclosureGrants(supabase, {
        dappId: context.dapp.id,
        dappUserUuid: body.uid,
      })
      const disclosedStamps = filterDisclosedStamps(
        disclosureGrants,
        stampsListResponse.data ?? []
      )
      const allStampIds = disclosedStamps.map(
        (item: any) => item.stamptype
      )
      const score = (stampDataResponse.data ?? [])
        .filter((item: any) => allStampIds.includes(item?.stamptypes?.id))
        .map((item: any) => {
          const scoreRow = (stampScores ?? []).find(
            (score: any) => score.stamptype_id === item.stamptype_id
          )

          return {
            [item.stamptypes.stamptype]: scoreRow?.score,
          }
        })

      return res.status(200).json({ score })
    }
  )
}
