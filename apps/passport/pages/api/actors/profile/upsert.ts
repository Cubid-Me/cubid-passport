import type { NextApiRequest, NextApiResponse } from "next"

import { upsertPassportActorProfile } from "../../../../lib/server/actorProfiles"
import {
  handlePassportRoute,
  passportSchemas,
} from "../../../../lib/server/passportApi"

const actorProfileSchema = passportSchemas.z.object({
  actorType: passportSchemas.z.enum(["human", "agent", "organization"]),
  agentAffiliation: passportSchemas.z
    .object({
      affiliationType: passportSchemas.z.enum([
        "standalone",
        "human_supported",
        "organization_supported",
      ]),
      description: passportSchemas.z.string().max(500).optional().nullable(),
      organizationSubjectKey: passportSchemas.z.string().max(200).optional().nullable(),
      supportedHumanSubjectKey: passportSchemas.z.string().max(200).optional().nullable(),
    })
    .optional()
    .nullable(),
  displayName: passportSchemas.z.string().max(160).optional().nullable(),
  organizationKind: passportSchemas.z
    .enum([
      "formal_organization",
      "team",
      "group",
      "network",
      "community",
      "collective",
      "other",
    ])
    .optional()
    .nullable(),
})

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
      bodySchema: actorProfileSchema,
      rateLimitGroup: "passport_user_mutation",
      route: "passport.actors.profile.upsert",
    },
    async ({ body, context }) => {
      const profile = await upsertPassportActorProfile(context, body)
      res.status(200).json({ data: profile })
    }
  )
}

