import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import {
  filterDisclosedStamps,
  loadDappDisclosureGrants,
} from "@/lib/server/disclosureGrants"
import { getPassportSupabase } from "@/lib/server/supabase"

const schema = passportSchemas.z.object({
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
      actor: "anonymous",
      bodySchema: schema,
      rateLimitGroup: "passport_user_read",
      route: "dapp.get_score_details_cubid",
    },
    async ({ body }) => {
      const supabase = getPassportSupabase()
      const dappUsersResponse = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.uid)

      if (dappUsersResponse.error) {
        throw dappUsersResponse.error
      }

      const dappId = dappUsersResponse.data?.[0]?.dapp_id
      const userId = dappUsersResponse.data?.[0]?.user_id
      const dappUserUuid = dappUsersResponse.data?.[0]?.uuid

      const [stampDataResponse, scoreDataResponse, stampsListResponse] =
        await Promise.all([
          supabase
            .from("dapp_stamptypes")
            .select("*,stamptypes:stamptype_id(*)")
            .eq("dapp_id", dappId),
          supabase
            .from("stampscore_dapps")
            .select("*,stampscore_schemas:schema_id(*)")
            .eq("dapp_id", dappId),
          supabase
            .from("stamps")
            .select("*,stamptypes:stamptype(*)")
            .eq("created_by_user_id", userId),
        ])

      if (stampDataResponse.error) {
        throw stampDataResponse.error
      }
      if (scoreDataResponse.error) {
        throw scoreDataResponse.error
      }
      if (stampsListResponse.error) {
        throw stampsListResponse.error
      }

      const schemaId = scoreDataResponse.data?.[0]?.schema_id
      const stampScoresResponse = await supabase
        .from("stampscores_available")
        .select("*")
        .eq("schema_id", schemaId)

      if (stampScoresResponse.error) {
        throw stampScoresResponse.error
      }

      const disclosureGrants = await loadDappDisclosureGrants(supabase, {
        dappId,
        dappUserUuid,
      })
      const disclosedStamps = filterDisclosedStamps(
        disclosureGrants,
        stampsListResponse.data ?? []
      )
      const stampsToSend = stampDataResponse.data ?? []
      const allStampIds = disclosedStamps.map(
        (item: any) => item.stamptype
      )

      const score_details = stampsToSend
        .filter((item: any) => allStampIds.includes(item?.stamptypes?.id))
        .map((item: any) => {
          const allData = (stampsListResponse.data ?? []).filter(
            (stamp: any) => stamp.stamptype === item.stamptype_id
          )

          return {
            [item.stamptypes.stamptype]: allData.map(
              (stamp: any) => stamp?.uniquevalue
            ),
          }
        })

      return res.status(200).json({ score_details })
    }
  )
}
