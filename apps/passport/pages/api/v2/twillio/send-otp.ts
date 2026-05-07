import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { sendPhoneOtp } from "@/lib/server/twilioVerify"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
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
      route: "passport.v2.twilio.send_otp",
    },
    async ({ body }) => {
      await sendPhoneOtp(body.phone)
      return res.status(200).json({ data: { status: "sent" } })
    }
  )
}
