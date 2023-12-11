"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"

import useAuth from "@/hooks/useAuth"
import { Authenticated } from "@/components/auth/authenticated"
import { stampsWithId } from "@/components/stamps"
import { Stamps } from "@/components/stamps/stampFlow"

const dataToTransform = (stampToShare: string[], userState: []) => {
  const dataToShare: any = {}
  stampToShare.map((item: any) => {
    const stamp_id = (stampsWithId as any)[item]
    const stamp_object: any = userState?.filter(
      (item: any) => item.stamptype == stamp_id
    )?.[0]
    if (stamp_object) {
      dataToShare[item] = stamp_object?.uniquevalue
    }
  })
  return dataToShare
}

const AllowPage = () => {
  const searchParams: any = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userState, setUserState] = useState([])
  const [adminAppData, setAdminAppData] = useState<any>({})
  const { user, supabaseUser, getUser } = useAuth({
    appId: adminAppData?.app_id,
  })
  const email = user?.email
  const adminuid = searchParams.get("adminuid")
  const stamps = searchParams.get("stamps")
  const allStamps = stamps?.split(",")
  const urltoreturn = searchParams.get("href")

  const fetchStamps = useCallback(async () => {
    const user = await getUser()
    if (user) {
      const {
        data: { data: userData },
      } = await axios.post("/api/supabase/select", {
        match: { created_by_user_id: user?.id },
        table: "stamps",
      })
      setUserState(userData ?? [])
    }
  }, [getUser])

  const fetchValidId = useCallback(async () => {
    setLoading(true)
    if (adminuid) {
      const {
        data: { adminValid, app_id },
      } = await axios.post("/api/verify-admin-key", {
        adminuid,
      })
      setAdminAppData({ app_id })
      setIsValid(adminValid)
      setLoading(false)
    }
  }, [adminuid])

  useEffect(() => {
    fetchValidId()
    fetchStamps()
  }, [fetchValidId, fetchStamps])

  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  const requiredStamps = allStamps.filter(
    (item: string) => !item.includes("optional")
  )
  const requiredDataAvailable =
    [
      ...requiredStamps.filter((item: any) => {
        const stamp_id = (stampsWithId as any)?.[item]
        const stamp_valid = userState.filter(
          (item: any) => item.stamptype === stamp_id
        )?.[0]
        return Boolean(stamp_valid)
      }),
    ].length === requiredStamps.length

  // useEffect(() => {
  //   if (requiredDataAvailable && !email) {
  //     const jsonString = JSON.stringify(
  //       dataToTransform(
  //         allStamps.map((item: string) =>
  //           item.replace("_optional", "")
  //         ),
  //         userState as any
  //       )
  //     )
  //     const base64Encoded = btoa(jsonString)
  //     window.location.href = `${urltoreturn}?data=${base64Encoded}`
  //   }
  // }, [requiredDataAvailable, email, allStamps, userState, urltoreturn])
  console.log(email)
  return (
    <>
      {loading ? (
        <>
          <div className="flex h-[100vh] w-[100vw] items-center justify-center">
            <div className="w-[650px] rounded border border-gray-200 p-6 text-center dark:border-gray-800">
              <div role="status" className="w-full animate-pulse space-y-3">
                <div className="mb-4 h-10 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-2 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-8 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {isValid ? (
            <>
              {requiredDataAvailable && email ? (
                <>
                  <div className="flex h-[100vh] w-[100vw] items-center justify-center">
                    <div className="w-[650px] rounded border border-gray-200 p-6 text-center dark:border-gray-800">
                      <p className="text-4xl font-semibold">
                        Allow Access to 3OC
                      </p>
                      <p>
                        Do you give me permission to 3OC to access the following
                        data from cubid ?
                      </p>
                      {allStamps.map((item: string) => (
                        <div className="mt-3 space-y-2" key={item}>
                          <div className="rounded border p-2">
                            {capitalizeFirstLetter(item?.split("_")[0])}
                          </div>
                        </div>
                      ))}
                      <div className="mt-4 flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            window.location.href = urltoreturn
                          }}
                          className="w-[180px] rounded bg-red-500 p-2 text-xs text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            const jsonString = JSON.stringify(
                              dataToTransform(
                                allStamps.map((item: string) =>
                                  item.replace("_optional", "")
                                ),
                                userState as any
                              )
                            )
                            const base64Encoded = btoa(jsonString)
                            window.location.href = `${urltoreturn}?data=${base64Encoded}`
                          }}
                          className="w-[180px] rounded bg-blue-500 p-2 text-xs text-white"
                        >
                          Allow
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <Stamps
                  stampsToAdd={allStamps.map((item: string) =>
                    item.replace("_optional", "")
                  )}
                  urltoreturn={urltoreturn}
                  requiredDataAvailable={requiredDataAvailable}
                  appId={adminAppData?.app_id as any}
                  fetchAllStamps={fetchStamps}
                  userState={userState}
                  fetchUserData={fetchStamps}
                />
              )}
            </>
          ) : (
            <>
              <p>Invalid Admin UID</p>
            </>
          )}
        </>
      )}
    </>
  )
}

export default AllowPage
