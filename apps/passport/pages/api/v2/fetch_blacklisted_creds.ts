import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  cred: passportSchemas.z.string().min(1),
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
      route: "v2.fetch_blacklisted_creds",
    },
    async ({ body, context }) => {
      const { data, error } = await getPassportSupabase()
        .from("all_blacklisted_stamps_raw")
        .select("*")
        .match({
          dapp_id: context.dapp.id,
          uniquevalue: body.cred,
        })

      if (error) {
        throw error
      }

      return res.status(200).json({
        is_blacklisted: Boolean(data?.[0]),
        success: true,
      })
    }
  )
}
