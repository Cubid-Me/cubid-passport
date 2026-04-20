import type { NextApiRequest, NextApiResponse } from "next"

import {
  listPassportOidcConsents,
  sendPassportApiError,
} from "@/lib/server/oidcConsentManagement"

const listConsents = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const data = await listPassportOidcConsents(req)
    return res.status(200).json({ data })
  } catch (error) {
    return sendPassportApiError(res, error, "Failed to load OIDC consents")
  }
}

export default listConsents
