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
    
    const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${location_input}&key=AIzaSyCW7A2LY_XIQtmNym9t0hs17nPYO7O7A0A`
    )
    res.status(200).json(response.data.results)
}
