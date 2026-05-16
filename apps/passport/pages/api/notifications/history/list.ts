import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listNotificationHistoryForUser } from "@/lib/server/notificationHistory"

const schema = passportSchemas.z.object({
  limit: passportSchemas.z.number().int().min(1).max(100).optional(),
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
      rateLimitGroup: "passport_user_read",
      route: "passport.notifications.history.list",
    },
    async ({ body, context }) => {
      const data = await listNotificationHistoryForUser(context, {
        limit: body.limit,
      })
      return res.status(200).json({ data })
    }
  )
}
