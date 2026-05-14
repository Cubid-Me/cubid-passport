import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { listNotificationAllowPageGrants } from "@/lib/server/notificationGrants"

const schema = passportSchemas.z.object({
  pageId: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]),
  uid: passportSchemas.z.string().min(1),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "anonymous",
      bodySchema: schema,
      rateLimitGroup: "passport_user_read",
      route: "passport.notifications.grants.allow_page.list",
    },
    async ({ body, context }) => {
      const data = await listNotificationAllowPageGrants(context, body)
      return res.status(200).json({ data })
    }
  )
}
