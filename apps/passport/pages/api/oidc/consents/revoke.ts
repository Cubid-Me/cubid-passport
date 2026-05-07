import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  revokePassportOidcConsent,
} from "@/lib/server/oidcConsentManagement"

const revokeConsent = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({
        consentId: passportSchemas.z.string().min(1),
      }),
      rateLimitGroup: "passport_user_mutation",
      route: "passport.oidc.consents.revoke",
    },
    async ({ body, context }) => {
      const data = await revokePassportOidcConsent(
        req,
        body.consentId,
        context.requestId
      )
      return res.status(200).json({ data })
    }
  )
}

export default revokeConsent
