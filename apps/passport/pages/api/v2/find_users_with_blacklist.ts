import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  cred: passportSchemas.z.string().min(1),
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
      route: "v2.find_users_with_blacklist",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const { data: stampData, error: stampError } = await supabase
        .from("stamps")
        .select("*")
        .eq("uniquevalue", body.cred)
        .order("created_at", { ascending: true })

      if (stampError) {
        throw stampError
      }

      const [userId1, userId2] = (stampData ?? []).map(
        (item: any) => item.created_by_user_id
      )
      const [user1Response, user2Response] = await Promise.all([
        userId1
          ? supabase.from("users").select("*").eq("id", userId1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        userId2
          ? supabase.from("users").select("*").eq("id", userId2).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (user1Response.error) {
        throw user1Response.error
      }
      if (user2Response.error) {
        throw user2Response.error
      }

      return res.status(200).json({
        all_email: {
          email1: user1Response.data?.email || user1Response.data?.phone || null,
          email2: user2Response.data?.email || user2Response.data?.phone || null,
        },
        success: true,
      })
    }
  )
}
