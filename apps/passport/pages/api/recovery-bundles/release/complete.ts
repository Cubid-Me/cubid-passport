import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { releaseRecoverableWalletRecoveryBundle } from "@/lib/server/recoverableWalletRecovery"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  recovery_session_id: passportSchemas.z.string().trim().min(1).max(160),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: schema,
      rateLimitGroup: "passport_user_mutation",
      route: "passport.recovery_bundles.release.complete",
    },
    async ({ body, context }) => {
      const release = await releaseRecoverableWalletRecoveryBundle({
        firebaseToken: context.firebaseToken,
        recoverySessionId: body.recovery_session_id,
        requestId: context.requestId,
        supabase: getPassportSupabase(),
      })

      return res.status(200).json({ data: release })
    }
  )
}
