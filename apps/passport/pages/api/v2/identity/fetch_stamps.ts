import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

import { stampsWithId } from "../../utils/stampKey"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  user_id: passportSchemas.z.string().min(1),
})

const swapKeyValue = (input: Record<string, number>) => {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [value, key])
  ) as Record<number, string>
}

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
      rateLimitGroup: "passport_dapp_read",
      route: "v2.identity.fetch_stamps",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.user_id)

      if (dappUsersError) {
        throw dappUsersError
      }

      if (!dappUsers?.length) {
        return res.status(404).json({ error: "User not found" })
      }

      const { data: stampData, error: stampError } = await supabase
        .from("stamps")
        .select("*")
        .eq("created_by_user_id", dappUsers[0]?.users.id)

      if (stampError) {
        throw stampError
      }

      const swapped = swapKeyValue(stampsWithId)
      const allStamps = await Promise.all(
        (stampData ?? []).map(async (item: any) => {
          const { data: permissionData, error } = await supabase
            .from("stamp_dappuser_permissions")
            .select("*")
            .match({
              dappuser_id: body.user_id,
              stamp_id: item.id,
            })

          if (error) {
            throw error
          }

          return {
            ...item,
            emailForVerification: dappUsers[0]?.users.email,
            permAvailable: Boolean(permissionData?.[0]),
            stamptype_string: swapped[item.stamptype],
          }
        })
      )

      return res.status(200).json({
        all_stamps: allStamps,
        email: dappUsers[0]?.users.email,
      })
    }
  )
}
