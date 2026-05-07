import type { NextApiRequest, NextApiResponse } from "next"
import { OpenLocationCode } from "open-location-code"

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
      route: "v2.identity.fetch_approx_location",
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
      if (!isLocationDisclosed(disclosureGrants, "approximate")) {
        return res.status(200).json({
          error: "Location not disclosed for this dapp",
        })
      }

      const userAddress = dappUser.users?.address
      const latitude =
        userAddress?.locationDetails?.geometry?.location?.lat ??
        userAddress?.coordinates?.lat
      const longitude =
        userAddress?.locationDetails?.geometry?.location?.lng ??
        userAddress?.coordinates?.lon

      if (!latitude || !longitude) {
        return res.status(200).json({
          error: "No location found for user",
        })
      }

      const openLocationCode = new OpenLocationCode()
      const allLocationData = await getLocationDetailsFromPlusCode(
        openLocationCode.encode(latitude, longitude)
      )
      const { country, formattedAddress, postalCode } = allLocationData ?? {}

      return res.status(200).json({
        coordinates: {
          lat: roundToTwoDecimals(latitude),
          lng: roundToTwoDecimals(longitude),
        },
        country,
        error: null,
        placename: formattedAddress ? removePlusCode(formattedAddress) : null,
        pluscode: openLocationCode.encode(latitude, longitude, 6),
        postalcode: postalCode,
      })
    }
  )
}
