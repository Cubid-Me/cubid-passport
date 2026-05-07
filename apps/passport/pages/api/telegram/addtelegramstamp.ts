import axios from "axios"

import { encode_data } from "@/lib/encode_data"
import { insertStampPerm } from "@/lib/insert_stamp_perm"

import { supabase } from "../utils/supabase"
import { insertStamp } from "@/lib/stampInsertion"

export default async function handler(req: any, res: any) {
  const { id, username, photo_url, first_name, last_name, userid } = req.body
  console.log(req.body)
  try {

    await insertStamp({
      stamp_type: 'telegram',
      user_data: { user_id: userid, uuid: '' },
      stampData: {
        identity: username,
        uniquevalue: id,
        id, username, photo_url, first_name, last_name
      },
      app_id: parseInt(process.env.NEXT_PUBLIC_DAPP_ID ?? ""),
    })
    res.send({ success: true })
  } catch (err: any) {
    console.log(err)
    res.send({ err })
  }
}
