import type { NextApiRequest, NextApiResponse } from "next"

import { getPassportRequestId } from "@/lib/server/oidcConsentManagement"
import {
  renamePassportPasskeyDevice,
  sendPassportApiError,
} from "@/lib/server/oidcPasskeyManagement"

const renamePasskey = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const requestId = getPassportRequestId(req)
    res.setHeader("X-Request-Id", requestId)
    const data = await renamePassportPasskeyDevice(
      req,
      {
        deviceId: String(req.body?.deviceId ?? ""),
        label: String(req.body?.label ?? ""),
      },
      requestId
    )
    return res.status(200).json({ data })
  } catch (error) {
    return sendPassportApiError(res, error, "Failed to rename passkey")
  }
}

export default renamePasskey
