import type { NextApiRequest, NextApiResponse } from "next"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"
import { ApiSecurityError } from "@cubid/auth/server"
import {
  isLocationDisclosed,
  isProfileNameDisclosed,
  loadDappDisclosureGrants,
} from "@/lib/server/disclosureGrants"
import { getPassportSupabase } from "@/lib/server/supabase"

const { OpenLocationCode } = require("open-location-code")

import { getLocationDetailsFromPlusCode } from "../../utils/locationMethods"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  user_id: passportSchemas.z.string().min(1),
})

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

const removePlusCode = (input: string) => {
  const plusCodePattern = /^[A-Z0-9]{4}\+[A-Z0-9]{2}\s?/
  return plusCodePattern.test(input)
    ? input.replace(plusCodePattern, "").trim()
    : input
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
      route: "v2.identity.fetch_user_data",
    },
    async ({ body, context }) => {
      const supabase = getPassportSupabase()
      const { data: dappUsers, error } = await supabase
        .from("dapp_users")
        .select("*,users:user_id(*),dapps:dapp_id(*)")
        .eq("uuid", body.user_id)

      if (error) {
        throw error
      }

      const dappUser = dappUsers?.[0]
      if (!dappUser || String(dappUser.dapp_id) !== String(context.dapp.id)) {
        throw new ApiSecurityError(
          404,
          "not_found",
          "User not found for this dapp."
        )
      }

      const disclosureGrants = await loadDappDisclosureGrants(supabase, {
        dappId: context.dapp.id,
        dappUserUuid: body.user_id,
      })
      const locationDisclosed = isLocationDisclosed(disclosureGrants, "approximate")
      const address = locationDisclosed ? dappUser.users?.address : null
      const latitude =
        address?.locationDetails?.geometry?.location?.lat ??
        address?.coordinates?.lat
      const longitude =
        address?.locationDetails?.geometry?.location?.lng ??
        address?.coordinates?.lon

      const openLocationCode = new OpenLocationCode()
      const locationDetails =
        latitude && longitude
          ? await getLocationDetailsFromPlusCode(
              openLocationCode.encode(latitude, longitude)
            )
          : null

      return res.status(200).json({
        coordinates:
          latitude && longitude
            ? {
                lat: roundToTwoDecimals(latitude),
                lng: roundToTwoDecimals(longitude),
              }
            : null,
        country: locationDetails?.country ?? null,
        error: null,
        name: isProfileNameDisclosed(disclosureGrants)
          ? dappUser.users?.nickname ?? null
          : null,
        placename: locationDetails?.formattedAddress
          ? removePlusCode(locationDetails.formattedAddress)
          : null,
      })
    }
  )
}
