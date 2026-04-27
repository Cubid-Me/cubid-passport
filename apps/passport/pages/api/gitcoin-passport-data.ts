import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  fetchGitcoinPassportScore,
  fetchGitcoinPassportStamps,
  submitGitcoinPassport,
} from "@/lib/server/gitcoinScorer"

const schema = passportSchemas.z.object({
  address: passportSchemas.z.string().min(1),
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
      route: "gitcoin.passport_data",
    },
    async ({ body }) => {
      const [{ stamps }, , scores] = await Promise.all([
        fetchGitcoinPassportStamps(body.address),
        submitGitcoinPassport(body.address),
        fetchGitcoinPassportScore(body.address),
      ])

      return res.status(200).json({ stamps, scores })
    }
  )
}
