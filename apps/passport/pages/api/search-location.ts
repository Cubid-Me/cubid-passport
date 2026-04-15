import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { input } = req.body
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${input}&key=AIzaSyCW7A2LY_XIQtmNym9t0hs17nPYO7O7A0A`
  )
  res.status(200).json(response.data.results)
}
