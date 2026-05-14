import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listNotificationPreferences } from "@/lib/server/notificationChannels"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      bodySchema: passportSchemas.z.object({}).passthrough(),
      rateLimitGroup: "passport_user_read",
      route: "passport.notifications.preferences.list",
    },
    async ({ context }) => {
      const data = await listNotificationPreferences(context)
      return res.status(200).json({ data })
    }
  )
}
