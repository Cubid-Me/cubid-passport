import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listPassportSiwcSigningRequests } from "@/lib/server/siwcSigningRequests"

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
      route: "passport.siwc.signing.requests.list",
    },
    async () => {
      const data = await listPassportSiwcSigningRequests(req)
      return res.status(200).json({ data })
    }
  )
}
