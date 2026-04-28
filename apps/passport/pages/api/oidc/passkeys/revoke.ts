import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  revokePassportPasskeyDevice,
} from "@/lib/server/oidcPasskeyManagement"

const revokePasskey = async (req: NextApiRequest, res: NextApiResponse) => {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({
        deviceId: passportSchemas.z.string().min(1),
      }),
      rateLimitGroup: "passport_user_mutation",
      route: "passport.oidc.passkeys.revoke",
    },
    async ({ body, context }) => {
      const data = await revokePassportPasskeyDevice(
        req,
        body.deviceId,
        context.requestId
      )
      return res.status(200).json({ data })
    }
  )
}

export default revokePasskey
