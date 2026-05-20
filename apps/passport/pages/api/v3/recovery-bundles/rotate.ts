import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  getApiV3IdempotencyKey,
  runApiV3IdempotentWrite,
} from "@/lib/server/apiV3Idempotency"
import { rotateRecoverableWalletRecoveryBundle } from "@/lib/server/recoverableWalletRecovery"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  bundle_material: passportSchemas.z.string().min(1).max(100_000),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid(),
  expires_at: passportSchemas.z.string().datetime().optional(),
  metadata: passportSchemas.z.record(passportSchemas.z.unknown()).optional(),
  new_recovery_bundle_id: passportSchemas.z.string().trim().min(1).max(160).optional(),
  provider_key: passportSchemas.z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,64}$/)
    .optional(),
  recovery_bundle_id: passportSchemas.z.string().trim().min(1).max(160),
  recovery_reference: passportSchemas.z.string().trim().max(200).optional(),
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
      route: "v3.recovery_bundles.rotate",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const response = await runApiV3IdempotentWrite({
        actorIdentifier: context.actorIdentifier,
        actorType: context.actorType,
        body,
        idempotencyKey: getApiV3IdempotencyKey(req),
        requestId: context.requestId,
        route: "v3.recovery_bundles.rotate",
        supabase,
        handler: async () => {
          const status = await rotateRecoverableWalletRecoveryBundle({
            actorIdentifier: context.actorIdentifier,
            bundleMaterial: body.bundle_material,
            dappId: context.dapp.id,
            dappUserUuid: body.dapp_user_uuid,
            expiresAt: body.expires_at ?? null,
            metadata: body.metadata ?? null,
            newRecoveryBundleId: body.new_recovery_bundle_id ?? null,
            providerKey: body.provider_key ?? null,
            recoveryBundleId: body.recovery_bundle_id,
            recoveryReference: body.recovery_reference ?? null,
            requestId: context.requestId,
            supabase,
          })

          return {
            body: { data: status },
            statusCode: 200,
          }
        },
      })

      return res.status(response.statusCode).json(response.body)
    }
  )
}
