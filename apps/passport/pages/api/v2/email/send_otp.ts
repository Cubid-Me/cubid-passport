import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  createEmailOtpExpiry,
  EMAIL_OTP_HASH_ALGORITHM,
  EMAIL_OTP_HASH_VERSION,
  generateOtp,
  hashEmailOtp,
  normalizeOtpEmail,
  sendOtpEmail,
} from "@/lib/server/emailOtp"
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
      const email = normalizeOtpEmail(body.email)
      const supabase = getPassportSupabase()
      await supabase.from("email_otp").delete().eq("email", email)

      const otp = generateOtp()
      const { error } = await supabase.from("email_otp").insert({
        attempt_count: 0,
        consumed_at: null,
        email,
        expires_at: createEmailOtpExpiry(),
        hash_algorithm: EMAIL_OTP_HASH_ALGORITHM,
        hash_version: EMAIL_OTP_HASH_VERSION,
        otp_hash: await hashEmailOtp(supabase, email, otp),
      })

      if (error) {
        throw error
      }

      await sendOtpEmail(email, otp)

      return res.status(200).json({
        data: {
          dappId: context.dapp.id,
          email,
          sent: true,
        },
      })
    }
  )
}
