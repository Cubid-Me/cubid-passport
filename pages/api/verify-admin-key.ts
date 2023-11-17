import { NextApiRequest, NextApiResponse } from "next"

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { adminuid } = req.body
  console.log({adminuid})
  const { data } = await supabase.from("cubid-superapps").select("*").match({
    "admin-uid": adminuid,
  })
  console.log(data, "verify admin")
  res.status(200).json({adminValid:Boolean(data?.[0])})
}
