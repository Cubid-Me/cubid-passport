import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
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
      route: "dapp.fetch_score",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.uid)

      if (dappUsersError) {
        throw dappUsersError
      }

      const dappId = dappUsers?.[0]?.dapp_id
      const userId = dappUsers?.[0]?.user_id
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

      const schemaId = scoreDataResponse.data?.[0]?.schema_id
      const { data: stampScores, error: stampScoresError } = await supabase
        .from("stampscores_available")
        .select("*")
        .eq("schema_id", schemaId)

      if (stampScoresError) {
        throw stampScoresError
      }

      const allStampIds = (stampsListResponse.data ?? []).map(
        (item: any) => item.stamptype
      )
      const stampScore = (stampDataResponse.data ?? [])
        .filter((item: any) => allStampIds.includes(item?.stamptypes?.id))
        .reduce((currentScore: number, item: any) => {
          const scoreRow = (stampScores ?? []).find(
            (score: any) => score.stamptype_id === item.stamptype_id
          )

          return currentScore + (scoreRow?.score ?? 0)
        }, 0)

      return res.status(200).json({ score: stampScore })
    }
  )
}
