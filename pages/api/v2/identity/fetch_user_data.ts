// @ts-nocheck
import NextCors from "nextjs-cors"
import { OpenLocationCode } from "open-location-code"

import { getLocationDetailsFromPlusCode } from "../../utils/locationMethods"
import { stampsWithId } from "../../utils/stampKey"
import { supabase } from "../../utils/supabase"

const log = (message: any, lineNumber: any) => {
    console.log(`Line ${lineNumber}: ${message}`)
}
export default async function handler(req: any, res: any) {
    await NextCors(req, res, {
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200,
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
            dapp_id: dappId,
        })

    const {
        users: { address, cubid_country, cubid_postalcode, nickname },
    } = dapp_users?.[0]

    const roundToTwoDecimals = (number: number) => {
        return Math.round(number * 100) / 100
    }

    const openLocationCode = new OpenLocationCode()
    const { country, postalCode, formattedAddress } =
        await getLocationDetailsFromPlusCode(
            openLocationCode.encode(
                address?.locationDetails?.geometry?.location?.lat ??
                address?.coordinates?.lat,
                address?.locationDetails?.geometry?.location?.lng ??
                address?.coordinates?.lon
            )
        )

    function removePlusCode(input) {
        // Regex pattern for Plus Code (e.g., MPFF+JX)
        const plusCodePattern = /^[A-Z0-9]{4}\+[A-Z0-9]{2}\s?/

        // Check if the string starts with a Plus Code and remove it
        if (plusCodePattern.test(input)) {
            return input.replace(plusCodePattern, "").trim()
        }

        // If no Plus Code is found, return the original string
        return input
    }
    res.send({
        name: nickname,
        placename: removePlusCode(formattedAddress),
        country: country,
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
