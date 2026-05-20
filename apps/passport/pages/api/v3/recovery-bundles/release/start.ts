import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  getApiV3IdempotencyKey,
  runApiV3IdempotentWrite,
} from "@/lib/server/apiV3Idempotency"
import { createRecoverableWalletRecoveryReleaseSession } from "@/lib/server/recoverableWalletRecovery"
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
  recovery_bundle_id: passportSchemas.z.string().trim().min(1).max(160).optional(),
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
      route: "v3.recovery_bundles.release.start",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const response = await runApiV3IdempotentWrite({
        actorIdentifier: context.actorIdentifier,
        actorType: context.actorType,
        body,
        idempotencyKey: getApiV3IdempotencyKey(req),
        requestId: context.requestId,
        route: "v3.recovery_bundles.release.start",
        supabase,
        handler: async () => {
          const session = await createRecoverableWalletRecoveryReleaseSession({
            actorIdentifier: context.actorIdentifier,
            dappId: context.dapp.id,
            dappUserUuid: body.dapp_user_uuid,
            providerKey: body.provider_key ?? null,
            recoveryBundleId: body.recovery_bundle_id ?? null,
            requestId: context.requestId,
            supabase,
          })

          return {
            body: { data: session },
            statusCode: 200,
          }
        },
      })

      return res.status(response.statusCode).json(response.body)
    }
  )
}
