import type { NextApiRequest, NextApiResponse } from "next"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"

const schema = passportSchemas.z.object({
  signingRequestId: passportSchemas.z.string().min(1),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: schema,
      rateLimitGroup: "passport_user_mutation",
      route: "passport.siwc.signing.requests.approve",
    },
    async () => {
      throw new ApiSecurityError(
        410,
        "cubid_signing_deprecated",
        "Cubid normal wallet signing is deprecated. Use app-mediated threshold signing with Cubid recovery bundles instead."
      )
    }
  )
}
