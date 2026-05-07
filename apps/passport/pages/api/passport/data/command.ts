import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { passportDataCommands } from "@/lib/server/passportData"

const schema = passportSchemas.z.discriminatedUnion("operation", [
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("createEvmAccount"),
    createdByUserId: passportSchemas.z.number().int().positive(),
    privateKey: passportSchemas.z.string().min(1),
    publicKey: passportSchemas.z.string().min(1),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("createStamp"),
    appId: passportSchemas.z.number().int().positive(),
    isAuth: passportSchemas.z.boolean().optional(),
    stampData: passportSchemas.z.record(passportSchemas.z.unknown()),
    stampType: passportSchemas.z.string().min(1),
    userId: passportSchemas.z.number().int().positive(),
    userUuid: passportSchemas.z.string().min(1).optional(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("deleteStamp"),
    dappId: passportSchemas.z.number().int().positive().optional(),
    stampType: passportSchemas.z.number().int().positive(),
    userId: passportSchemas.z.number().int().positive(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("ensureUserByIdentity"),
    createdByApp: passportSchemas.z.number().int().positive().optional(),
    email: passportSchemas.z.string().email().optional(),
    isThirdParty: passportSchemas.z.boolean().optional(),
    phone: passportSchemas.z.string().min(1).optional(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("grantStampPermission"),
    dappUserId: passportSchemas.z.string().min(1),
    stampId: passportSchemas.z.number().int().positive(),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("syncGoodDollarWallet"),
    email: passportSchemas.z.string().email(),
    identifier: passportSchemas.z.string().min(1),
    walletData: passportSchemas.z.record(passportSchemas.z.unknown()),
  }),
  passportSchemas.z.object({
    operation: passportSchemas.z.literal("updateUserProfile"),
    patch: passportSchemas.z.record(passportSchemas.z.unknown()),
    userId: passportSchemas.z.number().int().positive(),
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
      rateLimitGroup: "passport_user_mutation",
      route: "passport.data.command",
    },
    async ({ body }) => {
      let data: unknown

      switch (body.operation) {
        case "createEvmAccount":
          data = await passportDataCommands.createEvmAccount(body)
          break
        case "createStamp":
          data = await passportDataCommands.createStamp(body)
          break
        case "deleteStamp":
          data = await passportDataCommands.deleteStamp(body)
          break
        case "ensureUserByIdentity":
          data = await passportDataCommands.ensureUserByIdentity(body)
          break
        case "grantStampPermission":
          data = await passportDataCommands.grantStampPermission(body)
          break
        case "syncGoodDollarWallet":
          data = await passportDataCommands.syncGoodDollarWallet(body)
          break
        case "updateUserProfile":
          data = await passportDataCommands.updateUserProfile(body)
          break
      }

      return res.status(200).json({ data })
    }
  )
}
