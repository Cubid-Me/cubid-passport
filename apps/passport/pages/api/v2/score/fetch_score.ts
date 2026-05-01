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
  user_id: passportSchemas.z.string().min(1),
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
      route: "v2.score.fetch_score",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.user_id)

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

      const userId = dappUser.users?.id
      const dappId = dappUser.dapp_id
      const [stampDataResponse, scoreDataResponse] = await Promise.all([
        supabase.from("stamps").select("*").eq("created_by_user_id", userId),
        supabase
          .from("stampscore_dapps")
          .select("*,stampscore_schemas:schema_id(*)")
          .eq("dapp_id", dappId),
      ])

      if (stampDataResponse.error) {
        throw stampDataResponse.error
      }
      if (scoreDataResponse.error) {
        throw scoreDataResponse.error
      }

      const schemaId = scoreDataResponse.data?.[0]?.schema_id
      const { data: stampScores, error: stampScoresError } = await supabase
        .from("stampscores_available")
        .select("*")
        .eq("schema_id", schemaId)

      if (stampScoresError) {
        throw stampScoresError
      }

      const disclosureGrants = await loadDappDisclosureGrants(supabase, {
        dappId: context.dapp.id,
        dappUserUuid: body.user_id,
      })
      const disclosedStamps = filterDisclosedStamps(
        disclosureGrants,
        stampDataResponse.data ?? []
      )
      const cubidScore = disclosedStamps.reduce(
        (total: number, item: any) => {
          const scoreRow = (stampScores ?? []).find(
            (score: any) => score.stamptype_id === item.stamptype
          )
          return total + (scoreRow?.score ?? 0)
        },
        0
      )

      return res.status(200).json({
        cubid_score: cubidScore,
        error: null,
        scoring_schema: schemaId ?? null,
      })
    }
  )
}
