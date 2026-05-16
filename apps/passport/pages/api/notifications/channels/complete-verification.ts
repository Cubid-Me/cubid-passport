import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { completeNotificationChannelVerification } from "@/lib/server/notificationChannels"

const schema = passportSchemas.z.object({
  challengeId: passportSchemas.z.string().min(1),
  code: passportSchemas.z.string().min(1).max(32),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: schema,
      rateLimitGroup: "passport_user_mutation",
      route: "passport.notifications.channels.complete_verification",
    },
    async ({ body, context }) => {
      const data = await completeNotificationChannelVerification(context, body)
      return res.status(200).json({ data })
    }
  )
}
