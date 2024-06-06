import { NextApiRequest, NextApiResponse } from "next"
import NextCors from "nextjs-cors"

import { supabase } from "@/lib/supabase"

import { stampsWithId } from "./../utils/stampKey"

const cyrb53 = (str: string, seed = 0) => {
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

  const { sub, email, phone, dapp_id, stamptype } = req.body

  let uniqueValue = sub || phone || email
  if (!uniqueValue) {
    return res.status(400).json({ error: "No valid identifier provided" })
  }

  // Search for the unique value in the stamps table
  const { data: stampData } = await supabase
    .from("stamps")
    .select("*")
    .eq("uniquevalue", uniqueValue)

  if (stampData && stampData.length > 0) {
    const user_id = stampData[0].created_by_user_id

    let { data: dappUsers } = await supabase
      .from("dapp_users")
      .select("*")
      .match({ user_id, dapp_id })

    if (!dappUsers || dappUsers.length === 0) {
      // Create a new dapp_user entry if it doesn't exist
      const { data: newDappUser } = await supabase
        .from("dapp_users")
        .insert({ user_id, dapp_id })
        .select()

      res.status(200).json({
        uuid: newDappUser?.[0]?.uuid,
        newuser: false,
      })
    } else {
      res.status(200).json({
        uuid: dappUsers[0]?.uuid,
        newuser: false,
      })
    }
  } else {
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .match({ email })

    let user_id
    if (existingUser && existingUser.length > 0) {
      user_id = existingUser[0].id
    } else {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email,
          created_by_app: dapp_id,
          is_3rd_party: true,
        })
        .select()

      user_id = newUser?.[0].id
    }
    const stampIdToAssign = stampsWithId?.[stamptype]
    const { data: newStamp } = await supabase
      .from("stamps")
      .insert({
        created_by_user_id: user_id,
        created_by_app: dapp_id,
        stamptype: stampIdToAssign,
        uniquevalue: uniqueValue,
        user_id_and_uniqueval: `${user_id} ${stampIdToAssign} ${uniqueValue}`,
        unique_hash: cyrb53(uniqueValue),
        stamp_json: { [sub ? "sub" : phone ? "phone" : "email"]: uniqueValue },
        type_and_uniquehash: `${stampIdToAssign} ${cyrb53(uniqueValue)}`,
      })
      .select()

    const { data: newDappUser } = await supabase
      .from("dapp_users")
      .insert({
        user_id,
        dapp_id,
      })
      .select()

    const { error } = await supabase.from("stamp_dappuser_permissions").insert({
      stamp_id: newStamp?.[0]?.id,
      dappuser_id: newDappUser?.[0]?.uuid,
      can_write: true,
      can_delete: true,
      can_read: true,
    })

    res.status(200).json({
      uuid:
        newDappUser?.[0]?.uuid ??
        (
          await supabase.from("dapp_users").select("*").match({
            user_id,
            dapp_id,
          })
        )?.data?.[0]?.uuid,
      newuser: true,
      error,
    })
  }
}
