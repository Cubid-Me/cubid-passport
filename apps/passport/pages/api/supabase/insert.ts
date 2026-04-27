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
      "Generic Passport Supabase CRUD endpoints have been removed."
    ),
    "Generic Passport Supabase CRUD endpoints have been removed.",
    "passport.supabase.insert"
  )
}
