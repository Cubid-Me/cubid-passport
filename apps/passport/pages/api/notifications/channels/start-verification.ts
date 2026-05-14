import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { startNotificationChannelVerification } from "@/lib/server/notificationChannels"

const schema = passportSchemas.z.object({
  channelType: passportSchemas.z.enum(["email", "telegram"]),
  destination: passportSchemas.z.string().min(1).max(320),
  isDefault: passportSchemas.z.boolean().optional(),
  label: passportSchemas.z.string().max(100).optional(),
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
      route: "passport.notifications.channels.start_verification",
    },
    async ({ body, context }) => {
      const data = await startNotificationChannelVerification(context, body)
      return res.status(200).json({ data })
    }
  )
}
