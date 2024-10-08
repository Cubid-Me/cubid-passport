// @ts-nocheck
import NextCors from "nextjs-cors"

import { stampsWithId } from "../../utils/stampKey"
import { supabase } from "../../utils/supabase"

const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}
export default async function handler (req: any, res: any)  {
  await NextCors(req, res, {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200,
  })
  const { apikey, user_id } = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey: apikey });

  const dappId = dataForApp?.find((item) => item.apikey === apikey)?.id
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

  const { data: stamp_perms } = await supabase.from("dapp_stamptypes").select("*").match({ dapp_id: 46 })
  const allStampIds = [...stamp_perms?.map((item) => item.stamptype_id),13]

  const stampsToSend = stampData?.filter((_) => allStampIds?.includes(_.stamptype))

  res.send({
    error,
    stamp_details: stampsToSend?.map((item) => ({
      value: item.uniquevalue,
      stamp_type: switchKeyValue(stampsWithId)[item.stamptype],
      status: item.is_valid ? "Verified" : "Unverified",
    })),
  })
}
