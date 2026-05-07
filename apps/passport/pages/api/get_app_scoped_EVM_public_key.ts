import type { NextApiRequest, NextApiResponse } from "next"
import { ethers } from "ethers"

import { server_insertStamp } from "@/lib/stampInsertion"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  dapp_id: passportSchemas.z.number().int().positive(),
  user_id: passportSchemas.z.number().int().positive(),
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
      route: "get_app_scoped_evm_public_key",
    },
    async ({ body }) => {
      const wallet = ethers.Wallet.createRandom()
      const privateKey = wallet.privateKey
      const address = wallet.address

      const { error } = await getPassportSupabase().from("evm_accounts").insert([
        {
          address,
          dapp_id: body.dapp_id,
          private_key: privateKey,
          user_id: body.user_id,
        },
      ])

      if (error) {
        throw error
      }

      await server_insertStamp({
        app_id: body.dapp_id,
        stamp_type: "evm",
        stampData: {
          identity: address,
          uniquevalue: address,
        },
        user_data: { user_id: body.user_id, uuid: "" },
      })

      return res.status(200).json({ publicKey: address })
    }
  )
}
