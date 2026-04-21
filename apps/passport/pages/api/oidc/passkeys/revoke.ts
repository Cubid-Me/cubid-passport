import type { NextApiRequest, NextApiResponse } from "next"

import { getPassportRequestId } from "@/lib/server/oidcConsentManagement"
import {
  revokePassportPasskeyDevice,
  sendPassportApiError,
} from "@/lib/server/oidcPasskeyManagement"

const revokePasskey = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const requestId = getPassportRequestId(req)
    res.setHeader("X-Request-Id", requestId)
    const data = await revokePassportPasskeyDevice(
      req,
      String(req.body?.deviceId ?? ""),
      requestId
    )
    return res.status(200).json({ data })
  } catch (error) {
    return sendPassportApiError(res, error, "Failed to revoke passkey")
  }
}

export default revokePasskey
