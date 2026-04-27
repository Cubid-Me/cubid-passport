import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

const { OpenLocationCode } = require("open-location-code")

import { getLocationDetailsFromPlusCode } from "../../utils/locationMethods"

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
      route: "v2.identity.fetch_exact_location",
    },
    async ({ body }) => {
      const { data: dappUsers, error } = await getPassportSupabase()
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.user_id)

      if (error) {
        throw error
      }

      const address = dappUsers?.[0]?.users?.address
      const latitude =
        address?.locationDetails?.geometry?.location?.lat ??
        address?.coordinates?.lat
      const longitude =
        address?.locationDetails?.geometry?.location?.lng ??
        address?.coordinates?.lon

      if (!latitude || !longitude) {
        return res.status(200).json({ error: "No location found for user" })
      }

      const openLocationCode = new OpenLocationCode()
      const locationDetails = await getLocationDetailsFromPlusCode(
        openLocationCode.encode(latitude, longitude)
      )

      return res.status(200).json({
        coordinates: {
          lat: latitude,
          lng: longitude,
        },
        country: locationDetails?.country ?? null,
        error: null,
        place: address,
      })
    }
  )
}
