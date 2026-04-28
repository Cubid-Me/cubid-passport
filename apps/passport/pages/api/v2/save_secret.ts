import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  secret: passportSchemas.z.string().min(1),
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
      route: "v2.save_secret",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const { data: existingRows, error: existingError } = await supabase
        .from("dapp_user_secrets")
        .select("*")
        .eq("dapp_user_uuid", body.user_id)

      if (existingError) {
        throw existingError
      }

      const { error } = await supabase.from("dapp_user_secrets").insert({
        dapp_user_uuid: body.user_id,
        secret: body.secret,
        secret_sequential_id: (existingRows ?? []).length + 1,
      })

      if (error) {
        throw error
      }

      return res.status(200).json({ success: true })
    }
  )
}
