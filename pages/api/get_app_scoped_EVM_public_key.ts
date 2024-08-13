import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import { ethers } from "ethers"
import NextCors from "nextjs-cors"

import { encode_data } from "@/lib/encode_data"
import { insertStampPerm } from "@/lib/insert_stamp_perm"

import { stampsWithId } from "./utils/stampKey"
import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Generate a new Ethereum wallet
  await NextCors(req, res, {
    // Options
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "*", // Allow all origins
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
  const wallet = ethers.Wallet.createRandom()
  const privateKey = wallet.privateKey
  const address = wallet.address

  const { dapp_id, user_id } = req.body

  // Store the wallet in the Supabase database
  const { data, error } = await supabase
    .from("evm_accounts")
    .insert([{ private_key: privateKey, address: address, dapp_id, user_id }])
  const dataToSet_stamp = {
    created_by_user_id: user_id,
    created_by_app: await dapp_id,
    stamptype: stampsWithId.evm,
    uniquevalue: address,
    user_id_and_uniqueval: `${user_id} ${stampsWithId.evm} ${address}`,
    unique_hash: await encode_data(address),
    stamp_json: { address },
    type_and_uniquehash: `${stampsWithId.evm} ${await encode_data(address)}`,
  }

  const { data: evmData }: any = await supabase
    .from("stamps")
    .insert(dataToSet_stamp)
  if (evmData?.[0]?.id) {
    await supabase.from("authorized_dapps").insert({
      dapp_id: 22,
      dapp_and_stamp_id: `22 ${evmData?.[0]?.id}`,
      stamp_id: evmData?.[0]?.id,
      can_read: true,
      can_update: true,
      can_delete: true,
    })
  }
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Return the public key (address) in the response
  res.status(200).json({ publicKey: address })
}
