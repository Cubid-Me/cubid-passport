import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  renamePassportPasskeyDevice,
} from "@/lib/server/oidcPasskeyManagement"

const renamePasskey = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({
        deviceId: passportSchemas.z.string().min(1),
        label: passportSchemas.z.string().min(1).max(80),
      }),
      rateLimitGroup: "passport_user_mutation",
      route: "passport.oidc.passkeys.rename",
    },
    async ({ body, context }) => {
      const data = await renamePassportPasskeyDevice(req, body, context.requestId)
      return res.status(200).json({ data })
    }
  )
}

export default renamePasskey
