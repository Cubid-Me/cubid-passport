// @ts-nocheck
import NextCors from "nextjs-cors"
import { OpenLocationCode } from "open-location-code"

import { getLocationDetailsFromPlusCode } from "../../utils/locationMethods"
import { stampsWithId } from "../../utils/stampKey"
import { supabase } from "../../utils/supabase"

const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}
const rough_location = async (req: any, res: any) => {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const { apikey, user_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey })
  const dappId = dataForApp?.[0]?.id
  if (!dappId) {
    log("Invalid API key or dapp_id", 50)
    return res.status(400).json({ error: "Invalid API key" })
  }
  const { data: dapp_users, error } = await supabase
    .from("dapp_users")
    .select("*,users:user_id(*),dapps:dapp_id(*)")
    .match({
      uuid: user_id,
    })

  const {
    users: { address, cubid_country, cubid_postalcode },
  } = dapp_users?.[0]

  const roundToTwoDecimals = (number: number) => {
    return Math.round(number * 10) / 10
  }

  if (Boolean(address?.locationDetails?.geometry?.location?.lat)) {
    res.send({
      error: "No location found for user"
    })
  }

  const openLocationCode = new OpenLocationCode()
  const country = await getLocationDetailsFromPlusCode(
    openLocationCode.encode(
      address?.locationDetails?.geometry?.location?.lat ??
      address?.coordinates?.lat,
      address?.locationDetails?.geometry?.location?.lng ??
      address?.coordinates?.lon
    )
  )
  res.send({
    cubid_country: country,
    pluscode: openLocationCode.encode(
      address?.locationDetails?.geometry?.location?.lat,
      address?.locationDetails?.geometry?.location?.lng,
      6
    ),
    coordinates: {
      lat: roundToTwoDecimals(
        address?.locationDetails?.geometry?.location?.lat ??
        address?.coordinates?.lat
      ),
      lng: roundToTwoDecimals(
        address?.locationDetails?.geometry?.location?.lng ??
      address?.coordinates?.lon
      ),
    },
    error,
  })
}

export default rough_location
