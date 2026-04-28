import { useCallback, useState } from "react"

import useAuth from "@/hooks/useAuth"
import { listPassportStampsByUser } from "@/lib/passportDataApi"

import { NearFlow } from "./nearFlow"

export const MintHumanity = () => {
  const [sbtFlow, setSbtFlow] = useState(0)
  const [nearAcc, setNearAcc] = useState<any[]>([])
  const { supabaseUser } = useAuth({})
  const fetchNearStamps = useCallback(async () => {
    if (supabaseUser?.id) {
      const data = await listPassportStampsByUser({
        stampTypeIds: [15],
        userId: supabaseUser.id,
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
