"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, Transition } from "@headlessui/react"
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react"
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
    })
    setUserUidData(data)
    await fetchAllStamps(data?.dapp_users?.[0]?.users?.id)
    setIsValid(true)
    setLoading(false)
  }, [uuid, fetchAllStamps])

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
      projectId: "046f59ead3e8ec7acd1db6ba73cd23b7",
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
    const projectId = "046f59ead3e8ec7acd1db6ba73cd23b7"

    // 2. Create wagmiConfig
    const metadata = {
      name: "Web3Modal",
      description: "Web3Modal Example",
      url: "https://web3modal.com",
      icons: ["https://avatars.githubusercontent.com/u/37784886"],
    }

    const chains = [mainnet, arbitrum]
    const wConfig = defaultWagmiConfig({ chains, projectId, metadata })
    setWagmiConfig(wConfig as any)
    createWeb3Modal({ wagmiConfig: wConfig, projectId, chains })
  }, [])

  const { setTheme } = useTheme()

  useEffect(() => {
    setTheme("light")
  }, [setTheme])

  const [steps, setSteps] = useState(0)

  return (
    <WagmiConfig config={wagmiConfig as any}>
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
            <div className="px-4">
              <p>
                Cubid Identity for{" "}
                {userUidData?.dapp_users?.[0]?.dapps?.appname}
              </p>
              {steps === 0 && (
                <Score
                  stampToAdd={stampToAdd}
                  stampsList={stampsList}
                  setStampToAdd={setStampToAdd}
                  setSteps={setSteps}
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
                    <button
                      onClick={() => {
                        setSteps(0)
                      }}
                      className="w-[100px] text-sm rounded-lg border bg-gray-100 px-5 py-2 text-black "
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        console.log("submitted")
                      }}
                      className="w-[100px] text-sm rounded-lg border bg-blue-500 px-5 py-2 text-white "
                    >
                      Submit
                    </button>
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
                            <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl rounded-l-2xl">
                              <div className="px-4 sm:px-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex h-7 items-center">
                                    <button
                                      type="button"
                                      className="flex gap-2 items-center relative rounded-md bg-white text-gray-400 hover:text-gray-500"
                                      onClick={() => setStampToAdd("")}
                                    >
                                      <span className="sr-only">Close</span>
                                      <XMarkIcon
                                        className="h-5 w-5 text-secondary-90"
                                        aria-hidden="true"
                                      />
                                      <span className="text-gray-900 font-bold">
                                        Close
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="relative mt-6 flex-1 px-4 sm:px-6">
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
                              </div>
                            </div>
                          </Dialog.Panel>
                        </Transition.Child>
                      </div>
                    </div>
                  </div>
                </Dialog>
              </Transition.Root>
            </div>
          ) : (
            <>
              <p>Invalid Admin UID</p>
            </>
          )}
        </>
      )}
    </WagmiConfig>
  )
}

export default AllowPage
