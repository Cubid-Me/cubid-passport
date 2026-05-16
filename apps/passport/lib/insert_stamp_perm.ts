import { useCallback, useEffect, useState } from "react"

import {
  grantPassportStampPermission,
  listPassportStampPermissions,
} from "@/lib/passportDataApi"

export const insertStampPerm = async (stampId: any, dapp_user_id: any) => {
  await grantPassportStampPermission({
    dappUserId: dapp_user_id,
    stampId,
  })
}

export const useSelectStampPerm = (dapp_user_id: any) => {

  const [allDappStampPerms, setAllDappStampPerms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stampInsertLoading, setStampInsertLoading] = useState(false)

  const fetchStampPerm = useCallback(async () => {
    setLoading(true)
    const data = await listPassportStampPermissions(dapp_user_id)
    setAllDappStampPerms(data)
    setLoading(false)
  }, [dapp_user_id])

  useEffect(() => {
    if (Boolean(dapp_user_id)) {
      fetchStampPerm()
    } else {
      setLoading(false)
    }
  }, [dapp_user_id, fetchStampPerm])

  const insertStampDappPerm = async (stampId: any) => {
    setStampInsertLoading(true)
    await insertStampPerm(stampId, dapp_user_id)
    await fetchStampPerm()
    setStampInsertLoading(false)
  }

  return { allDappStampPerms, loading, insertStampDappPerm, stampInsertLoading }

}
