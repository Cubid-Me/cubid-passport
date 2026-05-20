import type { NextApiRequest, NextApiResponse } from "next"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"

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
    async () => {
      throw new ApiSecurityError(
        410,
        "cubid_generated_wallets_deprecated",
        "Cubid-generated wallet creation is deprecated. Use app-mediated recoverable wallets with Cubid recovery bundles instead."
      )
    }
  )
}
