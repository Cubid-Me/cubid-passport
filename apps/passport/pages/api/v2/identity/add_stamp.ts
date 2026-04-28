import type { NextApiRequest, NextApiResponse } from "next"

import { server_insertStamp } from "@/lib/stampInsertion"
import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
  page_id: passportSchemas.z.union([
    passportSchemas.z.number().int().positive(),
    passportSchemas.z.string().min(1),
  ]),
  stamp_type: passportSchemas.z.string().min(1),
  stampData: passportSchemas.z.record(passportSchemas.z.unknown()),
  user_data: passportSchemas.z.object({
    uuid: passportSchemas.z.string().min(1),
  }),
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
      route: "v2.identity.add_stamp",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const stampData = body.stampData as any
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*")
        .eq("uuid", body.user_data.uuid)

      if (dappUsersError) {
        throw dappUsersError
      }

      const { data: dappPages, error: dappPagesError } = await supabase
        .from("dapp_pages")
        .select("*")
        .eq("id", Number(body.page_id))

      if (dappPagesError) {
        throw dappPagesError
      }

      if (body.stamp_type === "address") {
        const stampLocation = stampData?.geometry?.location
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            address: {
              coordinates: {
                lat: stampLocation?.lat,
                lon: stampLocation?.lng,
              },
            },
          })
          .eq("id", dappUsers?.[0]?.user_id)

        if (userUpdateError) {
          throw userUpdateError
        }
      }

      await server_insertStamp({
        app_id: dappPages?.[0]?.dapp_id,
        stamp_type: body.stamp_type as any,
        stampData,
        user_data: {
          user_id: dappUsers?.[0]?.user_id,
          uuid: body.user_data.uuid,
        },
      })

      return res.status(200).json({ success: true })
    }
  )
}
