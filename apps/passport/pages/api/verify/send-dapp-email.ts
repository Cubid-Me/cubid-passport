import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  email: passportSchemas.z.string().email(),
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
      route: "verify.send_dapp_email",
    },
    async ({ body }) => {
      const { data, error } = await getPassportSupabase().auth.signInWithOtp({
        email: body.email,
      })

      return res.status(200).json({
        data,
        error,
        success: true,
      })
    }
  )
}
