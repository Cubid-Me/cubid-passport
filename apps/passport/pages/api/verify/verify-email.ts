import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  allStamps: passportSchemas.z.unknown().optional(),
  apikey: passportSchemas.z.string().min(1),
  dappuser_id: passportSchemas.z.string().min(1).optional(),
  email: passportSchemas.z.string().email(),
  otp: passportSchemas.z.string().min(1),
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
      route: "verify.verify_email",
    },
    async ({ body }) => {
      const { data, error } = await getPassportSupabase().auth.verifyOtp({
        email: body.email,
        token: body.otp,
        type: "email",
      })

      return res.status(200).json({
        error,
        success: Boolean(data?.user?.id),
      })
    }
  )
}
