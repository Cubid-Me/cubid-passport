import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { verifyPhoneOtp } from "@/lib/server/twilioVerify"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  otpCode: passportSchemas.z.string().min(1),
  phone: passportSchemas.z.string().min(1),
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
      route: "passport.v2.twilio.verify_otp",
    },
    async ({ body }) => {
      const data = await verifyPhoneOtp({
        otpCode: body.otpCode,
        phone: body.phone,
      })
      return res.status(200).json({ data })
    }
  )
}
