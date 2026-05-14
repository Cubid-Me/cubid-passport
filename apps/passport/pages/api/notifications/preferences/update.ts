import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { updateNotificationPreference } from "@/lib/server/notificationChannels"

const nullableIsoString = passportSchemas.z.string().datetime().nullable()

const schema = passportSchemas.z.object({
  categoryKey: passportSchemas.z.enum([
    "SECURITY",
    "TRANSACTIONAL",
    "WORKFLOW",
  ]),
  channelId: passportSchemas.z.string().min(1).nullable().optional(),
  dappId: passportSchemas.z
    .union([passportSchemas.z.number(), passportSchemas.z.string().min(1)])
    .nullable()
    .optional(),
  mutedUntil: nullableIsoString.optional(),
  pausedUntil: nullableIsoString.optional(),
  priorityFloor: passportSchemas.z
    .enum(["LOW", "NORMAL", "HIGH", "CRITICAL"])
    .optional(),
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
      route: "passport.notifications.preferences.update",
    },
    async ({ body, context }) => {
      const data = await updateNotificationPreference(context, body)
      return res.status(200).json({ data })
    }
  )
}
