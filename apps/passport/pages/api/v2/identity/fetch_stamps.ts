import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { ApiSecurityError } from "@cubid/auth/server"
import {
  filterDisclosedStamps,
  isStampTypeDisclosed,
  loadDappDisclosureGrants,
} from "@/lib/server/disclosureGrants"
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
      route: "v2.identity.fetch_stamps",
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

      const dappUser = dappUsers?.[0]
      if (!dappUser || String(dappUser.dapp_id) !== String(context.dapp.id)) {
        throw new ApiSecurityError(
          404,
          "not_found",
          "User not found for this dapp."
        )
      }

      const { data: stampData, error: stampError } = await supabase
        .from("stamps")
        .select("*")
        .eq("created_by_user_id", dappUser.users.id)

      if (stampError) {
        throw stampError
      }

      const disclosureGrants = await loadDappDisclosureGrants(supabase, {
        dappId: context.dapp.id,
        dappUserUuid: body.user_id,
      })
      const emailDisclosed = isStampTypeDisclosed(disclosureGrants, "email")
      const allStamps = filterDisclosedStamps(disclosureGrants, stampData ?? [])
        .map((item: any) => ({
          ...item,
          emailForVerification: emailDisclosed ? dappUser.users.email : null,
          permAvailable: true,
          stamptype_string: getStampTypeName(Number(item.stamptype)),
        }))

      return res.status(200).json({
        all_stamps: allStamps,
        email: emailDisclosed ? dappUser.users.email : null,
      })
    }
  )
}
