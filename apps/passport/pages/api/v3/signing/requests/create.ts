import type { NextApiRequest, NextApiResponse } from "next"

import {
  getApiV3IdempotencyKey,
  runApiV3IdempotentWrite,
} from "@/lib/server/apiV3Idempotency"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { createSiwcSigningRequest } from "@/lib/server/siwcSigningRequests"
import { getPassportSupabase } from "@/lib/server/supabase"

const jsonObject = passportSchemas.z.record(passportSchemas.z.unknown())

const schema = passportSchemas.z.object({
  api_key: passportSchemas.z.string().min(1).optional(),
  apikey: passportSchemas.z.string().min(1).optional(),
  dapp_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]).optional(),
  dapp_user_uuid: passportSchemas.z.string().uuid(),
  payload: passportSchemas.z.unknown(),
  payload_summary: jsonObject.optional(),
  request_type: passportSchemas.z.enum(["message", "typed_data", "transaction"]),
  user_account_id: passportSchemas.z.string().uuid(),
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
      route: "v3.signing.requests.create",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const idempotencyKey = getApiV3IdempotencyKey(req)
      const response = await runApiV3IdempotentWrite({
        actorIdentifier: context.actorIdentifier,
        actorType: context.actorType,
        body,
        idempotencyKey,
        requestId: context.requestId,
        route: "v3.signing.requests.create",
        supabase,
        handler: async () => {
          const request = await createSiwcSigningRequest({
            dappId: context.dapp.id,
            dappUserUuid: body.dapp_user_uuid,
            idempotencyKey,
            payload: body.payload,
            payloadSummary: body.payload_summary,
            requestId: context.requestId,
            requestType: body.request_type,
            supabase,
            userAccountId: body.user_account_id,
          })

          return { body: { data: request }, statusCode: 200 }
        },
      })

      return res.status(response.statusCode).json(response.body)
    }
  )
}
