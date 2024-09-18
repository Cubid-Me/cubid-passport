import NextCors from "nextjs-cors"

import { supabase } from "../utils/supabase"

const fetchAllowUid = async (req: any, res: any) => {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const { apikey, user_id } = req.body
  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey })
  const dappId = dataForApp?.[0]?.id
  if (!dappId) {
    return res.status(400).json({ error: "Invalid API key" })
  }
  const { data: dapp_users } = await supabase
    .from("dapp_users")
    .select("*,users:user_id(*),dapps:dapp_id(*)")
    .match({
      uuid: user_id,
      dapp_id: dappId,
    })
  const user = dapp_users?.[0]?.users
  res.send({
    address: user.address,
    cubid_country: user.cubid_country,
    cubid_postalcode: user.cubid_postalcode,
  })
}

export default fetchAllowUid
