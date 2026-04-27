import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listPassportPasskeyDevices } from "@/lib/server/oidcPasskeyManagement"

const listPasskeys = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.oidc.passkeys.list",
    },
    async () => {
      const data = await listPassportPasskeyDevices(req)
      return res.status(200).json({ data })
    }
  )
}

export default listPasskeys
