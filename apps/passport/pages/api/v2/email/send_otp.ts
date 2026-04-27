import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { sendOtpEmail, generateOtp } from "@/lib/server/emailOtp"
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
      rateLimitGroup: "passport_otp",
      route: "v2.email.send_otp",
    },
    async ({ body, context }) => {
      await getPassportSupabase().from("email_otp").delete().eq("email", body.email)

      const otp = generateOtp()
      const { error } = await getPassportSupabase().from("email_otp").insert({
        email: body.email,
        otp,
      })

      if (error) {
        throw error
      }

      await sendOtpEmail(body.email, otp)

      return res.status(200).json({
        data: {
          dappId: context.dapp.id,
          email: body.email,
          sent: true,
        },
      })
    }
  )
}
