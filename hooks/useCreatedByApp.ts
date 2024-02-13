import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"

export const useCreatedByAppId = () => {
  const cubidAppId = 22
  const searchParams: any = useSearchParams()
  const adminuid = searchParams.get("adminuid")
  const fetchValidId = useCallback(async () => {
    if (adminuid) {
      const {
        data: { adminValid, app_id },
      } = await axios.post("/api/verify-admin-key", {
        adminuid,
      })
      return app_id
    }
  }, [adminuid])
  const getIdForApp = useCallback(async () => {
    return window.location.href.includes("/allow") ? await fetchValidId() : cubidAppId
  }, [fetchValidId])
  return { getIdForApp };
}
