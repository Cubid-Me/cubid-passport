import type { NextApiRequest, NextApiResponse } from "next"

import {
  revokePassportOidcConsent,
  sendPassportApiError,
} from "@/lib/server/oidcConsentManagement"

const revokeConsent = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const data = await revokePassportOidcConsent(req, String(req.body?.consentId ?? ""))
    return res.status(200).json({ data })
  } catch (error) {
    return sendPassportApiError(res, error, "Failed to revoke OIDC consent")
  }
}

export default revokeConsent
