import type { NextApiRequest, NextApiResponse } from "next"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  getApiV3IdempotencyKey,
  runApiV3IdempotentWrite,
} from "@/lib/server/apiV3Idempotency"
import { createGeneratedBlockchainAccount } from "@/lib/server/blockchainAccounts"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  chain: passportSchemas.z.enum(["evm", "near", "solana", "sui"]),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid(),
  label: passportSchemas.z.string().trim().min(1).max(120).optional(),
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
      route: "v3.accounts.generate",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const response = await runApiV3IdempotentWrite({
        actorIdentifier: context.actorIdentifier,
        actorType: context.actorType,
        body,
        idempotencyKey: getApiV3IdempotencyKey(req),
        requestId: context.requestId,
        route: "v3.accounts.generate",
        supabase,
        handler: async () => {
          const account = await createGeneratedBlockchainAccount({
            chain: body.chain,
            dappId: context.dapp.id,
            dappUserUuid: body.dapp_user_uuid,
            label: body.label ?? null,
            requestId: context.requestId,
            supabase,
          })

          if (!account) {
            throw new ApiSecurityError(
              404,
              "not_found",
              "Dapp user was not found for the authenticated app."
            )
          }

          return { body: { data: account }, statusCode: 200 }
        },
      })

      return res.status(response.statusCode).json(response.body)
    }
  )
}
