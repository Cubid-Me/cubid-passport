import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getSiwcSigningRequestForDapp } from "@/lib/server/siwcSigningRequests"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  signing_request_id: passportSchemas.z.string().min(1),
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
      route: "v3.signing.requests.get",
    },
    async ({ body, context }) => {
      const data = await getSiwcSigningRequestForDapp({
        dappId: context.dapp.id,
        signingRequestId: body.signing_request_id,
        supabase: getPassportSupabase(),
      })

      return res.status(200).json({ data })
    }
  )
}
