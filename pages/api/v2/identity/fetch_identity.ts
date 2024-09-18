import NextCors from "nextjs-cors"

import { stampsWithId } from "../../utils/stampKey"
import { supabase } from "../../utils/supabase"

const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}
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
    log("Invalid API key or dapp_id", 50)
    return res.status(400).json({ error: "Invalid API key" })
  }
  const { data: dapp_users } = await supabase
    .from("dapp_users")
    .select("*,users:user_id(*),dapps:dapp_id(*)")
    .match({
      uuid: user_id,
      dapp_id: dappId,
    })
  console.log(dapp_users)
  const { error, data: stampData } = await supabase
    .from("stamps")
    .select("*")
    .match({
      created_by_user_id: dapp_users?.[0]?.users.id,
    })
  function switchKeyValue(obj: any): any {
    const switchedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        switchedObj[obj[key]] = key
      }
    }
    return switchedObj
  }

  const stampsToSend = stampData

  res.send({
    error,
    stamp_details: stampsToSend?.map((item) => ({
      value: item.uniquevalue,
      stamp_type: switchKeyValue(stampsWithId)[item.stamptype],
      status: item.is_valid ? "Verified" : "Unverified",
    })),
  })
}

export default fetchAllowUid
