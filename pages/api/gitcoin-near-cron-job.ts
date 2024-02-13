// @ts-nocheck

import { createHash } from "crypto"
import path from "path"
import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import { Contract, KeyPair, connect, keyStores, utils } from "near-api-js"

import { supabase } from "./utils/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const myKeyStore = new keyStores.InMemoryKeyStore()
  const PRIVATE_KEY = process.env.private_key_near

  // Creates a public / private key pair using the provided private key
  const keyPairString = KeyPair.fromString(PRIVATE_KEY)

  // Adds the keyPair you created to keyStore
  await myKeyStore.setKey("mainnet", "issuer.cubidme.near", keyPairString)

  const connectionConfig = {
    networkId: "mainnet",
    keyStore: myKeyStore, // First create a key store
    nodeUrl: "https://rpc.mainnet.near.org",
    walletUrl: "https://wallet.mainnet.near.org",
    helperUrl: "https://helper.mainnet.near.org",
    explorerUrl: "https://nearblocks.io",
  }

  const nearConnection = await connect(connectionConfig as any)
  const creatorAccount = await nearConnection.account("issuer.cubidme.near")
  const contract = new Contract(creatorAccount, "registry.i-am-human.near", {
    // Name of contract you're connecting to
    viewMethods: [], // View methods do not change state but usually return a value
    changeMethods: ["sbt_update_token_references"], // Change methods modify state
  })

  const { data } = await supabase
    .from("cronjobs")
    .select("*")
    .eq("cronjob_type", "gp-score")
  console.log(data)

  try {
    const nearAccounts = []
    data.map(async (item) => {
      const { token, source_account, id } = item
      await axios.post(
        "https://api.scorer.gitcoin.co/registry/submit-passport",
        {
          address: source_account,
          scorer_id: "6559",
        },
        {
          headers: {
            "X-API-KEY": "8Txcnbid.OwEP6pT0ElSptVZZfrEaKhJg8UCroukb",
          },
        }
      )
      const { data: passportScore } = await axios.get(
        `https://api.scorer.gitcoin.co/registry/score/6559/${source_account}`,
        {
          headers: {
            "X-API-KEY": "8Txcnbid.OwEP6pT0ElSptVZZfrEaKhJg8UCroukb",
          },
        }
      )
      await supabase
        .from("cronjobs")
        .update({
          status: "updated",
          latest_value: { passportScore: passportScore.score },
        })
        .eq("id", id)
      nearAccounts.push({ token, score: passportScore.score })
      if (nearAccounts.length - 1 === data?.length - 1) {
        const refrenceArray = []
        nearAccounts.map(async ({ score, token }, idx) => {
          const reference = JSON.stringify({
            passportScore: score,
          })
          const reference_hash = createHash("sha256")
            .update(JSON.stringify(reference))
            .digest("base64")
          refrenceArray.push([
            token,
            reference, // Represents None for Option<String>
            reference_hash, // Represents None for Option<Base64VecU8>
          ])
          console.log(refrenceArray)
          if (idx === nearAccounts.length - 1) {
            const data = await contract.sbt_update_token_references(
              { updates: refrenceArray },
              "300000000000000"
            )
          }
        })
      }
    })
    console.log(nearAccounts)

    res.send(true)
  } catch (err) {
    console.log(err)
    res.status(500).json(err)
  }
}
