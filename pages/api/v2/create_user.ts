import { NextApiRequest, NextApiResponse } from "next"
import NextCors from "nextjs-cors"

import { supabase } from "@/lib/supabase"

import { stampsWithId } from "./../utils/stampKey"

// Simple logging function to include line numbers
const log = (message: any, lineNumber: any) => {
  console.log(`Line ${lineNumber}: ${message}`)
}

const mappedUserIdentifiers = {
  email: "email",
  phone: "phone",
  evm_account: "evm",
  github_sub: "github",
  twitter_sub: "twitter",
  google_sub: "google",
  linkedin_sub: "linkedin",
}

// Hash function for creating unique identifiers
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200,
  })
  log("CORS setup completed", 34)
  console.log(req.body, typeof req.body)
  const { dapp_id, apikey, ...userIdentifiers } = typeof req.body === "string" ? JSON.parse(req.body) : req.body

  if (!apikey || !dapp_id) {
    log("Missing required parameters", 37)
    return res.status(400).json({ error: "Missing required parameters" })
  }

  // Identify the unique value and stamptype from the request body
  let uniqueValue = null
  let stampType = null

  for (const [key, value] of Object.entries(mappedUserIdentifiers)) {
    if (userIdentifiers[key]) {
      uniqueValue = userIdentifiers[key]
      stampType = stampsWithId[value]
      break
    }
  }
  console.log({ uniqueValue, stampType })

  if (!uniqueValue || !stampType) {
    log("No valid identifier provided", 40)
    return res.status(400).json({ error: "No valid identifier provided" })
  }

  log(`Unique value: ${uniqueValue}, Stamptype: ${stampType}`, 45)

  const { data: dataForApp } = await supabase
    .from("dapps")
    .select("*")
    .match({ apikey })
  const dappId = dataForApp?.find((item) => item.apikey === apikey)?.id
  if (!dappId) {
    log("Invalid API key or dapp_id", 50)
    return res.status(400).json({ error: "Invalid API key or dapp_id" })
  }

  // Search for the unique value in the stamps table
  const { data: stampData } = await supabase
    .from("stamps")
    .select("*")
    .eq("uniquevalue", uniqueValue)
  log(`Stamp data: ${JSON.stringify(stampData)}`, 51)

  if (stampData && stampData.length > 0) {
    const userId = stampData[0].created_by_user_id
    log(`Existing stamp found for user_id: ${userId}`, 55)

    let { data: dappUsers, error: dappUserError } = await supabase
      .from("dapp_users")
      .select("*,users:user_id(*)")
      .match({ user_id: userId, dapp_id: dappId })
    log(`Dapp users data: ${JSON.stringify(dappUsers)}`, 60)

    if (!dappUsers || dappUsers.length === 0) {
      const { data: newDappUser, error } = await supabase
        .from("dapp_users")
        .insert({ user_id: userId, dapp_id: dappId })
        .select("*")
      log(`New dapp user created: ${JSON.stringify(newDappUser)}`, 66)

      return res.status(200).json({
        user_id: newDappUser?.[0]?.uuid,
        is_new_app_user: false,
        is_sybil_attack: false,
        is_blacklisted: false,
        error: error,
      })
    } else {
      log(`Dapp user already exists: ${JSON.stringify(dappUsers[0])}`, 72)
      return res.status(200).json({
        user_id: dappUsers[0]?.uuid,
        is_new_app_user: false,
        is_sybil_attack: false,
        is_blacklisted: false,
        error: dappUserError,
      })
    }
  } else {
    log("No existing stamp found, checking for existing user", 80)

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .match({ email: userIdentifiers.email })
    log(`Existing user data: ${JSON.stringify(existingUser)}`, 85)

    let userId
    if (existingUser && existingUser.length > 0) {
      userId = existingUser[0].id
      log(`Existing user found with user_id: ${userId}`, 90)
    } else {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email: userIdentifiers.email,
          created_by_app: dappId,
          is_3rd_party: true,
        })
        .select("*")
      log(`New user created: ${JSON.stringify(newUser)}`, 97)
      userId = newUser?.[0].id
    }

    log(`Stamp type to assign: ${stampType}`, 102)

    const { data: newStamp, error: newStampError } = await supabase
      .from("stamps")
      .insert({
        created_by_user_id: userId,
        created_by_app: dappId,
        stamptype: stampType,
        uniquevalue: uniqueValue,
        user_id_and_uniqueval: `${userId} ${stampType} ${uniqueValue}`,
        unique_hash: cyrb53(uniqueValue),
        stamp_json: { [stampType]: uniqueValue },
        type_and_uniquehash: `${stampType} ${cyrb53(uniqueValue)}`,
      })
      .select("*")
    log(
      `New stamp created: ${JSON.stringify(newStamp)}, Error: ${newStampError}`,
      111
    )

    const { data: newDappUser, error: dappUserError } = await supabase
      .from("dapp_users")
      .insert({ user_id: userId, dapp_id: dappId })
      .select("*")
    log(`New dapp user created: ${JSON.stringify(newDappUser)}`, 118)

    const { error } = await supabase.from("stamp_dappuser_permissions").insert({
      stamp_id: newStamp?.[0]?.id,
      dappuser_id: newDappUser?.[0]?.uuid,
      can_write: true,
      can_delete: true,
      can_read: true,
    })
    log(`Stamp dapp user permissions set: Error: ${error}`, 126)

    return res.status(200).json({
      user_id: newDappUser?.[0]?.uuid,
      is_new_app_user: true,
      is_sybil_attack: false,
      is_blacklisted: false,
      error,
    })
  }
}
