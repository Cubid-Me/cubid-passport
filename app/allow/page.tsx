"use client"

// @types-nocheck
import React, { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, Transition } from "@headlessui/react"
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { createWeb3Modal } from "@web3modal/wagmi/react"
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config"
import axios from "axios"
import { Sheet } from "lucide-react"
import { useTheme } from "next-themes"
import { WagmiConfig } from "wagmi"
import { arbitrum, mainnet } from "wagmi/chains"

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { stampsWithId } from "@/components/stamps"

import { Stamps } from "./stamps"
import { OptionalInfo } from "./steps/optional_info"
import { RequiredInfo } from "./steps/required_info"
import { Score } from "./steps/score"

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
  const [userUidData, setUserUidData] = useState<any>({})
  const [stampToAdd, setStampToAdd] = useState("")
  const [stampsList, setStampsList] = useState([])

  const uuid = searchParams.get("uid")
  const page_id = searchParams.get("page_id")
  const colormode = searchParams.get("colormode")
  const { setTheme } = useTheme()

  useEffect(() => {
    if (uuid) {
      localStorage.setItem("allow-uuid", uuid)
    }
    if (colormode) {
      setTheme(colormode)
    }
  }, [uuid, setTheme, colormode])

  const fetchAllStamps = useCallback(async (userId: any) => {
    const {
      data: { data },
    } = await axios.post("/api/supabase/select", {
      table: "stamps",
      match: {
        created_by_user_id: userId,
      },
    })
    setStampsList(data)
  }, [])

  const fetchUserUidData = useCallback(async () => {
    setLoading(true)
    const { data } = await axios.post("/api/allow/fetch_allow_uid", {
      uid: uuid,
      page_id,
    })
    setUserUidData(data)
    await fetchAllStamps(data?.dapp_users?.[0]?.users?.id)
    setIsValid(true)
    setLoading(false)
  }, [uuid, page_id, fetchAllStamps])

  useEffect(() => {
    fetchUserUidData()
  }, [fetchUserUidData])

  const fetchStamps = useCallback(async () => {}, [])

  const { push } = useRouter()

  useEffect(() => {
    fetchStamps()
  }, [fetchStamps])

  useEffect(() => {
    setTimeout(() => {
      if (localStorage.getItem("allow_url")) {
        if (
          window.location.href === `${window.location.origin}/allow` ||
          window.location.href === `${window.location.origin}/allow#`
        ) {
          push(`/allow?${localStorage.getItem("allow_url")}`)
          localStorage.removeItem("allow_url")
        }
      }
    }, 2000)
  }, [push])

  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  const [wagmiConfig, setWagmiConfig] = useState(
    defaultWagmiConfig({
      chains: [mainnet, arbitrum],
      projectId: "6833ed2c1539b9d27e8840c51f53bd0c",
      metadata: {
        name: "Web3Modal",
        description: "Web3Modal Example",
        url: "https://web3modal.com",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
      },
    })
  )
  useEffect(() => {
    // 1. Get projectId
    const projectId = "6833ed2c1539b9d27e8840c51f53bd0c"

    // 2. Create wagmiConfig
    const metadata = {
      name: "Web3Modal",
      description: "Web3Modal Example",
      url: "https://web3modal.com",
      icons: ["https://avatars.githubusercontent.com/u/37784886"],
    }

    const chains = [mainnet]
    const wConfig = defaultWagmiConfig({
      chains: chains as any,
      projectId,
      metadata,
    })
    setWagmiConfig(wConfig as any)
    createWeb3Modal({
      wagmiConfig: wConfig,
      projectId,
      enableAnalytics: true, // Optional - defaults to your Cloud configuration
      enableOnramp: true, // Optional - false as default })
    })
  }, [])

  const [steps, setSteps] = useState(1)

  const requiredStamps = userUidData?.stampsToSend?.filter(
    (item: any) => item.is_infosharing_required
  )
  const allStampIds = stampsList?.map((item: any) => item.stamptype)

  const isAllIncluded = requiredStamps?.filter((item: any) =>
    allStampIds?.includes(item?.stamptypes?.id)
  )

  const buttonDisabled = requiredStamps?.length !== isAllIncluded?.length

  return (
    <WagmiConfig config={wagmiConfig as any}>
      {loading ? (
        <>
          <div className="flex h-[100vh] w-[100vw] dark:bg-gray-900 items-center justify-center">
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
        <div className="dark:bg-gray-700 min-h-[100vh] dark:text-white">
          {isValid ? (
            <div className="px-4 pt-4">
              <p className="dark:text-white">
                Cubid Identity for{" "}
                {userUidData?.dapp_users?.[0]?.dapps?.appname}
              </p>
              {steps === 0 && (
                <Score
                  stampToAdd={stampToAdd}
                  stampsList={stampsList}
                  setStampToAdd={setStampToAdd}
                  setSteps={setSteps}
                  stampScores={userUidData?.stampScores}
                  stamps={userUidData?.stampsToSend}
                />
              )}
              {steps === 1 && (
                <>
                  <RequiredInfo
                    stampToAdd={stampToAdd}
                    stampsList={stampsList}
                    setStampToAdd={setStampToAdd}
                    stamps={userUidData?.stampsToSend}
                  />
                  <OptionalInfo
                    stampToAdd={stampToAdd}
                    stampsList={stampsList}
                    setStampToAdd={setStampToAdd}
                    stamps={userUidData?.stampsToSend}
                  />
                  <div className="mt-2 flex items-center justify-center space-x-2">
                    {/* <button
                      onClick={() => {
                        setSteps(0)
                      }}
                      className="w-[100px] rounded-lg border bg-gray-100 px-5 py-2 text-sm text-black "
                    >
                      Previous
                    </button> */}
                    {buttonDisabled ? (
                      <>
                        <button
                          className={`w-[100px] rounded-lg border bg-blue-500 px-5 py-2 text-sm text-white ${
                            buttonDisabled ? "opacity-70" : ""
                          }`}
                          disabled={buttonDisabled}
                        >
                          Submit
                        </button>
                      </>
                    ) : (
                      <>
                        {console.log({ userUidData })}
                        <a
                          href={`${userUidData?.dapp_users?.[0]?.dapps?.redirect_url}?status=success`}
                          onClick={() => {
                            localStorage.clear()
                          }}
                          className={`w-[100px] rounded-lg border bg-blue-500 px-5 py-2 text-sm text-white ${
                            buttonDisabled ? "opacity-70" : ""
                          }`}
                        >
                          Submit
                        </a>
                      </>
                    )}
                  </div>
                </>
              )}

              <Transition.Root show={Boolean(stampToAdd)} as={React.Fragment}>
                <Dialog
                  as="div"
                  className="relative z-50"
                  onClose={() => {
                    setStampToAdd("")
                  }}
                >
                  <Transition.Child
                    as={React.Fragment}
                    enter="ease-in-out duration-500"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-500"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                  </Transition.Child>

                  <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                        <Transition.Child
                          as={React.Fragment}
                          enter="transform transition ease-in-out duration-500 sm:duration-700"
                          enterFrom="translate-x-full"
                          enterTo="translate-x-0"
                          leave="transform transition ease-in-out duration-500 sm:duration-700"
                          leaveFrom="translate-x-0"
                          leaveTo="translate-x-full"
                        >
                          <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                            <div className="flex h-full flex-col overflow-y-scroll rounded-l-2xl bg-white py-6 shadow-xl">
                              <div className="px-4 sm:px-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex h-7 items-center">
                                    <button
                                      type="button"
                                      className="relative flex items-center gap-2 rounded-md bg-white text-gray-400 hover:text-gray-500"
                                      onClick={() => setStampToAdd("")}
                                    >
                                      <span className="sr-only">Close</span>
                                      <XMarkIcon
                                        className="text-secondary-90 size-5"
                                        aria-hidden="true"
                                      />
                                      <span className="font-bold text-gray-900">
                                        Close
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="relative mt-6 flex-1 px-4 sm:px-6">
                                {Boolean(stampToAdd) && (
                                  <Stamps
                                    supabaseUser={
                                      userUidData?.dapp_users?.[0].users
                                    }
                                    getUser={fetchUserUidData}
                                    onMainPanelClose={() => {
                                      setStampToAdd("")
                                      fetchUserUidData()
                                    }}
                                    stampToRender={stampToAdd}
                                  />
                                )}
                              </div>
                            </div>
                          </Dialog.Panel>
                        </Transition.Child>
                      </div>
                    </div>
                  </div>
                </Dialog>
              </Transition.Root>
              <div className="hidden">
                <Stamps
                  supabaseUser={userUidData?.dapp_users?.[0].users}
                  getUser={fetchUserUidData}
                  onMainPanelClose={() => {
                    setStampToAdd("")
                    fetchUserUidData()
                  }}
                  stampToRender={stampToAdd}
                />
              </div>
            </div>
          ) : (
            <>
              <p>Invalid Admin UID</p>
            </>
          )}
        </div>
      )}
    </WagmiConfig>
  )
}

export default AllowPage
