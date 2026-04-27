import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  chain: passportSchemas.z.string().min(1),
  dapp_uid: passportSchemas.z.string().min(1),
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
      route: "wallet.fetch",
    },
    async ({ body }) => {
      const { data, error } = await getPassportSupabase()
        .from("wallet_list")
        .select("*")
        .match({
          chain: body.chain,
          dapp_user: body.dapp_uid,
        })

      if (error) {
        throw error
      }

      return res.status(200).json({ data: data ?? [] })
    }
  )
}
