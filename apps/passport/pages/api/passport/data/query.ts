import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { passportDataQueries } from "@/lib/server/passportData"

const schema = passportSchemas.z.discriminatedUnion("operation", [
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("findBrightIdDataByEmail"),
    email: passportSchemas.z.string().email(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("findUserByIdentity"),
    email: passportSchemas.z.string().email().optional(),
    phone: passportSchemas.z.string().min(1).optional(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("findWalletDetailsByIdentity"),
    email: passportSchemas.z.string().email().optional(),
    phone: passportSchemas.z.string().min(1).optional(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("findDappPageById"),
    pageId: passportSchemas.z.number().int().positive(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("listStampPermissionsByDappUser"),
    dappUserId: passportSchemas.z.string().min(1),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("listStampsByUser"),
    stampTypeIds: passportSchemas.z.array(passportSchemas.z.number().int().positive()).optional(),
    userId: passportSchemas.z.number().int().positive(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("listStampTypes"),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("lookupGoodDollarState"),
    email: passportSchemas.z.string().email(),
    identifier: passportSchemas.z.string().min(1).optional(),
  }),
])

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
      route: "passport.data.query",
    },
    async ({ body }) => {
      let data: unknown

      switch (body.operation) {
        case "findBrightIdDataByEmail":
          data = await passportDataQueries.findBrightIdDataByEmail(body.email)
          break
        case "findUserByIdentity":
          data = await passportDataQueries.findUserByIdentity(body)
          break
        case "findWalletDetailsByIdentity":
          data = await passportDataQueries.findWalletDetailsByIdentity(body)
          break
        case "findDappPageById":
          data = await passportDataQueries.findDappPageById(body.pageId)
          break
        case "listStampPermissionsByDappUser":
          data = await passportDataQueries.listStampPermissionsByDappUser(
            body.dappUserId
          )
          break
        case "listStampsByUser":
          data = await passportDataQueries.listStampsByUser(body)
          break
        case "listStampTypes":
          data = await passportDataQueries.listStampTypes()
          break
        case "lookupGoodDollarState":
          data = await passportDataQueries.lookupGoodDollarState(body)
          break
      }

      return res.status(200).json({ data })
    }
  )
}
