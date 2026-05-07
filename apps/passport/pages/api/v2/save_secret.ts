import type { NextApiRequest, NextApiResponse } from "next"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  handlePassportRoute,
} from "@/lib/server/passportApi"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "anonymous",
      allowedMethods: ["POST"],
      rateLimitGroup: "passport_dapp_mutation",
      route: "v2.save_secret",
    },
    async () => {
      throw new ApiSecurityError(
        410,
        "endpoint_removed",
        "Legacy plaintext dapp user secret writes have been removed. Use /api/v3/save_secret."
      )
    }
  )
}
