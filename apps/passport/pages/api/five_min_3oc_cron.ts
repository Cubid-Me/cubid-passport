import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

import { handlePassportRoute } from "@/lib/server/passportApi"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "internal",
      allowedMethods: ["POST"],
      rateLimitGroup: "passport_internal",
      route: "internal.five_min_3oc_cron",
    },
    async () => {
      await axios.post("https://threeoc-a8915caf5aa3.herokuapp.com/cron-job-dates")
      return res.status(200).json({ data: true })
    }
  )
}
