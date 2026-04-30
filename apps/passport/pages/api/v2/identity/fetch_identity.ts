import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"
import { getStampTypeName } from "@cubid/stamps"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  user_id: passportSchemas.z.string().min(1),
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
      rateLimitGroup: "passport_dapp_read",
      route: "v2.identity.fetch_identity",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.user_id)

      if (dappUsersError) {
        throw dappUsersError
      }

      const userId = dappUsers?.[0]?.users?.id
      const [stampDataResponse, stampPermsResponse] = await Promise.all([
        supabase.from("stamps").select("*").eq("created_by_user_id", userId),
        supabase
          .from("dapp_stamptypes")
          .select("*")
          .eq("dapp_id", context.dapp.id),
      ])

      if (stampDataResponse.error) {
        throw stampDataResponse.error
      }
      if (stampPermsResponse.error) {
        throw stampPermsResponse.error
      }

      const allowedStampIds = [
        ...(stampPermsResponse.data ?? []).map((item: any) => item.stamptype_id),
        13,
      ]
      const stampDetails = (stampDataResponse.data ?? [])
        .filter((item: any) => allowedStampIds.includes(item.stamptype))
        .map((item: any) => ({
          stamp_type: getStampTypeName(Number(item.stamptype)),
          status: item.is_valid ? "Verified" : "Unverified",
          value: item?.identity ?? item.uniquevalue,
        }))

      return res.status(200).json({
        error: null,
        stamp_details: stampDetails,
      })
    }
  )
}
