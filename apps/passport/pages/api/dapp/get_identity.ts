import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const keysToUse: Record<number, string> = {
  1: "facebook",
  2: "github",
  3: "google",
  4: "twitter",
  5: "discord",
  6: "poh",
  7: "near-wallet",
  8: "brightid",
  9: "gitcoin",
  10: "instagram",
  11: "phone",
  12: "gooddollar",
  13: "email",
  14: "evm",
  17: "fractal",
  22: "linkedin",
  26: "worldcoin",
  27: "telegram",
}

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
      route: "dapp.get_identity",
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

      const userId = dappUsers?.[0]?.user_id
      const { data: stampsList, error: stampsError } = await supabase
        .from("stamps")
        .select("*,stamptypes:stamptype(*)")
        .eq("created_by_user_id", userId)

      if (stampsError) {
        throw stampsError
      }

      const scoreDetails = (stampsList ?? []).map((item: any) => ({
        [keysToUse[item.stamptype] ?? String(item.stamptype)]: item.uniquevalue,
      }))

      return res.status(200).json({
        score_details: scoreDetails,
        user: dappUsers?.[0]?.users ?? null,
      })
    }
  )
}
