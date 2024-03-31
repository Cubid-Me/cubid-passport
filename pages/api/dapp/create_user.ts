// @ts-nocheck

import { NextApiRequest, NextApiResponse } from "next"
import NextCors from "nextjs-cors"

import { supabase } from "@/lib/supabase"

const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const { email, dapp_id } = req.body
  const { data: selectUser } = await supabase
    .from("users")
    .select("*")
    .match({ email })
  if (selectUser?.[0]) {
    const { data: dappUsers1 } = await supabase
      .from("dapp_users")
      .select("*")
      .match({
        user_id: selectUser?.[0]?.id,
        dapp_id,
      })
    if (!dappUsers1?.[0]?.uuid) {
      res.status(200).json({
        uuid: (
          await supabase
            .from("dapp_users")
            .insert({
              user_id: data[0].id,
              dapp_id,
            })
            .select()
        )?.data?.[0]?.uuid,
      })
    }
    res.status(200).json({
      uuid: dappUsers1?.[0]?.uuid,
    })
  } else {
    const { data } = await supabase
      .from("users")
      .insert({
        email,
      })
      .select()

    const { data: dapp_users } = await supabase
      .from("dapp_users")
      .insert({
        user_id: data[0].id,
        dapp_id,
      })
      .select()
    const database = {
      uniquehash: cyrb53(email),
      stamptype: 13,
      created_by_user_id: data?.[0]?.id,
      unencrypted_unique_data: email,
      type_and_hash: `13 ${cyrb53(email)}`,
    }
    const dataToSet = {
      created_by_user_id: data?.[0]?.id,
      created_by_app: dapp_id,
      stamptype: 13,
      uniquevalue: email,
      user_id_and_uniqueval: `${data?.[0]?.id} 13 ${email}`,
      unique_hash: cyrb53(email),
      stamp_json: { email },
      type_and_uniquehash: `13 ${cyrb53(email)}`,
    }
    await supabase.from("uniquestamps").insert(database)
    const { data: stampData } = await supabase.from("stamps").insert(dataToSet)
    await supabase.from("stamp_dappuser_permissions").insert({
      stamp_id: stampData?.[0]?.id,
      dappuser_id: dapp_users?.[0]?.uuid,
      can_write: true,
      can_delete: true,
      can_read: true,
    })

    res.status(200).json({
      uuid: dapp_users?.[0]?.uuid,
    })
  }
}
