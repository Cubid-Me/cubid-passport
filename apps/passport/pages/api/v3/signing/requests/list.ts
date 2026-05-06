import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listSiwcSigningRequestsForDapp } from "@/lib/server/siwcSigningRequests"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid().optional(),
  limit: passportSchemas.z.number().int().min(1).max(100).optional(),
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
      route: "v3.signing.requests.list",
    },
    async ({ body, context }) => {
      const data = await listSiwcSigningRequestsForDapp({
        dappId: context.dapp.id,
        dappUserUuid: body.dapp_user_uuid ?? null,
        limit: body.limit,
        supabase: getPassportSupabase(),
      })

      return res.status(200).json({ data })
    }
  )
}
