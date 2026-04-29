import type { NextApiRequest, NextApiResponse } from "next"

import { getPassportActorProfile } from "../../../../lib/server/actorProfiles"
import { handlePassportRoute } from "../../../../lib/server/passportApi"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await handlePassportRoute(
    req,
    res,
    {
      actor: "user",
      allowedMethods: ["POST"],
      rateLimitGroup: "passport_user_read",
      route: "passport.actors.profile.get",
    },
    async ({ context }) => {
      const profile = await getPassportActorProfile(context)
      res.status(200).json({ data: profile })
    }
  )
}

