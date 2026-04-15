import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { input } = req.body
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!googleMapsApiKey) {
    return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY" })
  }

  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${input}&key=${googleMapsApiKey}`
  )
  res.status(200).json(response.data.results)
}
