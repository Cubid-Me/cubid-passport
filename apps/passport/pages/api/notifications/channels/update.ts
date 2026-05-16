import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { updateNotificationChannel } from "@/lib/server/notificationChannels"

const nullableIsoString = passportSchemas.z.string().datetime().nullable()

const schema = passportSchemas.z.object({
  channelId: passportSchemas.z.string().min(1),
  isDefault: passportSchemas.z.boolean().optional(),
  label: passportSchemas.z.string().max(100).nullable().optional(),
  mutedUntil: nullableIsoString.optional(),
  pausedUntil: nullableIsoString.optional(),
  status: passportSchemas.z
    .enum(["active", "muted", "paused", "revoked"])
    .optional(),
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
      route: "passport.notifications.channels.update",
    },
    async ({ body, context }) => {
      const data = await updateNotificationChannel(context, body)
      return res.status(200).json({ data })
    }
  )
}
