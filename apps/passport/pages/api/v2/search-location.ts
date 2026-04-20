import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import NextCors from "nextjs-cors"
import { supabase } from "@/lib/supabase"

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await NextCors(req, res, {
        // Options
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        origin: "*", // Allow all origins
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    })

    const { apikey, location_input } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { data: dataForApp } = await supabase
      .from("dapps")
      .select("*")
      .match({ apikey })
    const dappId = dataForApp?.[0]?.id
    if (!dappId) {
      return res.status(400).json({ error: "Invalid API key" })
    }
    
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!googleMapsApiKey) {
      return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY" })
    }

    const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${location_input}&key=${googleMapsApiKey}`
    )
    res.status(200).json(response.data.results)
}
