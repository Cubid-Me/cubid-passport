import type { NextApiRequest, NextApiResponse } from "next"

import { server_insertStamp } from "@/lib/stampInsertion"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  chain: passportSchemas.z.string().min(1),
  dapp_uid: passportSchemas.z.string().min(1),
  is_generated_via_lib: passportSchemas.z.boolean().optional(),
  public_key: passportSchemas.z.string().min(1),
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
      route: "wallet.save",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const { data, error } = await supabase
        .from("wallet_list")
        .insert({
          chain: body.chain,
          dapp_user: body.dapp_uid,
          is_generated_via_lib: body.is_generated_via_lib ?? false,
          public_key: body.public_key,
        })
        .select("*")

      if (error) {
        throw error
      }

      const { data: dappUsers, error: dappUserError } = await supabase
        .from("dapp_users")
        .select("*")
        .eq("uuid", body.dapp_uid)

      if (dappUserError) {
        throw dappUserError
      }

      if (dappUsers?.[0]?.user_id && dappUsers?.[0]?.dapp_id) {
        await server_insertStamp({
          stampData: {
            identity: body.public_key,
            uniquevalue: body.public_key,
          },
          stamp_type: body.chain === "near" ? "near-wallet" : "evm",
          app_id: dappUsers[0].dapp_id,
          user_data: { user_id: dappUsers[0].user_id, uuid: "" },
        })
      }

      return res.status(200).json({ data: data ?? [], error: null })
    }
  )
}
