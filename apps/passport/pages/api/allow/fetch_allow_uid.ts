import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  page_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]),
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
      route: "allow.fetch_allow_uid",
    },
    async ({ body }) => {
      const pageId = Number(body.page_id)
      const supabase = getPassportSupabase()

      const [
        dappUsersResponse,
        dappPageResponse,
        stampDataResponse,
      ] = await Promise.all([
        supabase
          .from("dapp_users")
          .select("*,users:user_id(*),dapps:dapp_id(*)")
          .eq("uuid", body.uid),
        supabase.from("dapp_pages").select("*").eq("id", pageId),
        supabase
          .from("dapp_stamptypes")
          .select("*,stamptypes:stamptype_id(*),dapps:dapp_id(*)")
          .eq("page_id", pageId),
      ])

      if (dappUsersResponse.error) {
        throw dappUsersResponse.error
      }
      if (dappPageResponse.error) {
        throw dappPageResponse.error
      }
      if (stampDataResponse.error) {
        throw stampDataResponse.error
      }

      const dappId = dappPageResponse.data?.[0]?.dapp_id
      const [scoreDataResponse, stampScoresResponse] = await Promise.all([
        supabase
          .from("stampscore_dapps")
          .select("*,stampscore_schemas:schema_id(*)")
          .eq("dapp_id", dappId),
        supabase
          .from("stampscores_available")
          .select("*")
          .eq("schema_id", 2),
      ])

      if (scoreDataResponse.error) {
        throw scoreDataResponse.error
      }
      if (stampScoresResponse.error) {
        throw stampScoresResponse.error
      }

      return res.status(200).json({
        dapp_users: dappUsersResponse.data ?? [],
        error: null,
        page_data: dappPageResponse.data?.[0] ?? null,
        scoreData: scoreDataResponse.data ?? [],
        stampScores: stampScoresResponse.data ?? [],
        stampsToSend: stampDataResponse.data ?? [],
      })
    }
  )
}
