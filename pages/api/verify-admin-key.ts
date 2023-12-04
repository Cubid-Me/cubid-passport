import { NextApiRequest, NextApiResponse } from "next"

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { adminuid } = req.body;
  const { data } = await supabase.from("dapps").select("*").match({
    "admin-uid": adminuid,
  });
  res.status(200).json({adminValid:Boolean(data?.[0])})
}
