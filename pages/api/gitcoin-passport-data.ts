import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import NextCors from "nextjs-cors"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })

  const { address } = req.body
  const { data: stamps } = await axios.get(
    `https://api.scorer.gitcoin.co/registry/stamps/${address}?include_metadata=true`,
    {
      headers: {
        "X-API-KEY": "8Txcnbid.OwEP6pT0ElSptVZZfrEaKhJg8UCroukb",
      },
    }
  );
  await axios.post(
    "https://api.scorer.gitcoin.co/registry/submit-passport",
    {
      address,
      scorer_id: "5964",
    },
    {
      headers: {
        "X-API-KEY": "8Txcnbid.OwEP6pT0ElSptVZZfrEaKhJg8UCroukb",
      },
    }
  );
  const { data: scores } = await axios.get(
    `https://api.scorer.gitcoin.co/registry/score/5964/${address}`,
    {
      headers: {
        "X-API-KEY": "8Txcnbid.OwEP6pT0ElSptVZZfrEaKhJg8UCroukb",
      },
    }
  );
  res.status(200).json({ stamps, scores })
}
