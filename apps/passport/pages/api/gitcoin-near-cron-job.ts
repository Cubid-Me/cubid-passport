// @ts-nocheck

import { createHash } from "crypto"
import type { NextApiRequest, NextApiResponse } from "next"
import { Contract, KeyPair, connect, keyStores } from "near-api-js"

import {
  fetchGitcoinPassportScore,
  submitGitcoinPassport,
} from "@/lib/server/gitcoinScorer"
import { getNearIssuerPrivateKey } from "@/lib/server/operationalSecrets"
import { handlePassportRoute } from "@/lib/server/passportApi"
import { getPassportSupabase } from "@/lib/server/supabase"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handlePassportRoute(
    req,
    res,
    {
      actor: "internal",
      allowedMethods: ["POST"],
      rateLimitGroup: "passport_internal",
      route: "internal.gitcoin_near_cron",
    },
    async () => {
      const myKeyStore = new keyStores.InMemoryKeyStore()
      const keyPairString = KeyPair.fromString(getNearIssuerPrivateKey())

      await myKeyStore.setKey("mainnet", "issuer.cubidme.near", keyPairString)

      const nearConnection = await connect({
        explorerUrl: "https://nearblocks.io",
        helperUrl: "https://helper.mainnet.near.org",
        keyStore: myKeyStore,
        networkId: "mainnet",
        nodeUrl: "https://rpc.mainnet.near.org",
        walletUrl: "https://wallet.mainnet.near.org",
      } as any)

      const creatorAccount = await nearConnection.account("issuer.cubidme.near")
      const contract = new Contract(creatorAccount, "registry.i-am-human.near", {
        changeMethods: ["sbt_update_token_references"],
        viewMethods: [],
      })

      const { data, error } = await getPassportSupabase()
        .from("cronjobs")
        .select("*")
        .eq("cronjob_type", "gp-score")

      if (error) {
        throw error
      }

      const nearAccounts = []

      for (const item of data ?? []) {
        const { id, source_account, token } = item
        await submitGitcoinPassport(source_account)
        const passportScore = await fetchGitcoinPassportScore(source_account)

        const { error: updateError } = await getPassportSupabase()
          .from("cronjobs")
          .update({
            latest_value: { passportScore: passportScore.score },
            status: "updated",
          })
          .eq("id", id)

        if (updateError) {
          throw updateError
        }

        nearAccounts.push({ score: passportScore.score, token })
      }

      const referenceArray = nearAccounts.map(({ score, token }) => {
        const reference = JSON.stringify({ passportScore: score })
        const reference_hash = createHash("sha256")
          .update(JSON.stringify(reference))
          .digest("base64")

        return [token, reference, reference_hash]
      })

      if (referenceArray.length) {
        await contract.sbt_update_token_references(
          { updates: referenceArray },
          "300000000000000"
        )
      }

      return res.status(200).json({ data: true })
    }
  )
}
