import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  stamp_id_array: passportSchemas.z.array(
    passportSchemas.z.union([
      passportSchemas.z.number().int().positive(),
      passportSchemas.z.string().min(1),
    ])
  ),
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
      rateLimitGroup: "passport_dapp_mutation",
      route: "verify.add_stamp_perm",
    },
    async ({ body }) => {
      await Promise.all(
        body.stamp_id_array.map(async (item) => {
          const { error } = await getPassportSupabase()
            .from("stamp_dappuser_permissions")
            .insert({
              can_delete: true,
              can_read: true,
              can_write: true,
              dappuser_id: body.user_id,
              stamp_id: Number(item),
            })

          if (error) {
            throw error
          }
        })
      )

      return res.status(200).json({
        success: true,
      })
    }
  )
}
