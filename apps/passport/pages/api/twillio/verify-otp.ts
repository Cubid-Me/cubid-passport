import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { verifyPhoneOtp } from "@/lib/server/twilioVerify"

const schema = passportSchemas.z.object({
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
      actor: "anonymous",
      bodySchema: schema,
      rateLimitGroup: "passport_otp",
      route: "passport.twilio.verify_otp",
    },
    async ({ body }) => {
      const data = await verifyPhoneOtp(body)
      return res.status(200).json({ data })
    }
  )
}
