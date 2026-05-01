import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listPassportAppDisclosureGrants } from "@/lib/server/appDisclosureManagement"

const listAppGrants = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.disclosures.app_grants.list",
    },
    async () => {
      const data = await listPassportAppDisclosureGrants(req)
      return res.status(200).json({ data })
    }
  )
}

export default listAppGrants
