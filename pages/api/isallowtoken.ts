import { NextApiRequest, NextApiResponse } from "next"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sample data to return when the API endpoint is called
  const isAllowToken = process.env.is_allow_token ?? ""

  res.status(200).json({ isAllow: Boolean(process.env.is_allow_token) })
}
