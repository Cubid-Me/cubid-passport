import type { NextApiRequest, NextApiResponse } from "next"

import {
  listPassportPasskeyDevices,
  sendPassportApiError,
} from "@/lib/server/oidcPasskeyManagement"

const listPasskeys = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const data = await listPassportPasskeyDevices(req)
    return res.status(200).json({ data })
  } catch (error) {
    return sendPassportApiError(res, error, "Failed to load passkeys")
  }
}

export default listPasskeys
