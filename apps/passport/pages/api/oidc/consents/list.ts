import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listPassportOidcConsents } from "@/lib/server/oidcConsentManagement"

const listConsents = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.oidc.consents.list",
    },
    async () => {
      const data = await listPassportOidcConsents(req)
      return res.status(200).json({ data })
    }
  )
}

export default listConsents
