import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { ApiSecurityError } from "@cubid/auth/server"
import {
  filterDisclosedStamps,
  loadDappDisclosureGrants,
  sanitizeDisclosedUserProfile,
} from "@/lib/server/disclosureGrants"
import { getPassportSupabase } from "@/lib/server/supabase"
import { getStampTypeName } from "@cubid/stamps"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  uid: passportSchemas.z.string().min(1),
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
      route: "dapp.get_identity",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error: dappUsersError } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.uid)

      if (dappUsersError) {
        throw dappUsersError
      }

      const dappUser = dappUsers?.[0]
      if (!dappUser || String(dappUser.dapp_id) !== String(context.dapp.id)) {
        throw new ApiSecurityError(
          404,
          "not_found",
          "User not found for this dapp."
        )
      }

      const userId = dappUser.user_id
      const { data: stampsList, error: stampsError } = await supabase
        .from("stamps")
        .select("*,stamptypes:stamptype(*)")
        .eq("created_by_user_id", userId)

      if (stampsError) {
        throw stampsError
      }

      const disclosureGrants = await loadDappDisclosureGrants(supabase, {
        dappId: context.dapp.id,
        dappUserUuid: body.uid,
      })
      const scoreDetails = filterDisclosedStamps(
        disclosureGrants,
        stampsList ?? []
      ).map((item: any) => ({
        [getStampTypeName(Number(item.stamptype))]: item.uniquevalue,
      }))
      const user = sanitizeDisclosedUserProfile(
        dappUser.users,
        disclosureGrants
      )

      return res.status(200).json({
        score_details: scoreDetails,
        user,
      })
    }
  )
}
