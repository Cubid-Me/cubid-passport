import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { ApiSecurityError } from "@cubid/auth/server"
import {
  isLocationDisclosed,
  loadDappDisclosureGrants,
} from "@/lib/server/disclosureGrants"
import { getPassportSupabase } from "@/lib/server/supabase"

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
      route: "v2.get_user_location",
    },
    async ({ body, context }) => {
      const { data, error } = await getPassportSupabase()
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .match({
          dapp_id: context.dapp.id,
          uuid: body.user_id,
        })

      if (error) {
        throw error
      }

      const dappUser = data?.[0]
      if (!dappUser) {
        throw new ApiSecurityError(
          404,
          "not_found",
          "User not found for this dapp."
        )
      }

      const disclosureGrants = await loadDappDisclosureGrants(getPassportSupabase(), {
        dappId: context.dapp.id,
        dappUserUuid: body.user_id,
      })
      if (!isLocationDisclosed(disclosureGrants, "exact")) {
        return res.status(200).json({
          address: null,
          cubid_country: null,
          cubid_postalcode: null,
        })
      }

      const user = dappUser.users
      return res.status(200).json({
        address: user?.address ?? null,
        cubid_country: user?.cubid_country ?? null,
        cubid_postalcode: user?.cubid_postalcode ?? null,
      })
    }
  )
}
