import axios from "axios"

import { encode_data } from "@/lib/encode_data"
import { insertStampPerm } from "@/lib/insert_stamp_perm"

import { supabase } from "../utils/supabase"

export default async function handler(req: any, res: any) {
  const { code, userid } = req.body
  console.log(req.body)
  try {
    const data = new URLSearchParams()
    data.append("code", code)
    data.append("grant_type", "authorization_code")
    data.append("redirect_uri", "https://passport.cubid.me/worldcoin")
    data.append("client_id", process.env.WLD_CLIENT_ID ?? "")

    const { data: dta } = await axios.post(
      "https://id.worldcoin.org/token",
      data,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.WLD_CLIENT_ID}:${process.env.WLD_CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    const { access_token, ...all_data } = dta
    console.log({ access_token, ...all_data, code })
    const user_data_raw = await fetch("https://id.worldcoin.org/userinfo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
    const user_data = await user_data_raw?.json()
    const stampId = 26
    const dbUser = userid
    const database = {
      uniquehash: await encode_data(user_data.sub),
      stamptype: stampId,
      created_by_user_id: dbUser?.id,
      unencrypted_unique_data: JSON.stringify(user_data),
      type_and_hash: `${stampId} ${await encode_data(user_data.sub)}`,
    }
    const dataToSet = {
      created_by_user_id: userid,
      created_by_app: 33,
      stamptype: stampId,
      uniquevalue: user_data.sub,
      user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${user_data.sub}`,
      unique_hash: await encode_data(user_data?.sub),
      stamp_json: { user_data },
      type_and_uniquehash: `${stampId} ${await encode_data(user_data.sub)}`,
    }
    await supabase.from("uniquestamps").insert({
      ...database,
    })

    const { error, data: stampData } = await supabase
      .from("stamps")
      .insert({
        ...dataToSet,
      })
      .select("*")
    if (stampData?.[0]?.id) {
      await supabase.from("authorized_dapps").insert({
        dapp_id: 33,
        dapp_and_stamp_id: `33 ${stampData?.[0]?.id}`,
        stamp_id: stampData?.[0]?.id,
        can_read: true,
        can_update: true,
        can_delete: true,
      })
    }
    res.send({ user_data })
  } catch (err: any) {
    console.log(err)
    res.send({ err })
  }
}
