import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  email: passportSchemas.z.string().email(),
  otp: passportSchemas.z.union([
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
      actor: "dapp",
      bodySchema: schema,
      rateLimitGroup: "passport_otp",
      route: "v2.email.verify_otp",
    },
    async ({ body, context }) => {
      const { data: emailData, error } = await getPassportSupabase()
        .from("email_otp")
        .select("*")
        .eq("email", body.email)
        .maybeSingle()

      if (error) {
        throw error
      }

      const otp = typeof body.otp === "string" ? Number(body.otp) : body.otp
      const isVerified = otp === emailData?.otp

      if (isVerified) {
        const { error: deleteError } = await getPassportSupabase()
          .from("email_otp")
          .delete()
          .eq("email", body.email)

        if (deleteError) {
          throw deleteError
        }
      }

      return res.status(200).json({
        data: {
          dappId: context.dapp.id,
          email: body.email,
          is_verified: isVerified,
        },
      })
    }
  )
}
