import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import { getRequiredEnv } from "@cubid/config"

import {
  handlePassportRoute,
  passportSchemas,
} from "@/lib/server/passportApi"

const schema = passportSchemas.z.object({
  apikey: passportSchemas.z.string().min(1),
  location_input: passportSchemas.z.string().min(1),
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
      route: "v2.search_location",
    },
    async ({ body }) => {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/place/textsearch/json",
        {
          params: {
            key: getRequiredEnv("GOOGLE_MAPS_API_KEY"),
            query: body.location_input,
          },
        }
      )

      return res.status(200).json(response.data.results)
    }
  )
}
