import { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useAccount } from "wagmi"
import useAuth from "./useAuth"

export const useStamps = () => {
  const [stamps, setStamps] = useState([])
  const { supabaseUser } = useAuth({})
  const fetchNearAndGitcoinStamps = useCallback(async () => {
    if (supabaseUser?.id) {
      const {
        data: { data: gitcoin_data },
      } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 9,
        },
        table: "stamps",
      })
      const gitcoinStamps = gitcoin_data[0]?.stamp_json?.stamps?.items??[]
      setStamps(gitcoinStamps)
    }
  }, [supabaseUser])

  useEffect(()=>{
    fetchNearAndGitcoinStamps()
  },[fetchNearAndGitcoinStamps])


  const stampCollector = useMemo(() => {
    const stampDataArray = []
    let counter = 0
    for (const i of stamps as any) {
      let st = {
        id: counter,
        stamp: i?.metadata?.platform?.id,
        icon: i?.metadata?.platform?.icon,
      }
      stampDataArray.push(st)
      counter += 1
    }
    return stampDataArray
  }, [stamps])
  return { stamps, stampCollector }
}
