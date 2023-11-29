import { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useAccount } from "wagmi"

export const useStamps = () => {
  const [stamps, setStamps] = useState([])
  const { address } = useAccount()
  console.log({address})

  const fetchAccount = useCallback(async () => {
    if (address) {
      const { data } = await axios.get(
        `https://api.scorer.gitcoin.co/registry/stamps/${address}?include_metadata=true`,
        {
          headers: {
            "X-API-KEY": "8Txcnbid.OwEP6pT0ElSptVZZfrEaKhJg8UCroukb",
          },
        }
      )
      setStamps(data?.items)
    }
  }, [address])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const stampCollector = useMemo(() => {
    const stampDataArray = []
    let counter = 0
    for (const i of stamps as any) {
      let st = {
        id: counter,
        stamp: i?.credential?.credentialSubject?.provider,
        icon: i?.metadata?.platform?.icon,
      }
      stampDataArray.push(st)
      counter += 1
    }
    return stampDataArray
  }, [stamps])
  return { stamps, stampCollector }
}
