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
      route: "page_id_details",
    },
    async ({ body }) => {
      const { data, error } = await getPassportSupabase()
        .from("dapp_stamptypes")
        .select("*,dapp_id:dapps(*)")
        .eq("page_id", Number(body.page_id))

      if (error) {
        throw error
      }

      return res.status(200).json({
        dapp_data: data?.[0] ?? null,
      })
    }
  )
}
