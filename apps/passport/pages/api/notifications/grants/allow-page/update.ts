import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { updateNotificationAllowPageGrants } from "@/lib/server/notificationGrants"

const schema = passportSchemas.z.object({
  categories: passportSchemas.z.array(
    passportSchemas.z.enum(["SECURITY", "TRANSACTIONAL", "WORKFLOW"])
  ),
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
      rateLimitGroup: "passport_user_mutation",
      route: "passport.notifications.grants.allow_page.update",
    },
    async ({ body, context }) => {
      const data = await updateNotificationAllowPageGrants(context, body)
      return res.status(200).json({ data })
    }
  )
}
