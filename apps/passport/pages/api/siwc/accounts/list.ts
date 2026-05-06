import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listPassportSiwcAccounts } from "@/lib/server/siwcAccountVisibility"

const listSiwcAccounts = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.siwc.accounts.list",
    },
    async () => {
      const data = await listPassportSiwcAccounts(req)
      return res.status(200).json({ data })
    }
  )
}

export default listSiwcAccounts
