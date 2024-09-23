import { NextApiRequest, NextApiResponse } from "next"
import NextCors from "nextjs-cors"

import { supabase } from "@/lib/supabase"

const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  log("Received API request", 27)

  await NextCors(req, res, {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200,
  })
  log("CORS setup completed", 34)

  const { page_id } = req.body

  if (!page_id) {
    log("Missing required parameters", 37)
    return res.status(400).json({ error: "Missing required parameters" })
  }

  const { data: dapp_stamp_data } = await supabase
    .from("dapp_stamptypes")
    .select("*,dapp_id:dapps(*)")
    .match({ page_id })

  return res.status(200).json({
    dapp_data: dapp_stamp_data?.[0],
  })
}
