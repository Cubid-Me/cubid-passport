import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { approvePassportSiwcSigningRequest } from "@/lib/server/siwcSigningRequests"

const schema = passportSchemas.z.object({
  signingRequestId: passportSchemas.z.string().min(1),
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
      route: "passport.siwc.signing.requests.approve",
    },
    async ({ body, context }) => {
      const data = await approvePassportSiwcSigningRequest({
        req,
        requestId: context.requestId,
        signingRequestId: body.signingRequestId,
      })

      return res.status(200).json({ data })
    }
  )
}
