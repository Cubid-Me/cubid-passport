import axios from "axios"

import { encode_data } from "@/lib/encode_data"
import { insertStampPerm } from "@/lib/insert_stamp_perm"

import { supabase } from "../utils/supabase"

export default async function handler(req: any, res: any) {
  const { id, username, photo_url, first_name, last_name, userid } = req.body
  console.log(req.body)
  try {
    const stampId = 27
    const dbUser = userid
    const database = {
      uniquehash: await encode_data(id),
      stamptype: stampId,
      created_by_user_id: userid,
      unencrypted_unique_data: JSON.stringify({ id }),
      type_and_hash: `${stampId} ${await encode_data(id)}`,
    }
    const dataToSet = {
      created_by_user_id: userid,
      created_by_app: 33,
      stamptype: stampId,
      uniquevalue: id,
      user_id_and_uniqueval: `${userid} ${stampId} ${id}`,
      unique_hash: await encode_data(id),
      stamp_json: { id, username, photo_url, first_name, last_name },
      type_and_uniquehash: `${stampId} ${await encode_data(id)}`,
    }
    const { error: error1 } = await supabase.from("uniquestamps").insert({
      ...database,
    })

    const { error, data: stampData } = await supabase
      .from("stamps")
      .insert({
        ...dataToSet,
      })
      .select("*")

    console.log({ error, error1 })
    if (stampData?.[0]?.id) {
      await supabase.from("authorized_dapps").insert({
        dapp_id: process.env.NEXT_PUBLIC_DAPP_ID,
        dapp_and_stamp_id: `${process.env.NEXT_PUBLIC_DAPP_ID} ${stampData?.[0]?.id}`,
        stamp_id: stampData?.[0]?.id,
        can_read: true,
        can_update: true,
        can_delete: true,
      })
    }
    res.send({ success: true })
  } catch (err: any) {
    console.log(err)
    res.send({ err })
  }
}
