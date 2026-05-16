"use client"

// @types-nocheck
import React, { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, Transition } from "@headlessui/react"
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { createWeb3Modal } from "@web3modal/wagmi/react"
import axios from "axios"
import { Sheet } from "lucide-react"
import { useTheme } from "next-themes"
import { WagmiConfig } from "wagmi"
import { config as passportWagmiConfig } from "../../config/web3Config"
import { useSelectStampPerm } from '../../lib/insert_stamp_perm'
import { listPassportStampsByUser } from "@/lib/passportDataApi"
import { OidcConsentPanel } from "@/features/allow/OidcConsentPanel"
import {
  persistLegacyAllowParams,
  restoreLegacyAllowUrlIfNeeded,
} from "@/features/allow/legacyAllowState"

import { Stamps } from "./stamps"
import { OptionalInfo } from "./steps/optional_info"
import { RequiredInfo } from "./steps/required_info"
import { Score } from "./steps/score"

const AllowPage = () => {
  const searchParams: any = useSearchParams()
  const consentChallengeId = searchParams.get("consent_challenge")
  const isOidcConsentFlow = Boolean(consentChallengeId)
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userUidData, setUserUidData] = useState<any>({})
  const [stampToAdd, setStampToAdd] = useState("")
  const [stampsList, setStampsList] = useState<any[]>([])
  const [oidcConsentChallenge, setOidcConsentChallenge] = useState<any>(null)
  const [oidcSubmitting, setOidcSubmitting] = useState(false)
  const [notificationGrantCategories, setNotificationGrantCategories] = useState<string[]>([])
  const [availableNotificationCategories, setAvailableNotificationCategories] = useState<string[]>([
    "SECURITY",
    "TRANSACTIONAL",
    "WORKFLOW",
  ])
  const [notificationGrantsLoading, setNotificationGrantsLoading] = useState(false)
  const [notificationGrantsSaving, setNotificationGrantsSaving] = useState(false)

  const uuid = searchParams.get("uid")
  const page_id = searchParams.get("page_id")
  const colormode = searchParams.get("colormode")
  const oidcOrigin = process.env.NEXT_PUBLIC_OIDC_ORIGIN ?? "http://localhost:4280"

  const { allDappStampPerms, loading: selectStampLoading, insertStampDappPerm,stampInsertLoading } = useSelectStampPerm(uuid)

  const { setTheme } = useTheme()

  useEffect(() => {
    if (isOidcConsentFlow) {
      return
    }

    persistLegacyAllowParams({
      colormode,
      pageId: page_id,
      setTheme,
      uuid,
    })
  }, [isOidcConsentFlow, uuid, setTheme, colormode, page_id])

  const fetchAllStamps = useCallback(async (userId: any) => {
    const data = await listPassportStampsByUser({
      userId,
    })
    setStampsList(data)
  }, [])

  const fetchNotificationGrants = useCallback(async () => {
    if (isOidcConsentFlow || !uuid || !page_id) {
      return
    }

    setNotificationGrantsLoading(true)
    try {
      const { data } = await axios.post("/api/notifications/grants/allow-page/list", {
        pageId: page_id,
        uid: uuid,
      })
      const grants = data?.data?.grants ?? []
      setAvailableNotificationCategories(
        data?.data?.availableCategories ?? [
          "SECURITY",
          "TRANSACTIONAL",
          "WORKFLOW",
        ]
      )
      setNotificationGrantCategories(
        grants
          .filter((grant: any) => grant.status === "active")
          .map((grant: any) => grant.categoryKey)
      )
    } catch (error) {
      console.error(error)
    } finally {
      setNotificationGrantsLoading(false)
    }
  }, [isOidcConsentFlow, page_id, uuid])

  const toggleNotificationCategory = useCallback((categoryKey: string) => {
    setNotificationGrantCategories((current) =>
      current.includes(categoryKey)
        ? current.filter((entry) => entry !== categoryKey)
        : [...current, categoryKey]
    )
  }, [])

  const saveNotificationGrants = useCallback(async () => {
    if (!uuid || !page_id) {
      return
    }

    setNotificationGrantsSaving(true)
    try {
      await axios.post("/api/notifications/grants/allow-page/update", {
        categories: notificationGrantCategories,
        pageId: page_id,
        uid: uuid,
      })
      await fetchNotificationGrants()
    } catch (error) {
      console.error(error)
    } finally {
      setNotificationGrantsSaving(false)
    }
  }, [fetchNotificationGrants, notificationGrantCategories, page_id, uuid])

  const fetchUserUidData = useCallback(async () => {
    if (isOidcConsentFlow) {
      return
    }

    const { data } = await axios.post("/api/allow/fetch_allow_uid", {
      uid: uuid,
      page_id,
    })
    setUserUidData(data)
    await fetchAllStamps(data?.dapp_users?.[0]?.users?.id)
    await fetchNotificationGrants()
    setIsValid(true)
    setLoading(false)
  }, [
    fetchAllStamps,
    fetchNotificationGrants,
    isOidcConsentFlow,
    page_id,
    uuid,
  ])

  const fetchOidcConsentChallenge = useCallback(async () => {
    if (!consentChallengeId) {
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.get(`${oidcOrigin}/interaction/consent/${consentChallengeId}`)
      setOidcConsentChallenge(data)
      setIsValid(true)
    } finally {
      setLoading(false)
    }
  }, [consentChallengeId, oidcOrigin])

  useEffect(() => {
    if (isOidcConsentFlow) {
      fetchOidcConsentChallenge()
      return
    }

    fetchUserUidData()
  }, [fetchOidcConsentChallenge, fetchUserUidData, isOidcConsentFlow])

  const fetchStamps = useCallback(async () => { }, [])

  const { push } = useRouter()

  useEffect(() => {
    if (isOidcConsentFlow) {
      return
    }

    fetchStamps()
  }, [fetchStamps, isOidcConsentFlow])

  useEffect(() => {
    if (isOidcConsentFlow) {
      return
    }

    setTimeout(() => {
      const redirectTo = restoreLegacyAllowUrlIfNeeded(
        window.location.href,
        window.location.origin
      )
      if (redirectTo) {
        push(redirectTo)
      }
    }, 2000)
  }, [isOidcConsentFlow, push])

  const finalizeOidcConsent = useCallback(async (action: "approve" | "reject") => {
    if (!consentChallengeId) {
      return
    }

    setOidcSubmitting(true)
    try {
      const { data } = await axios.post(`${oidcOrigin}/interaction/consent/${consentChallengeId}/${action}`)
      const redirectTo = data?.redirect_to

      if (!redirectTo) {
        throw new Error("OIDC consent completion did not return a redirect target")
      }

      window.location.href = redirectTo
    } catch (error) {
      console.error(error)
      setOidcSubmitting(false)
    }
  }, [consentChallengeId, oidcOrigin])

  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""

  useEffect(() => {
    if (!walletConnectProjectId) {
      return
    }

    createWeb3Modal({
      wagmiConfig: passportWagmiConfig as any,
      projectId: walletConnectProjectId,
      enableAnalytics: true,
      enableOnramp: true,
    })
  }, [walletConnectProjectId])

  const [steps, setSteps] = useState(1)

  const requiredStamps = userUidData?.stampsToSend?.filter(
    (item: any) => item.is_infosharing_required
  )
  const allStampIds = stampsList?.map((item: any) => item.stamptype)

  const isAllIncluded = requiredStamps?.filter((item: any) =>
    allStampIds?.includes(item?.stamptypes?.id)
  )

  const buttonDisabled = requiredStamps?.length !== isAllIncluded?.length

  if (isOidcConsentFlow) {
    return (
      <OidcConsentPanel
        challenge={oidcConsentChallenge}
        loading={loading}
        onFinalize={finalizeOidcConsent}
        submitting={oidcSubmitting}
      />
    )
  }

  if (!loading && !Boolean(userUidData?.dapp_users?.[0]?.users?.id)) {
    return (
      <div className="flex h-[100vh] w-[100vw] items-center justify-center p-5 dark:bg-gray-900 dark:text-white">
        <p>Invalid UID provided in URL</p>
      </div>)
  }

  return (
    <WagmiConfig config={passportWagmiConfig as any}>

      {loading || selectStampLoading ? (
        <>
          <div className="flex h-[100vh] w-[100vw] items-center justify-center dark:bg-gray-900">
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
        <div className="min-h-[100vh] dark:bg-gray-700 dark:text-white">
          {isValid ? (
            <div className="px-4 pt-4">
              <p className="dark:text-white">
                Cubid Identity for{" "}
                {userUidData?.stampsToSend?.[0]?.dapps?.appname}
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
                    allDappStampPerms={allDappStampPerms}
                    insertStampDappPerm={insertStampDappPerm}
                    selectStampLoading={stampInsertLoading}
                    setStampToAdd={setStampToAdd}
                    stamps={userUidData?.stampsToSend}
                  />
                  <OptionalInfo
                    stampToAdd={stampToAdd}
                    stampsList={stampsList}
                    allDappStampPerms={allDappStampPerms}
                    insertStampDappPerm={insertStampDappPerm}
                    selectStampLoading={stampInsertLoading}
                    setStampToAdd={setStampToAdd}
                    stamps={userUidData?.stampsToSend}
                  />
                  <div className="mx-auto mt-4 max-w-3xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">
                          App notification permissions
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          Choose which notification categories this app may ask
                          Cubid to route. The app never receives your email,
                          Telegram id, or encrypted channel details.
                        </p>
                      </div>
                      <button
                        className="rounded-lg border bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-60"
                        disabled={notificationGrantsLoading || notificationGrantsSaving}
                        onClick={saveNotificationGrants}
                        type="button"
                      >
                        {notificationGrantsSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {availableNotificationCategories.map((categoryKey) => (
                        <label
                          key={categoryKey}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
                        >
                          <input
                            checked={notificationGrantCategories.includes(
                              categoryKey
                            )}
                            className="mt-1"
                            onChange={() =>
                              toggleNotificationCategory(categoryKey)
                            }
                            type="checkbox"
                          />
                          <span>
                            <span className="block font-semibold">
                              {categoryKey}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {categoryKey === "SECURITY"
                                ? "Account and identity alerts only."
                                : categoryKey === "TRANSACTIONAL"
                                  ? "Receipts, payments, and status updates."
                                  : "Workflow reminders and collaboration updates."}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Saving these permissions does not guarantee delivery. Cubid
                      still checks app policy, user preferences, verified
                      channels, and rate limits.
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-center space-x-2">
                    {buttonDisabled ? (
                      <>
                        <button
                          className={`w-[100px] rounded-lg border bg-blue-500 px-5 py-2 text-sm text-white ${buttonDisabled ? "opacity-70" : ""
                            }`}
                          disabled={buttonDisabled}
                        >
                          Submit
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          href={`${userUidData?.page_data?.redirect_url}?status=success`}
                          onClick={() => {
                            localStorage.clear()
                          }}
                          className={`w-[100px] rounded-lg border bg-blue-500 px-5 py-2 text-sm text-white ${buttonDisabled ? "opacity-70" : ""
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
                    <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
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
                                    isOpen={Boolean(stampToAdd)}
                                    refreshUser={fetchUserUidData}
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
                  refreshUser={fetchUserUidData}
                  onMainPanelClose={() => {
                    setStampToAdd("")
                    fetchUserUidData()
                  }}
                  isOpen={Boolean(stampToAdd)}
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
