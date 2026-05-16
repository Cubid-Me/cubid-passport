import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  getApiV3IdempotencyKey,
  runApiV3IdempotentWrite,
} from "@/lib/server/apiV3Idempotency"
import { sendNotificationForDapp } from "@/lib/server/notificationSend"

const jsonObjectSchema = passportSchemas.z
  .record(passportSchemas.z.unknown())
  .default({})
  .refine(
    (value) => JSON.stringify(value).length <= 4096,
    "Notification metadata is too large."
  )

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  body: passportSchemas.z.string().trim().min(1).max(2000),
  category: passportSchemas.z.enum(["SECURITY", "TRANSACTIONAL", "WORKFLOW"]),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid(),
  deep_link: passportSchemas.z.string().trim().max(1000).optional(),
  metadata: jsonObjectSchema.optional(),
  priority: passportSchemas.z
    .enum(["LOW", "NORMAL", "HIGH", "CRITICAL"])
    .default("NORMAL"),
  title: passportSchemas.z.string().trim().min(1).max(140),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "dapp",
      bodySchema: schema,
      rateLimitGroup: "passport_dapp_mutation",
      route: "v3.notifications.send",
    },
    async ({ body, context }) => {
      const response = await runApiV3IdempotentWrite({
        actorIdentifier: context.actorIdentifier,
        actorType: context.actorType,
        body,
        idempotencyKey: getApiV3IdempotencyKey(req),
        requestId: context.requestId,
        route: "v3.notifications.send",
        supabase: context.supabase,
        handler: async () => {
          const result = await sendNotificationForDapp(context, {
            body: body.body,
            category: body.category,
            deepLink: body.deep_link ?? null,
            dappUserUuid: body.dapp_user_uuid,
            metadata: body.metadata ?? {},
            priority: body.priority,
            requestId: context.requestId,
            title: body.title,
          })

          return { body: { data: result }, statusCode: 200 }
        },
      })

      return res.status(response.statusCode).json(response.body)
    }
  )
}
