import path from "path"
import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import { Contract, KeyPair, connect, keyStores, utils } from "near-api-js"

import { supabase } from "./utils/supabase"

function generateRandomString() {
  // Define the characters that can be in the string
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  // The length of the random string
  const length = 4
  // Variable to hold the random string
  let result = ""
  // Generate the random string
  for (let i = 0; i < length; i++) {
    // Get a random index from the characters string
    const randomIndex = Math.floor(Math.random() * characters.length)
    // Append the character to the result
    result += characters[randomIndex]
  }
  // Return the result
  return result
}
const encode_data = async (str: string) => {
  const seed = 0
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

function numberStringToAlphabets(numberString:string) {
  // Initialize the result string
  let result = ""

  // Loop through the number string
  for (let i = 0; i < numberString.length; i++) {
    // Get the current digit
    const num = parseInt(numberString[i], 10)

    if (num === 0) {
      // If the number is 0, map it to a space or special character
      result += "AA" // Change '_' to any character you prefer to represent '0'
    } else if (num >= 1 && num <= 26) {
      // Map the number to its corresponding alphabet letter
      // A char code is 65, so to get correct char code, add num to 64
      const char = String.fromCharCode(64 + num)

      // Append the alphabet letter to the result
      result += char
    } else {
      // If the number is not in the range 0-26, return an error or handle accordingly
      return "Invalid input. Number must be between 0 and 26."
    }
  }

  // Return the result
  return result
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.body
  const myKeyStore = new keyStores.InMemoryKeyStore()
  const PRIVATE_KEY =
    "ed25519:5iCem58HUk9M1DkidrhAKzBR3abQgRWyormu5fxaboWn7MSHVNDimTX2XannYXtgmcF1UENiha4DSqUsNUu9y8ky"
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
  const keyPair = KeyPair.fromRandom("ed25519")
  const publicKey = keyPairString.getPublicKey().toString()
  const randomString = generateRandomString()
  const accountToCreate = `${numberStringToAlphabets(`${userId}`)}${randomString}`.toLowerCase()
  console.log(accountToCreate)
  await myKeyStore.setKey(
    connectionConfig.networkId,
    `${accountToCreate}.near`,
    keyPair
  )
  try {
    const data_near = await creatorAccount.functionCall({
      contractId: "near",
      methodName: "create_account",
      args: {
        new_account_id: `${accountToCreate}.near`,
        new_public_key: publicKey,
      },
      gas: "300000000000000" as any,
      attachedDeposit: utils.format.parseNearAmount("0.01") as any,
    })
    await supabase.from("near-api-accounts").insert({
      account_address: `${accountToCreate}.near`,
      owner_id: userId,
      query_data: data_near,
    })
    const database = {
      uniquehash: await encode_data(`${accountToCreate}.near`),
      stamptype: 15,
      created_by_user_id: userId,
      unencrypted_unique_data: `${accountToCreate}.near`,
      type_and_hash: `15 ${await encode_data(`${accountToCreate}.near`)}`,
    }
    const dataToSet = {
      created_by_user_id: userId,
      created_by_app: 22,
      stamptype: 15,
      uniquevalue: `${accountToCreate}.near`,
      unique_hash: await encode_data(`${accountToCreate}.near`),
      stamp_json: {},
      type_and_uniquehash: `15 ${await encode_data(`${accountToCreate}.near`)}`,
    }
    await supabase.from("uniquestamps").insert(database)
    const { data }: any = await supabase.from("stamps").insert(dataToSet)
    if (data?.[0]?.id) {
      await supabase.from("authorized_dapps").insert({
        dapp_id: 22,
        dapp_and_stamp_id: `22 ${data?.[0]?.id}`,
        stamp_id: data?.[0]?.id,
        can_read: true,
        can_update: true,
        can_delete: true,
      })
    }
    res.status(200).json(data_near)
  } catch (err) {
    console.log(err)
    res.status(200).json(err)
  }
}
