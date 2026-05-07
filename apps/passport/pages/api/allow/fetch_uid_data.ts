import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
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
      actor: "anonymous",
      bodySchema: schema,
      rateLimitGroup: "passport_user_read",
      route: "allow.fetch_uid_data",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const dappUsersResponse = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.uid)

      if (dappUsersResponse.error) {
        throw dappUsersResponse.error
      }

      const dappId = dappUsersResponse.data?.[0]?.dapp_id
      const [stampDataResponse, scoreDataResponse, stampScoresResponse] =
        await Promise.all([
          supabase
            .from("dapp_stamptypes")
            .select("*,stamptypes:stamptype_id(*)")
            .eq("dapp_id", dappId),
          supabase
            .from("stampscore_dapps")
            .select("*,stampscore_schemas:schema_id(*)")
            .eq("dapp_id", dappId),
          supabase
            .from("stampscores_available")
            .select("*")
            .eq("schema_id", 2),
        ])

      if (stampDataResponse.error) {
        throw stampDataResponse.error
      }
      if (scoreDataResponse.error) {
        throw scoreDataResponse.error
      }
      if (stampScoresResponse.error) {
        throw stampScoresResponse.error
      }

      return res.status(200).json({
        dapp_users: dappUsersResponse.data ?? [],
        error: null,
        scoreData: scoreDataResponse.data ?? [],
        stampScores: stampScoresResponse.data ?? [],
        stampsToSend: stampDataResponse.data ?? [],
      })
    }
  )
}
