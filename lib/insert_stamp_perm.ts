import axios from "axios"
import { useEffect, useState } from "react"

export const insertStampPerm = async (stampId: any, dapp_user_id: any) => {
  await axios.post("/api/supabase/insert", {
    body: {
      stamp_id: stampId,
      dappuser_id: dapp_user_id,
      can_write: true,
      can_delete: true,
      can_read: true,
    },
    table: "stamp_dappuser_permissions"
  })
}

export const useSelectStampPerm = (dapp_user_id: any) => {

  const [allDappStampPerms, setAllDappStampPerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [stampInsertLoading, setStampInsertLoading] = useState(false)

  const fetchStampPerm = async () => {
    setLoading(true)
    const { data } = await axios.post("/api/supabase/select", {
      table: "stamp_dappuser_permissions",
      match: {
        dappuser_id: dapp_user_id,
      }
    })
    setAllDappStampPerms(data?.data)
    setLoading(false)
  }

  useEffect(() => {
    console.log({ dapp_user_id }, 'allDappStampPerms')
    if (Boolean(dapp_user_id)) {
      fetchStampPerm()
    } else {
      setLoading(false)
    }
  }, [dapp_user_id])

  const insertStampDappPerm = async (stampId: any) => {
    setStampInsertLoading(true)
    await insertStampPerm(stampId, dapp_user_id);
    const { data } = await axios.post("/api/supabase/select", {
      table: "stamp_dappuser_permissions",
      match: {
        dappuser_id: dapp_user_id,
      }
    })
    setAllDappStampPerms(data?.data)
    setStampInsertLoading(false)
  }

  return { allDappStampPerms, loading, insertStampDappPerm, stampInsertLoading }

}

