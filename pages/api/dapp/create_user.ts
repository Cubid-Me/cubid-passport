import { NextApiRequest, NextApiResponse } from "next"
import NextCors from "nextjs-cors"

import { supabase } from "@/lib/supabase"

import { stampsWithId } from "./../utils/stampKey"

// Simple logging function to include line numbers
const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}

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
  log("Received API request", 27)

  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  log("CORS setup completed", 34)

  const {
    email,
    phone,
    dapp_id: id_to_read_from,
    stamptype,
  } = req.body

  const { data: dataForApp } = await supabase.from("dapps").select("*").match({
    apikey: id_to_read_from,
  })
  const dapp_id = dataForApp?.[0]?.id
  log(`Request body: ${JSON.stringify(req.body)}`, 37)

  let uniqueValue =  phone || email
  if (!uniqueValue) {
    log("No valid identifier provided", 40)
    return res.status(400).json({ error: "No valid identifier provided" })
  }

  log(`Unique value: ${uniqueValue}`, 45)

  // Search for the unique value in the stamps table
  const { data: stampData } = await supabase
    .from("stamps")
    .select("*")
    .eq("uniquevalue", uniqueValue)
  log(`Stamp data: ${JSON.stringify(stampData)}`, 51)

  if (stampData && stampData.length > 0) {
    const user_id = stampData[0].created_by_user_id
    log(`Existing stamp found for user_id: ${user_id}`, 55)

    let { data: dappUsers } = await supabase
      .from("dapp_users")
      .select("*,users:user_id(*)")
      .match({ user_id, dapp_id })
    log(`Dapp users data: ${JSON.stringify(dappUsers)}`, 60)

    if (!dappUsers || dappUsers.length === 0) {
      // Create a new dapp_user entry if it doesn't exist
      const { data: newDappUser, error } = await supabase
        .from("dapp_users")
        .insert({ user_id, dapp_id })
        .select("*")
      log(
        `New dapp user created: ${JSON.stringify(newDappUser)} ${JSON.stringify(
          { user_id, dapp_id }
        )}`,
        66
      )

      res.status(200).json({
        uuid: newDappUser?.[0]?.uuid,
        newuser: true,
        error,
      })
    } else {
      log(`Dapp user already exists: ${JSON.stringify(dappUsers[0])}`, 72)

      res.status(200).json({
        uuid: dappUsers[0]?.uuid,
        user: dappUsers[0],
        newuser: false,
      })
    }
  } else {
    log("No existing stamp found, checking for existing user", 80)

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .match({ email })
    log(`Existing user data: ${JSON.stringify(existingUser)}`, 85)

    let user_id
    if (existingUser && existingUser.length > 0) {
      user_id = existingUser[0].id
      log(`Existing user found with user_id: ${user_id}`, 90)
    } else {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email,
          created_by_app: dapp_id,
          is_3rd_party: true,
        })
        .select("*")
      log(`New user created: ${JSON.stringify(newUser)}`, 97)

      user_id = newUser?.[0].id
    }

    const stampIdToAssign = stampsWithId?.[phone ? "phone" : "email"]
    log(`Stamp type to assign: ${stampIdToAssign}`, 102)

    const { data: newStamp, error: newStampError } = await supabase
      .from("stamps")
      .insert({
        created_by_user_id: user_id,
        created_by_app: dapp_id,
        stamptype: stampIdToAssign,
        uniquevalue: uniqueValue,
        user_id_and_uniqueval: `${user_id} ${stampIdToAssign} ${uniqueValue}`,
        unique_hash: cyrb53(uniqueValue),
        stamp_json: { [phone ? "phone" : "email"]: uniqueValue },
        type_and_uniquehash: `${stampIdToAssign} ${cyrb53(uniqueValue)}`,
      })
      .select("*")
    log(
      `New stamp created: ${JSON.stringify(newStamp)}, Error: ${newStampError}`,
      111
    )

    const { data: newDappUser, error: dappUserError } = await supabase
      .from("dapp_users")
      .insert({
        user_id,
        dapp_id,
      })
      .select("*")
    log(
      `New dapp user created: ${JSON.stringify(
        newDappUser
      )}, Error: ${dappUserError}`,
      118
    )

    const { error } = await supabase.from("stamp_dappuser_permissions").insert({
      stamp_id: newStamp?.[0]?.id,
      dappuser_id: newDappUser?.[0]?.uuid,
      can_write: true,
      can_delete: true,
      can_read: true,
    })
    log(`Stamp dapp user permissions set: Error: ${error}`, 126)

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
      dappUserError,
      newStampError,
      error,
    })
  }
}
