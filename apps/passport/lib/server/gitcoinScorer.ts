import axios from "axios"

import { getRequiredEnv } from "@cubid/config"

const getGitcoinHeaders = () => ({
  "X-API-KEY": getRequiredEnv("GITCOIN_SCORER_API_KEY"),
})

const getScorerId = () => getRequiredEnv("GITCOIN_SCORER_ID")

export const fetchGitcoinPassportStamps = async (address: string) => {
  const scorerId = getScorerId()
  const { data } = await axios.get(
    `https://api.scorer.gitcoin.co/registry/stamps/${address}?include_metadata=true`,
    {
      headers: getGitcoinHeaders(),
    }
  )

  return {
    scorerId,
    stamps: data,
  }
}

export const submitGitcoinPassport = async (address: string) => {
  const scorerId = getScorerId()
  const { data } = await axios.post(
    "https://api.scorer.gitcoin.co/registry/submit-passport",
    {
      address,
      scorer_id: scorerId,
    },
    {
      headers: getGitcoinHeaders(),
    }
  )

  return data
}

export const fetchGitcoinPassportScore = async (address: string) => {
  const scorerId = getScorerId()
  const { data } = await axios.get(
    `https://api.scorer.gitcoin.co/registry/score/${scorerId}/${address}`,
    {
      headers: getGitcoinHeaders(),
    }
  )

  return data
}
