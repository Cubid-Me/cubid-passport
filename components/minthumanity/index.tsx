import { useCallback, useState } from "react"
import axios from "axios"

import useAuth from "@/hooks/useAuth"

import { NearFlow } from "./nearFlow"

export const MintHumanity = () => {
  const [sbtFlow, setSbtFlow] = useState(0)
  const [nearAcc, setNearAcc] = useState([])
  const { supabaseUser } = useAuth({})
  const fetchNearStamps = useCallback(async () => {
    if (supabaseUser?.id) {
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 15,
        },
        table: "stamps",
      })
      const allNearAcc = data.map((item: any) => item.uniquevalue)
      setNearAcc(allNearAcc)
    }
  }, [supabaseUser])
  return (
    <>
      {sbtFlow === 0 && (
        <div className="h-screen p-2">
          <p className="text-xl font-semibold text-white">
            Mint Humanity On-Chain
          </p>
          <NearFlow />
        </div>
      )}
      {sbtFlow === 1 && (
        <div className="h-screen p-2">
          <p className="text-xl font-semibold text-white">SBT LIST</p>
          <div></div>
        </div>
      )}
    </>
  )
}
