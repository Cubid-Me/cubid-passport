import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listDappUserBlockchainAccounts } from "@/lib/server/blockchainAccounts"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  chain: passportSchemas.z.enum(["evm", "near", "solana"]).optional(),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid(),
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
      rateLimitGroup: "passport_dapp_read",
      route: "v3.accounts.list",
    },
    async ({ body, context }) => {
      const accounts = await listDappUserBlockchainAccounts({
        chain: body.chain ?? null,
        dappId: context.dapp.id,
        dappUserUuid: body.dapp_user_uuid,
        supabase: getPassportSupabase(),
      })

      if (!accounts) {
        return res.status(404).json({
          error: {
            code: "not_found",
            message: "Dapp user was not found for the authenticated app.",
            requestId: context.requestId,
          },
        })
      }

      return res.status(200).json({ data: accounts })
    }
  )
}
