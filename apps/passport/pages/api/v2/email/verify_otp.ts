import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  EMAIL_OTP_MAX_ATTEMPTS,
  normalizeOtpEmail,
  verifyEmailOtpHash,
} from "@/lib/server/emailOtp"
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
      const email = normalizeOtpEmail(body.email)
      const supabase = getPassportSupabase()
      const { data: emailData, error } = await supabase
        .from("email_otp")
        .select("*")
        .eq("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      const attempts = Number(emailData?.attempt_count ?? 0)
      const expiresAt = emailData?.expires_at
        ? new Date(String(emailData.expires_at)).getTime()
        : 0
      const isExpired = !expiresAt || expiresAt <= Date.now()
      const isAttemptLimited = attempts >= EMAIL_OTP_MAX_ATTEMPTS
      const canVerify = Boolean(emailData) && !isExpired && !isAttemptLimited
      const isVerified =
        canVerify &&
        (await verifyEmailOtpHash(
          supabase,
          email,
          body.otp,
          String(emailData?.otp_hash ?? "")
        ))

      if (isVerified) {
        const { error: consumeError } = await supabase
          .from("email_otp")
          .update({
            consumed_at: new Date().toISOString(),
          })
          .eq("id", emailData.id)

        if (consumeError) {
          throw consumeError
        }
      } else if (emailData && !isExpired && !isAttemptLimited) {
        const { error: attemptError } = await supabase
          .from("email_otp")
          .update({
            attempt_count: attempts + 1,
          })
          .eq("id", emailData.id)

        if (attemptError) {
          throw attemptError
        }
      }

      return res.status(200).json({
        data: {
          dappId: context.dapp.id,
          email,
          is_verified: isVerified,
        },
      })
    }
  )
}
