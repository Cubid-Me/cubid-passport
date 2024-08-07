import { NextApiRequest, NextApiResponse } from "next"
import { ethers } from "ethers"

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Generate a new Ethereum wallet
  const wallet = ethers.Wallet.createRandom()
  const privateKey = wallet.privateKey
  const address = wallet.address

  const { dapp_id, user_id } = req.body

  // Store the wallet in the Supabase database
  const { data, error } = await supabase
    .from("evm_accounts")
    .insert([{ private_key: privateKey, address: address, dapp_id, user_id }])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Return the public key (address) in the response
  res.status(200).json({ publicKey: address })
}
