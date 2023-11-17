"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"

const AllowPage = () => {
  const searchParams: any = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  const adminuid = searchParams.get("adminuid")
  const stamps = searchParams.get("stamps")
  const allStamps = stamps?.split(",")
  console.log(allStamps)
  const urltoreturn = searchParams.get("url")

  const fetchValidId = useCallback(async () => {
    setLoading(true)
    if (adminuid) {
      const {
        data: { adminValid },
      } = await axios.post("/api/verify-admin-key", {
        adminuid,
      })
      setIsValid(adminValid)
      setLoading(false)
    }
  }, [adminuid])

  useEffect(() => {
    fetchValidId()
  }, [fetchValidId])
  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  return (
    <div className="flex h-[100vh] w-[100vw] items-center justify-center">
      <div className="w-[650px] rounded border border-gray-200 p-6 text-center dark:border-gray-800">
        {loading ? (
          <>
            <div role="status" className="w-full animate-pulse space-y-3">
              <div className="mb-4 h-10 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-2 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-8 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              <span className="sr-only">Loading...</span>
            </div>
          </>
        ) : (
          <>
            {isValid ? (
              <>
                <p className="text-4xl font-semibold">Allow Access to 3OC</p>
                <p>
                  Do you give me permission to 3OC to access the following data
                  from cubid ?
                </p>
                {allStamps.map((item: string) => (
                  <div className="mt-3 space-y-2" key={item}>
                    <div className="rounded border p-2">
                      {capitalizeFirstLetter(item)}
                    </div>
                  </div>
                ))}
                <div className="mt-4 flex justify-end space-x-2">
                  <button className="w-[180px] rounded bg-red-500 p-2 text-xs text-white">
                    Cancel
                  </button>
                  <button className="w-[180px] rounded bg-blue-500 p-2 text-xs text-white">
                    Allow
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Invalid Admin UID</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AllowPage
