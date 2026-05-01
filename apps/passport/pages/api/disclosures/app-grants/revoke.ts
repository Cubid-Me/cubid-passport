import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { revokePassportAppDisclosureGrant } from "@/lib/server/appDisclosureManagement"

const revokeAppGrant = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({
        grantId: passportSchemas.z.string().min(1),
      }),
      rateLimitGroup: "passport_user_mutation",
      route: "passport.disclosures.app_grants.revoke",
    },
    async ({ body, context }) => {
      const data = await revokePassportAppDisclosureGrant(
        req,
        body.grantId,
        context.requestId
      )
      return res.status(200).json({ data })
    }
  )
}

export default revokeAppGrant
