// @ts-nocheck
// pages/api/generateImplicitWallet.ts

import { NextApiRequest, NextApiResponse } from "next"
import { KeyPair } from "near-api-js"
import bs58 from "bs58"
import { supabase } from "./utils/supabase"
import { server_insertStamp } from "@/lib/stampInsertion"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.body
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" })
  }

  // Generate a new key pair using ed25519.
  const newKeyPair = KeyPair.fromRandom("ed25519")

  // The public key is in the format "ed25519:<base58-encoded key>".
  // For implicit accounts, we need a 64-character hex string.
  const publicKeyStr = newKeyPair.getPublicKey().toString() // e.g. "ed25519:3hA..."
  const parts = publicKeyStr.split(":")
  if (parts.length !== 2) {
    return res.status(500).json({ error: "Invalid public key format" })
  }
  const base58Pub = parts[1]

  // Convert the base58 public key to a Buffer.
  const pubBuffer = bs58.decode(base58Pub)
  // Convert the Buffer to a hexadecimal string.
  const implicitAccountId = pubBuffer.toString("hex")

  // Prepare account data.
  const data_near = { accountId: implicitAccountId }

  // Insert the new account data into Supabase, including the private key.
  const { data, error } = await supabase.from("near-api-accounts").insert({
    account_address: implicitAccountId,
    owner_id: userId,
    query_data: data_near,
    private_key: newKeyPair.toString()
  })

  if (error) {
    console.error("Supabase insert error:", error)
    return res.status(500).json({ error: "Error saving account to database", details: error })
  }

  // Optionally, record a stamp for this new account.
  await server_insertStamp({
    stamp_type: "near",
    user_data: { user_id: userId, uuid: "" },
    stampData: {
      identity: implicitAccountId,
      uniquevalue: implicitAccountId,
    },
    app_id: parseInt(process.env.NEXT_PUBLIC_DAPP_ID ?? "0"),
  })

  res.status(200).json(data_near)
}