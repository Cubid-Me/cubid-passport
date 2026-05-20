import type { NextApiRequest, NextApiResponse } from "next"

import { ApiSecurityError } from "@cubid/auth/server"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"

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
    async () => {
      throw new ApiSecurityError(
        410,
        "cubid_signing_deprecated",
        "Cubid normal wallet signing is deprecated. Use app-mediated threshold signing with Cubid recovery bundles instead."
      )
    }
  )
}
