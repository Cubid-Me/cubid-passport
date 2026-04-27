import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { createGeneratedBlockchainAccount } from "@/lib/server/blockchainAccounts"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  chain: passportSchemas.z.enum(["evm", "near", "solana"]),
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
      const account = await createGeneratedBlockchainAccount({
        chain: body.chain,
        dappId: context.dapp.id,
        dappUserUuid: body.dapp_user_uuid,
        label: body.label ?? null,
        requestId: context.requestId,
        supabase: getPassportSupabase(),
      })

      if (!account) {
        return res.status(404).json({
          error: {
            code: "not_found",
            message: "Dapp user was not found for the authenticated app.",
            requestId: context.requestId,
          },
        })
      }

      return res.status(200).json({ data: account })
    }
  )
}
