// @ts-nocheck
import path from "path"
import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import { Contract, KeyPair, connect, keyStores, utils } from "near-api-js"
import {createHash} from 'crypto';

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { nearAccount, score } = req.body
  const myKeyStore = new keyStores.InMemoryKeyStore()
  const PRIVATE_KEY = process.env.private_key_near
  // creates a public / private key pair using the provided private key
  const keyPairString = KeyPair.fromString(PRIVATE_KEY)
  // adds the keyPair you created to keyStore
  await myKeyStore.setKey("mainnet", "issuer.cubidme.near", keyPairString)

  const connectionConfig = {
    networkId: "mainnet",
    keyStore: myKeyStore, // first create a key store
    nodeUrl: "https://rpc.mainnet.near.org",
    walletUrl: "https://wallet.mainnet.near.org",
    helperUrl: "https://helper.mainnet.near.org",
    explorerUrl: "https://nearblocks.io",
  }

  const nearConnection = await connect(connectionConfig as any)
  const creatorAccount = await nearConnection.account("issuer.cubidme.near")
  const contract = new Contract(
    creatorAccount, // the account object that is connecting
    "issuer.cubidme.near",
    {
      // name of contract you're connecting to
      viewMethods: [], // view methods do not change state but usually return a value
      changeMethods: ["sbt_update_token_references"], // change methods modify state
    }
  )
  const {data}  = await supabase.from("stamps").select('*').in('stamptype', [9, 15])
  console.log(data);
  return ;
  try {
    const reference = JSON.stringify({
      passportScore: score,
    })
    const reference_hash = createHash('sha256').update(JSON.stringify(reference)).digest('base64')
    const data = await contract.sbt_update_token_references(
      [{
        receiver: nearAccount,
        metadata: {
          class: 1,
          reference,
          reference_hash
        },
      }],
      "300000000000000",
      "9000000000000000000000"
    )
    res.send(data)
  } catch (err) {
    console.log(err)
    res.status(500).json(err)
  }
}
