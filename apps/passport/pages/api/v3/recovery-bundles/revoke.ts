import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { revokeRecoverableWalletRecoveryBundle } from "@/lib/server/recoverableWalletRecovery"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid(),
  provider_key: passportSchemas.z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,64}$/)
    .optional(),
  recovery_bundle_id: passportSchemas.z.string().trim().min(1).max(160),
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
      route: "v3.recovery_bundles.revoke",
    },
    async ({ body, context }) => {
      const status = await revokeRecoverableWalletRecoveryBundle({
        actorIdentifier: context.actorIdentifier,
        dappId: context.dapp.id,
        dappUserUuid: body.dapp_user_uuid,
        providerKey: body.provider_key ?? null,
        recoveryBundleId: body.recovery_bundle_id,
        requestId: context.requestId,
        supabase: getPassportSupabase(),
      })

      return res.status(200).json({ data: status })
    }
  )
}
