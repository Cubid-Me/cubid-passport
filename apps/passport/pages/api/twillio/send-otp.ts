import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { sendPhoneOtp } from "@/lib/server/twilioVerify"

const schema = passportSchemas.z.object({
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
      route: "passport.twilio.send_otp",
    },
    async ({ body }) => {
      await sendPhoneOtp(body.phone)
      return res.status(200).json({ data: { status: "sent" } })
    }
  )
}
