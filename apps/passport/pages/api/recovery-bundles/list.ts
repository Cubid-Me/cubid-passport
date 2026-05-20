import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listRecoverableWalletRecoveryBundlesForUser } from "@/lib/server/recoverableWalletRecovery"
import { getPassportSupabase } from "@/lib/server/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.recovery_bundles.list",
    },
    async ({ context }) => {
      const data = await listRecoverableWalletRecoveryBundlesForUser({
        firebaseToken: context.firebaseToken,
        supabase: getPassportSupabase(),
      })

      return res.status(200).json({ data })
    }
  )
}
