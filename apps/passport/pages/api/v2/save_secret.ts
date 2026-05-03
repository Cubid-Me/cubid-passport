import type { NextApiRequest, NextApiResponse } from "next"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  getPassportRequestId,
  sendPassportApiError,
} from "@/lib/server/passportApi"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("X-Request-Id", getPassportRequestId(req))
  return sendPassportApiError(
    req,
    res,
    new ApiSecurityError(
      410,
      "endpoint_removed",
      "Legacy plaintext dapp user secret writes have been removed. Use /api/v3/save_secret."
    ),
    "Legacy plaintext dapp user secret writes have been removed. Use /api/v3/save_secret.",
    "v2.save_secret"
  )
}
