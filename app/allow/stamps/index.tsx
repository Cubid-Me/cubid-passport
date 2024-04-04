/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import axios from "axios"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import { useAccount, useDisconnect } from "wagmi"
import Web3 from "web3"

import { useStamps } from "../../../hooks/useStamps"
import "@near-wallet-selector/modal-ui/styles.css"
import { useSearchParams } from "next/navigation"

import { insertStampPerm } from "@/lib/insert_stamp_perm"
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { wallet } from "@/app/layout"

import { encode_data } from "../../../lib/encode_data"
import { supabase } from "../../../lib/supabase"
import { BrightIdConnectSheet } from "./brightIdConnectSheet"
import { GooddollarConnect } from "./gooddollarConnect"
import { InstagramConnect } from "./instagramConnect"
import { PhoneNumberConnect } from "./phoneNumberConnect"

const socialDataToMap = [
  {
    local_key: "facebook_data",
    supabase_key: "facebook",
    stampTypeId: 1,
    title: "Facebook",
    image:
      "https://play-lh.googleusercontent.com/ccWDU4A7fX1R24v-vvT480ySh26AYp97g1VrIB_FIdjRcuQB2JP2WdY7h_wVVAeSpg",
    color: "info",
  },
  {
    local_key: "github_data",
    supabase_key: "github",
    stampTypeId: 2,
    image:
      "https://play-lh.googleusercontent.com/PCpXdqvUWfCW1mXhH1Y_98yBpgsWxuTSTofy3NGMo9yBTATDyzVkqU580bfSln50bFU",
    title: "Github",
    color: "secondary",
  },
  {
    local_key: "google_data",
    supabase_key: "google",
    stampTypeId: 3,
    image:
      "https://play-lh.googleusercontent.com/aFWiT2lTa9CYBpyPjfgfNHd0r5puwKRGj2rHpdPTNrz2N9LXgN_MbLjePd1OTc0E8Rl1=w240-h480-rw",
    title: "Google",
    color: "primary",
  },
  {
    local_key: "twitter_data",
    supabase_key: "twitter",
    stampTypeId: 4,
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAh1BMVEUAAAD+/v7////BwcHp6en4+Pji4uLOzs7s7Oz7+/v19fXy8vLc3NzV1dWrq6unp6e4uLjHx8eFhYWQkJAzMzNhYWEsLCxCQkJvb2+hoaEaGhpnZ2e8vLwQEBA9PT2ZmZl6enohISFXV1dOTk6IiIhzc3MXFxeTk5M5OTlJSUkmJiYuLi4eHh4s0tXWAAAHNElEQVR4nO2daXfjLAyFa7KnTZO0Tfe0abpMt///+953FiSNZWzZEANz9HyZOXWLIcboXhDk6EhRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRvLhZDxpZ3wW62QZutj4PVGQzV0bALMy9LmZQ4jRMiSJ+mKIRMwlyq2N7KzP6DlKgkBNJE3chb2TMR4Di5HwWzU005tb7Pmu4jbkOUO02nEke4sL3LktsYH+jjGUiaaJntfBjNKdhat2GtxnengEXvnxuscE7hBm1WvIK7WCxEF5SM/a4wQV+UsNgtW7FwLh60Dl++Dedi99inJj7D1ndmNsmsmFugf30qmvpYyzjwa+e3bHviRltS1duZ94djMSJUPqvAyvbRDYQvPqOgqdYwIt3PT2wr4o5K18ZYA33HQp+iRonCPs/w11FWJhDPz1uX+4Gh9EocYJgRQcPC3us5H3bUh9MkHAThqFt4mP5ymnnoWKLz39eHsP65wH66XP5Eg73La0iiRPvoerpwaN9iMyfkr62blPiBBu4CVdPD6yDM6vyFfTJbaxiKnEC+bKPir9uRNq8SYsjim8ZtqLdsbGLv25PKMGlVvGuY9c+LBOJtJFZxSts4Enwenbn1j4q/roNsJ9eCkrajjBOhK+nB/ZRVTTjuFXsHuIHcnGAenpgjQDvWsSnM03AIHGii5g9KCOJtGmyiiv8Vabko3MH/ZTNamLPa7CKKcYJwkoibWqN0DU2cHC4enpw7JQ2j1j1mrfrI804QdhDBZmYRGnjtopPI8EvRWYpkTbsAVvwbZ1JAmccpraJTG7tGq3iIuE4gVxBLXflSzBxZkaVf3rfyYX0D1hF81S+hK69Sk+Tsaj7DHIvjCXS5pX92WvqcQJBq+iWNmZWnnp5xgYmGicIYBW5QsPBsmQVn3B+vM+F+q7YMZErNOL8/p6cmOYQJxC0ikyhkeGEtoTECTZblyQ7t7Q5qZJlucQJAlhFZtI/sZ/+sD/LJ04QRs3SBgYiEidaT/3H404ibX4PRM/GNcCmzT2EDLY4jdLmp8f9KrKKEwRY/WYPZoP9dE/jxOgzRj27s+cjigWmYv53gdESugJwCv2U5RjgczvGUYZL1eSZ1kgbaBf8p3maMT0+3JNPGAHtrzh9f9LcCKRNjnGCMBZIm+p+nAuQlMZNLU3cNLNeE3+Dcu6WNhMy2mQXJwhgFQsmbXBuNB+5XcFbIZA2RQ6m1wlaCbb+i9Im/ZmZOtBKsOXOqVvYZcXMKW1QEnRPQE2Ba7e0QUmQbUD8BczC8NUIdBYpLofKAavIlswu0d/nMcfmAK2iW9rkZvBL4Gw+M4GYeZGnu7CAVSzKqW0kPSiNHMSOwPo8lzY4K5fswrYIjAssmfLe/ZZmBVhFnvGL0qbvvXdBeYd+ylLbYOmQb0rJinN3cMcuHHvXgR8Ld3DHrPVdhIoF49U9aIK0MUVm894UXP6tWGJ6+QesIkb2ykFzkr9VHJMGVqRioItMYv9IB0pborm0QRcZf5NTF1Z/N7B+1ibHqTeykdD+y3fyQW5qhlMaJPF34e6MsNqdn1W8ohsJazojnJ0Qecdoa0qJv1OJtEk4vbSC0gaRD7e0wYWcrKwiSej6beJRZ7N5C1TnGVlFskFk9+dH2BlZNvTEfSlVqo6OeHf7wS1Im1ysYnXiL2wrrdnJl4lVdG0Qwalu9yEFWVhFZ+LvNwyafEEKpE3BMuHTY+jUaGduaYMT5OnnZ9Ql/k4k0qb/U6HaUREnkO0MLjqlTXJbSEs0JP7WzNrUTDymRGPi70AibRJOdhMk/s7d+gXf4GSt4qVgg8hGIm2SXf0WbRBZSaRNolZRmPg7lUibJK0i2SBSm/iLSzIFm7WB7QwpWsUbbGDDWLiUSJv09mDsmuIEYeyOC6fuoTYy+zYbRB5qXlg4fKp6T200LtodtPfojirY+oTOqDmix5jIEn9P3NIGjfIueDW703qDCMmKckobY9LJkibHCEqzDnDpkL1v3+7021iQE3/ly4AL9/uG0iYRq0jiRIsUrtvC/b7BTk3R8UsHZ48NbNWriNFi7QBpk4JVvChaxQkCJkq7DylIwSp6nAw/l0ibaKfsWshJjq1t60YibWJbRb+T4VduaYOHpcS1ir4nw0/d7UBpEzNRulucIJBx2LmTL6ZVDHDi79ItbWAnXzyrGORk+KFb2uDOokhWkZ74Kz6hlEFOdNuVr4G0iWQVfeIEAa0iT1CEHRtRrGKwE3/HEmmz87pFJ8Kd+Ptl3NIGzoErel/9DnkyPFn0H5aBK32vfof9BpEFlub4whP/ntKShzBfRGLBZXE3xvSZKB38xN9dcwv7TZTG0a8I5G3Wkib2ZxUPcTL8SNJP+7KKJE6EO/H3TvIQe5rSuMGBLuQW13vJV/L1s1cx1pcT/aS7/FUURVEURVEURVEURVEURVEURVEURVEURVEURVEURVGUX/wH81ZLG4dA7EsAAAAASUVORK5CYII=",
    title: "Twitter",
    color: "error",
  },
  {
    local_key: "discord_data",
    supabase_key: "discord",
    stampTypeId: 5,
    image:
      "https://images-eds-ssl.xboxlive.com/image?url=Q_rwcVSTCIytJ0KOzcjWTYl.n38D8jlKWXJx7NRJmQKBAEDCgtTAQ0JS02UoaiwRCHTTX1RAopljdoYpOaNfVf5nBNvbwGfyR5n4DAs0DsOwxSO9puiT_GgKqinHT8HsW8VYeiiuU1IG3jY69EhnsQ--&format=source",
    title: "Discord",
    color: "error",
  },
]

export const stampsWithId = {
  facebook: 1,
  github: 2,
  google: 3,
  twitter: 4,
  discord: 5,
  poh: 6,
  iah: 7,
  brightid: 8,
  gitcoin: 9,
  instagram: 10,
  phone: 11,
  gooddollar: 12,
  "near-wallet": 15,
  fractal: 17,
  evm: 14,
}

export const Stamps = ({
  supabaseUser,
  getUser,
  stampToRender,
  onMainPanelClose,
}: any) => {
  const signInWithSocial = async (socialName: any) => {
    await supabase.auth.signOut()
    localStorage.setItem("socialName", socialName)
    const { data: d, error: e } = await supabase.auth.signInWithOAuth({
      provider: socialName,
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    })
  }
  const searchParams: any = useSearchParams()
  const uuid = searchParams.get("uid")

  const [brightIdData, setBrightIdData] = useState(null)
  const [brightIdSheetOpen, setBrightIdSheetOpen] = useState(false)
  const [userState, setUserState] = useState({})
  const [stampVerified, setStampVerified] = useState<any>(null)
  const [phonenumber, setPhonenumber] = useState<any>(false)
  const [gitcoinStamps, setGitcoinStamps] = useState(false)
  const [instagramShow, setInstagramShow] = useState(false)
  const [stampCategories, setStampCategories] = useState([])
  const [allStamps, setAllStamps] = useState([])
  const [stampLoading, setStampLoading] = useState(true)
  const email = supabaseUser?.email
  const { stampCollector, fetchNearAndGitcoinStamps, gitcoinScore } = useStamps(
    {}
  )

  const fetchStampData = useCallback(async () => {
    const {
      data: { data },
    } = await axios.post("/api/supabase/select", {
      table: "stamptypes",
    })
    setStampCategories(data)
    if (supabaseUser) {
      setStampLoading(true)
      const {
        data: { data: dbData },
      } = await axios.post(`/api/supabase/select`, {
        table: "stamps",
        match: {
          created_by_user_id: supabaseUser?.id,
        },
      })
      setAllStamps(dbData)
      setStampLoading(false)
    }
  }, [supabaseUser])

  useEffect(() => {
    fetchStampData()
  }, [fetchStampData])

  const fetchUserData = useCallback(async () => {
    if (email) {
      const {
        data: { data: userData },
      } = await axios.post("/api/supabase/select", {
        match: { email },
        table: "users",
      })
      setUserState(userData?.[0])
    }
  }, [email])

  const fetchBrightIdData = useCallback(async () => {
    if (email) {
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: { email },
        table: "brightid-data",
      })
      if (data?.[0]) {
        setBrightIdData(data[0])
      }
      return data?.[0]
    }
  }, [email])

  const [isPohVerified, setIsPohVerified] = useState<any>(null)
  const { disconnect } = useDisconnect()
  const { getIdForApp } = useCreatedByAppId()

  const connectToWeb3Node = useCallback(
    async (address: string) => {
      console.log({ address })
      if (address) {
        const {
          data: { stamps, scores },
        } = await axios.post("/api/gitcoin-passport-data", { address })
        const stampId = stampsWithId.gitcoin
        const dbUser = await getUser()
        const database = {
          uniquehash: await encode_data(address),
          stamptype: stampId,
          created_by_user_id: dbUser?.id,
          unencrypted_unique_data: JSON.stringify(scores),
          type_and_hash: `${stampId} ${await encode_data(address)}`,
        }
        const dataToSet = {
          created_by_user_id: dbUser?.id,
          created_by_app: await getIdForApp(),
          stamptype: stampId,
          uniquevalue: address,
          user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${address}`,
          unique_hash: await encode_data(address),
          stamp_json: { stamps, scores },
          type_and_uniquehash: `${stampId} ${await encode_data(address)}`,
        }
        await axios.post("/api/supabase/insert", {
          table: "uniquestamps",
          body: database,
        })
        const {
          data: { error, data },
        } = await axios.post("/api/supabase/insert", {
          table: "stamps",
          body: dataToSet,
        })
        insertStampPerm(data?.[0]?.id, uuid)
        if (data?.[0]?.id) {
          await axios.post("/api/supabase/insert", {
            table: "authorized_dapps",
            body: {
              dapp_id: 22,
              dapp_and_stamp_id: `22 ${data?.[0]?.id}`,
              stamp_id: data?.[0]?.id,
              can_read: true,
              can_update: true,
              can_delete: true,
            },
          })
        }
        const evm_stamp = {
          uniquehash: await encode_data(address),
          stamptype: stampsWithId.evm,
          created_by_user_id: dbUser?.id,
          unencrypted_unique_data: JSON.stringify(scores),
          type_and_hash: `${stampsWithId.evm} ${await encode_data(address)}`,
        }
        const dataToSet_stamp = {
          created_by_user_id: dbUser?.id,
          created_by_app: await getIdForApp(),
          stamptype: stampsWithId.evm,
          uniquevalue: address,
          user_id_and_uniqueval: `${dbUser?.id} ${stampsWithId.evm} ${address}`,
          unique_hash: await encode_data(address),
          stamp_json: { address },
          type_and_uniquehash: `${stampsWithId.evm} ${await encode_data(
            address
          )}`,
        }
        await axios.post("/api/supabase/insert", {
          table: "uniquestamps",
          body: evm_stamp,
        })
        const {
          data: { data: evmData },
        } = await axios.post("/api/supabase/insert", {
          table: "stamps",
          body: dataToSet_stamp,
        })
        insertStampPerm(evmData?.[0]?.id, uuid)
        if (evmData?.[0]?.id) {
          await axios.post("/api/supabase/insert", {
            table: "authorized_dapps",
            body: {
              dapp_id: 22,
              dapp_and_stamp_id: `22 ${evmData?.[0]?.id}`,
              stamp_id: evmData?.[0]?.id,
              can_read: true,
              can_update: true,
              can_delete: true,
            },
          })
        }
        disconnect()
        fetchUserData()
        fetchStampData()
        fetchNearAndGitcoinStamps()
      }
      if (userState && !(userState as any)?.poh_IsRegistered) {
        const infuraUrl =
          "https://mainnet.infura.io/v3/6f111f744ee54510a941cfee4716c3db"
        const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl))
        const contractAddress = "0xC5E9dDebb09Cd64DfaCab4011A0D5cEDaf7c9BDb"
        let methodAbi = {
          constant: true,
          inputs: [
            {
              internalType: "address",
              name: "_submissionID",
              type: "address",
            },
          ],
          name: "isRegistered",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          payable: false,
          stateMutability: "view",
          type: "function",
        }
        const contract: any = new web3.eth.Contract(
          [methodAbi],
          contractAddress
        )
        contract.methods
          .isRegistered(address)
          .call()
          .then(async (result: any) => {
            if (result) {
              await axios.post("/api/supabase/update", {
                match: { email },
                table: "users",
                body: {
                  poh_IsRegistered: true,
                },
              })
              fetchUserData()
              setIsPohVerified(true)
            } else {
              setIsPohVerified(false)
            }
            disconnect()
          })
          .catch((err: any) => {
            toast.error("An error occured")
          })
      }
      disconnect()
      fetchUserData()
      fetchStampData()
      fetchNearAndGitcoinStamps()
    },
    [
      userState,
      disconnect,
      fetchUserData,
      fetchStampData,
      fetchNearAndGitcoinStamps,
      getUser,
      getIdForApp,
      uuid,
      email,
    ]
  )
  const { address } = useAccount()
  console.log("here is address->", address)

  useEffect(() => {
    if (address) {
      connectToWeb3Node(address)
    }
  }, [connectToWeb3Node, address])

  useEffect(() => {
    if (email) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { user_metadata }: any = session?.user
          const providerKey = localStorage.getItem("socialName") ?? ""
          console.log(providerKey)
          const stampId = (stampsWithId as any)[providerKey]
          const dbUser = supabaseUser
          const database = {
            uniquehash: await encode_data(user_metadata?.email),
            stamptype: stampId,
            created_by_user_id: dbUser?.id,
            unencrypted_unique_data: JSON.stringify(user_metadata),
            type_and_hash: `${stampId} ${await encode_data(
              user_metadata?.email
            )}`,
          }
          const dataToSet = {
            created_by_user_id: dbUser?.id,
            created_by_app: await getIdForApp(),
            stamptype: stampId,
            uniquevalue: user_metadata?.email,
            user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${user_metadata?.email}`,
            unique_hash: await encode_data(user_metadata?.email),
            stamp_json: user_metadata,
            type_and_uniquehash: `${stampId} ${await encode_data(
              user_metadata?.email
            )}`,
          }
          await axios.post("/api/supabase/insert", {
            table: "uniquestamps",
            body: database,
          })
          const {
            data: { error, data },
          } = await axios.post("/api/supabase/insert", {
            table: "stamps",
            body: dataToSet,
          })
          await insertStampPerm(data?.[0]?.id, uuid)
          if (data?.[0]?.id) {
            await axios.post("/api/supabase/insert", {
              table: "authorized_dapps",
              body: {
                dapp_id: 22,
                dapp_and_stamp_id: `22 ${data?.[0]?.id}`,
                stamp_id: data?.[0]?.id,
                can_read: true,
                can_update: true,
                can_delete: true,
              },
            })
            supabase.auth.signOut().finally(() => {
              window.location.reload()
            })
          }
          fetchStampData()
          supabase.auth.signOut()
        }
      })
    }
  }, [
    email,
    fetchStampData,
    getUser,
    supabaseUser,
    userState,
    getIdForApp,
    disconnect,
    uuid,
  ])

  useEffect(() => {
    fetchBrightIdData()
  }, [fetchBrightIdData])

  const fetchNearWallet = useCallback(async () => {
    if (email && (wallet as any)?.accountId) {
      const dataCategory = await wallet.viewMethod({
        contractId: "registry.i-am-human.near",
        method: "sbt_tokens_by_owner",
        args: {
          account: `${(wallet as any).accountId}`,
          issuer: "fractal.i-am-human.near",
        },
      })
      const dbUser = supabaseUser
      if (dbUser?.id) {
        const stampId = (stampsWithId as any)["near-wallet"]
        const stamp2Id = (stampsWithId as any)["iah"]

        const dbUser = await getUser()
        const database = {
          uniquehash: await encode_data((wallet as any).accountId),
          stamptype: stampId,
          created_by_user_id: dbUser?.id,
          unencrypted_unique_data: (wallet as any).accountId,
          type_and_hash: `${stampId} ${await encode_data(
            (wallet as any).accountId
          )}`,
        }
        const database_iah = {
          uniquehash: await encode_data((wallet as any).accountId),
          stamptype: stamp2Id,
          created_by_user_id: dbUser?.id,
          unencrypted_unique_data: (wallet as any).accountId,
          type_and_hash: `${stamp2Id} ${await encode_data(
            (wallet as any).accountId
          )}`,
        }
        const dataToSet = {
          created_by_user_id: dbUser?.id,
          created_by_app: await getIdForApp(),
          stamptype: stampId,
          uniquevalue: (wallet as any).accountId,
          user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${
            (wallet as any).accountId
          }`,
          unique_hash: await encode_data((wallet as any).accountId),
          stamp_json: { account: (wallet as any).accountId },
          type_and_uniquehash: `${stampId} ${await encode_data(
            (wallet as any).accountId
          )}`,
        }
        const dataToSet_iah = {
          created_by_user_id: dbUser?.id,
          created_by_app: await getIdForApp(),
          stamptype: stamp2Id,
          uniquevalue: (wallet as any).accountId,
          user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${
            (wallet as any).accountId
          }`,
          unique_hash: await encode_data((wallet as any).accountId),
          stamp_json: { account: (wallet as any).accountId },
          type_and_uniquehash: `${stamp2Id} ${await encode_data(
            (wallet as any).accountId
          )}`,
        }
        const {
          data: { error: unique_data },
        } = await axios.post("/api/supabase/insert", {
          table: "uniquestamps",
          body: database,
        })
        const {
          data: { data },
        } = await axios.post("/api/supabase/insert", {
          table: "stamps",
          body: dataToSet,
        })
        insertStampPerm(data?.[0]?.id, uuid)

        if (dataCategory?.[0]?.[1]?.[0]) {
          const {
            data: { error: unique_data_iah },
          } = await axios.post("/api/supabase/insert", {
            table: "uniquestamps",
            body: database_iah,
          })

          const {
            data: { data: data_iah },
          } = await axios.post("/api/supabase/insert", {
            table: "stamps",
            body: dataToSet_iah,
          })
          insertStampPerm(data_iah?.[0]?.id, uuid)

          if (data_iah?.[0]?.id) {
            await axios.post("/api/supabase/insert", {
              table: "authorized_dapps",
              body: {
                dapp_id: 22,
                dapp_and_stamp_id: `22 ${data_iah?.[0]?.id}`,
                stamp_id: data_iah?.[0]?.id,
                can_read: true,
                can_update: true,
                can_delete: true,
              },
            })
          }
        }

        if (data?.[0]?.id) {
          await axios.post("/api/supabase/insert", {
            table: "authorized_dapps",
            body: {
              dapp_id: 22,
              dapp_and_stamp_id: `22 ${data?.[0]?.id}`,
              stamp_id: data?.[0]?.id,
              can_read: true,
              can_update: true,
              can_delete: true,
            },
          })
        }

        fetchUserData()
        fetchStampData()
        wallet.signOut()
      }
    }
  }, [
    email,
    getUser,
    getIdForApp,
    supabaseUser,
    uuid,
    fetchUserData,
    fetchStampData,
  ])

  useEffect(() => {
    fetchNearWallet()
  }, [fetchNearWallet])

  const deleteStamp = async (stamp_type: number) => {
    const { unique_hash, id } = allStamps.filter(
      (item: any) => item.stamptype === stamp_type
    )[0]
    await axios.post("/api/supabase/delete", {
      match: { dapp_id: 22, stamp_id: id },
      table: "authorized_dapps",
    })
    await axios.post("/api/supabase/delete", {
      match: { stamptype: stamp_type, created_by_user_id: supabaseUser?.id },
      table: "stamps",
    })
    await axios.post("/api/supabase/delete", {
      match: { uniquehash: unique_hash },
      table: "uniquestamps",
    })

    toast.success("Stamp removed successfully")
    fetchUserData()
    fetchStampData()
  }

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const { open } = useWeb3Modal()

  function camelCaseToWords(s: string) {
    const result = s?.replace(/([A-Z])/g, " $1")
    return result?.charAt?.(0)?.toUpperCase() + result?.slice(1)
  }

  const doesStampExist = (stamp_id: number | string) =>
    allStamps?.filter(({ stamptype }) => stamptype == stamp_id)?.[0]

  return (
    <div className="p-3 pb-16">
      <div className="flex mb-3 items-center justify-between">
        {stampLoading && (
          <button
            disabled
            type="button"
            className="me-2 inline-flex items-center rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            <svg
              aria-hidden="true"
              role="status"
              className="me-3 inline size-4 animate-spin text-white"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="#E5E7EB"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"
              />
            </svg>
            Loading your stamps
          </button>
        )}
      </div>
      <div
        className={`grid grid-cols-1 ${
          stampLoading && "pointer-events-none opacity-40"
        }`}
      >
        {[
          ...socialDataToMap.filter(
            (item) => item.supabase_key === stampToRender
          ),
        ].map((item) => (
          <Card style={{ height: "auto" }}>
            <CardHeader>
              <img
                src={item.image}
                alt="Image"
                className="mb-1 size-10 rounded-md"
              />
              <CardTitle>{item.title}</CardTitle>
              {doesStampExist(item.stampTypeId) ? (
                <CardDescription>
                  <div className="flex items-center space-x-1">
                    <p>Your {item.supabase_key} account is verified</p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="#00e64d"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </CardDescription>
              ) : (
                <CardDescription>
                  Connect your existing {item.supabase_key} to verify
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {doesStampExist(item.stampTypeId) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button variant="default">Verified Stamp</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5H13C13.5523 5 14 5.44772 14 6V9C14 9.55228 13.5523 10 13 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5ZM0 6C0 4.89543 0.895431 4 2 4H13C14.1046 4 15 4.89543 15 6V9C15 10.1046 14.1046 11 13 11H2C0.89543 11 0 10.1046 0 9V6ZM4.5 6.75C4.08579 6.75 3.75 7.08579 3.75 7.5C3.75 7.91421 4.08579 8.25 4.5 8.25C4.91421 8.25 5.25 7.91421 5.25 7.5C5.25 7.08579 4.91421 6.75 4.5 6.75ZM6.75 7.5C6.75 7.08579 7.08579 6.75 7.5 6.75C7.91421 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 7.91421 8.25 7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5ZM10.5 6.75C10.0858 6.75 9.75 7.08579 9.75 7.5C9.75 7.91421 10.0858 8.25 10.5 8.25C10.9142 8.25 11.25 7.91421 11.25 7.5C11.25 7.08579 10.9142 6.75 10.5 6.75Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setStampVerified({
                            ...(userState as any)?.[item.local_key],
                            ...item,
                          })
                        }}
                      >
                        View Stamp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          deleteStamp(item?.stampTypeId)
                        }}
                        style={{ color: "red" }}
                      >
                        Remove Stamp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    signInWithSocial(item.supabase_key)
                  }}
                  variant="outline"
                  className="bg-blue-500 text-white"
                >
                  Connect Account
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {stampToRender === "iah" && (
          <Card>
            <CardHeader>
              <img
                src={
                  "data:image/png;base64,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"
                }
                alt="Image"
                className="mb-1 size-10 rounded-md"
              />
              <CardTitle>I-Am-Human</CardTitle>
              {doesStampExist(stampsWithId["iah"]) ? (
                <CardDescription>
                  <div className="flex items-center space-x-1">
                    <p>Your NEAR account is verified</p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="#00e64d"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </CardDescription>
              ) : (
                <CardDescription>
                  Use a NEAR wallet to connect your IAH-verified account
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {doesStampExist(stampsWithId["near-wallet"]) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div className="flex items-center space-x-2">
                    <Button>Verified Stamp</Button>
                    <Button
                      onClick={() => {
                        wallet.signIn()
                      }}
                      variant="secondary"
                      className="bg-blue-500 text-white"
                      style={{ width: "200px" }}
                    >
                      Connect Wallet
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5H13C13.5523 5 14 5.44772 14 6V9C14 9.55228 13.5523 10 13 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5ZM0 6C0 4.89543 0.895431 4 2 4H13C14.1046 4 15 4.89543 15 6V9C15 10.1046 14.1046 11 13 11H2C0.89543 11 0 10.1046 0 9V6ZM4.5 6.75C4.08579 6.75 3.75 7.08579 3.75 7.5C3.75 7.91421 4.08579 8.25 4.5 8.25C4.91421 8.25 5.25 7.91421 5.25 7.5C5.25 7.08579 4.91421 6.75 4.5 6.75ZM6.75 7.5C6.75 7.08579 7.08579 6.75 7.5 6.75C7.91421 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 7.91421 8.25 7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5ZM10.5 6.75C10.0858 6.75 9.75 7.08579 9.75 7.5C9.75 7.91421 10.0858 8.25 10.5 8.25C10.9142 8.25 11.25 7.91421 11.25 7.5C11.25 7.08579 10.9142 6.75 10.5 6.75Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setStampVerified({
                            displayName: (userState as any)?.iah,
                            image:
                              "data:image/png;base64,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",
                          })
                        }}
                      >
                        View Stamp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          deleteStamp(stampsWithId["near-wallet"])
                          deleteStamp(stampsWithId["iah"])
                        }}
                        style={{ color: "red" }}
                      >
                        Remove Stamp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    wallet.signIn()
                  }}
                  variant="secondary"
                  className="bg-blue-500 text-white"
                  style={{ width: "200px" }}
                >
                  Connect Wallet
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {stampToRender === "brightId" && (
          <Card>
            <CardHeader>
              <img
                src={
                  "data:image/jpeg;base64,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"
                }
                alt="Image"
                className="mb-1 size-10 rounded-md"
              />
              <CardTitle>BrightID</CardTitle>
              {doesStampExist(stampsWithId.brightid) ? (
                <CardDescription>
                  <div className="flex items-center space-x-1">
                    <p>Your BrightID has been connected</p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="#00e64d"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </CardDescription>
              ) : (
                <CardDescription>Connect your BrightID wallet</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {doesStampExist(stampsWithId.brightid) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button>Verified Stamp</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5H13C13.5523 5 14 5.44772 14 6V9C14 9.55228 13.5523 10 13 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5ZM0 6C0 4.89543 0.895431 4 2 4H13C14.1046 4 15 4.89543 15 6V9C15 10.1046 14.1046 11 13 11H2C0.89543 11 0 10.1046 0 9V6ZM4.5 6.75C4.08579 6.75 3.75 7.08579 3.75 7.5C3.75 7.91421 4.08579 8.25 4.5 8.25C4.91421 8.25 5.25 7.91421 5.25 7.5C5.25 7.08579 4.91421 6.75 4.5 6.75ZM6.75 7.5C6.75 7.08579 7.08579 6.75 7.5 6.75C7.91421 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 7.91421 8.25 7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5ZM10.5 6.75C10.0858 6.75 9.75 7.08579 9.75 7.5C9.75 7.91421 10.0858 8.25 10.5 8.25C10.9142 8.25 11.25 7.91421 11.25 7.5C11.25 7.08579 10.9142 6.75 10.5 6.75Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setStampVerified({
                            displayName: (brightIdData as any).name,
                            image:
                              "data:image/jpeg;base64,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",
                            email: (brightIdData as any).email,
                            creationTime: (brightIdData as any).created_at,
                          })
                        }}
                      >
                        View Stamp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setBrightIdSheetOpen(true)
                  }}
                  variant="secondary"
                  className="bg-blue-500 text-white"
                  style={{ width: "200px" }}
                >
                  Connect App
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {stampToRender === "gitcoin" && (
          <Card>
            <CardHeader>
              <img
                src={"https://passport.gitcoin.co/assets/gitcoinLogoWhite.svg"}
                alt="Image"
                className="mb-1 size-10 rounded-md"
              />
              <CardTitle>Gitcoin Passport</CardTitle>
              <CardDescription>
                Connect to import your existing Gitcoin Passport
              </CardDescription>
            </CardHeader>
            <CardContent>
              {doesStampExist(stampsWithId.gitcoin) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button>Verified Stamp</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5H13C13.5523 5 14 5.44772 14 6V9C14 9.55228 13.5523 10 13 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5ZM0 6C0 4.89543 0.895431 4 2 4H13C14.1046 4 15 4.89543 15 6V9C15 10.1046 14.1046 11 13 11H2C0.89543 11 0 10.1046 0 9V6ZM4.5 6.75C4.08579 6.75 3.75 7.08579 3.75 7.5C3.75 7.91421 4.08579 8.25 4.5 8.25C4.91421 8.25 5.25 7.91421 5.25 7.5C5.25 7.08579 4.91421 6.75 4.5 6.75ZM6.75 7.5C6.75 7.08579 7.08579 6.75 7.5 6.75C7.91421 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 7.91421 8.25 7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5ZM10.5 6.75C10.0858 6.75 9.75 7.08579 9.75 7.5C9.75 7.91421 10.0858 8.25 10.5 8.25C10.9142 8.25 11.25 7.91421 11.25 7.5C11.25 7.08579 10.9142 6.75 10.5 6.75Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setGitcoinStamps(true)
                        }}
                      >
                        View Stamp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    open()
                  }}
                  variant="secondary"
                  className="bg-blue-500 text-white"
                  style={{ width: "200px" }}
                >
                  Connect Wallet
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {stampToRender === "instagram" && (
          <Card>
            <CardHeader>
              <img
                src={
                  "data:image/jpeg;base64,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"
                }
                alt="Image"
                className="mb-1 size-10 rounded-xl"
              />
              <CardTitle>Instagram</CardTitle>
              <CardDescription>
                {doesStampExist(stampsWithId.instagram)
                  ? "Instagram Connected"
                  : "Connect your existing Instagram account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {doesStampExist(stampsWithId.instagram) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button>Verified Stamp</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5H13C13.5523 5 14 5.44772 14 6V9C14 9.55228 13.5523 10 13 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5ZM0 6C0 4.89543 0.895431 4 2 4H13C14.1046 4 15 4.89543 15 6V9C15 10.1046 14.1046 11 13 11H2C0.89543 11 0 10.1046 0 9V6ZM4.5 6.75C4.08579 6.75 3.75 7.08579 3.75 7.5C3.75 7.91421 4.08579 8.25 4.5 8.25C4.91421 8.25 5.25 7.91421 5.25 7.5C5.25 7.08579 4.91421 6.75 4.5 6.75ZM6.75 7.5C6.75 7.08579 7.08579 6.75 7.5 6.75C7.91421 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 7.91421 8.25 7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5ZM10.5 6.75C10.0858 6.75 9.75 7.08579 9.75 7.5C9.75 7.91421 10.0858 8.25 10.5 8.25C10.9142 8.25 11.25 7.91421 11.25 7.5C11.25 7.08579 10.9142 6.75 10.5 6.75Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setStampVerified({
                            displayName: (userState as any)?.instagram_data
                              ?.username,
                            creationTime: (userState as any)?.instagram_data
                              ?.creation_time,
                            image:
                              "https://static-00.iconduck.com/assets.00/social-instagram-icon-2048x2048-xuel0xhc.png",
                          })
                        }}
                      >
                        View Stamp
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          deleteStamp(stampsWithId.instagram)
                        }}
                        style={{ color: "red" }}
                      >
                        Remove Stamp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setInstagramShow(true)
                  }}
                  variant="secondary"
                  className="bg-blue-500 text-white"
                  style={{ width: "200px" }}
                >
                  Connect Instagram
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {stampToRender === "phone" && (
          <Card>
            <CardHeader>
              <img
                src={
                  "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&q=80&w=2889&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                }
                alt="Image"
                className="mb-1 size-10 rounded-md object-cover"
              />
              <CardTitle>Phone Number</CardTitle>
              {doesStampExist(stampsWithId.phone) ? (
                <CardDescription>
                  <div className="flex items-center space-x-1">
                    <p>Your phone number is verified</p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="#00e64d"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </CardDescription>
              ) : (
                <CardDescription>
                  Verify your mobile phone number
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {doesStampExist(stampsWithId.phone) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button>Verified Stamp</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5H13C13.5523 5 14 5.44772 14 6V9C14 9.55228 13.5523 10 13 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5ZM0 6C0 4.89543 0.895431 4 2 4H13C14.1046 4 15 4.89543 15 6V9C15 10.1046 14.1046 11 13 11H2C0.89543 11 0 10.1046 0 9V6ZM4.5 6.75C4.08579 6.75 3.75 7.08579 3.75 7.5C3.75 7.91421 4.08579 8.25 4.5 8.25C4.91421 8.25 5.25 7.91421 5.25 7.5C5.25 7.08579 4.91421 6.75 4.5 6.75ZM6.75 7.5C6.75 7.08579 7.08579 6.75 7.5 6.75C7.91421 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 7.91421 8.25 7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5ZM10.5 6.75C10.0858 6.75 9.75 7.08579 9.75 7.5C9.75 7.91421 10.0858 8.25 10.5 8.25C10.9142 8.25 11.25 7.91421 11.25 7.5C11.25 7.08579 10.9142 6.75 10.5 6.75Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setStampVerified({
                            displayName: "Phone Number",
                            email: (userState as any)?.phone,
                            image:
                              "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&q=80&w=2889&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                          })
                        }}
                      >
                        View Stamp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setPhonenumber(true)
                  }}
                  className="!text-white"
                  variant="secondary"
                  style={{ width: "200px", backgroundColor: "#3b82f6" }}
                >
                  Connect Phone Number
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {stampToRender === "gooddollar" && (
          <GooddollarConnect
            fetchStamps={() => {
              fetchStampData()
              fetchUserData()
            }}
            uid={uuid}
            deleteStamp={() => deleteStamp(stampsWithId.gooddollar)}
            isExistingStamp={doesStampExist(stampsWithId.gooddollar)}
          />
        )}
        {Boolean(supabaseUser?.id) && (
          <BrightIdConnectSheet
            modalOpen={brightIdSheetOpen}
            email={email}
            supabaseUser={supabaseUser}
            closeModal={() => {
              onMainPanelClose()
              setBrightIdSheetOpen(false)
            }}
          />
        )}

        <Sheet
          open={gitcoinStamps}
          onOpenChange={(value) => {
            if (value === false) {
              onMainPanelClose()
              setGitcoinStamps(false)
            }
          }}
        >
          <SheetContent style={{ width: 500 }}>
            <SheetHeader>
              <SheetTitle>Gitcoin Stamps</SheetTitle>
              <p>Gitcoin Passport Score : {gitcoinScore}</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
                className="pt-2"
              >
                {stampCollector.map((item) => (
                  <div
                    style={{
                      width: 160,
                      textAlign: "center",
                      marginBottom: 15,
                    }}
                  >
                    <img
                      style={{ width: 50, height: 50, margin: "auto" }}
                      src={item.icon}
                    />
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                      {camelCaseToWords(item.stamp)}
                    </p>
                  </div>
                ))}
              </div>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Sheet
          open={Boolean(stampVerified)}
          onOpenChange={(value) => {
            if (value === false) {
              setStampVerified(null)
            }
          }}
        >
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{stampVerified?.title}</SheetTitle>
              <div style={{ display: "flex", alignItems: "center" }}>
                <img
                  src={stampVerified?.image}
                  style={{ width: 50, height: 50, borderRadius: 5 }}
                />
                <div style={{ marginLeft: 10, fontSize: 15 }}>
                  <p>{stampVerified?.displayName}</p>
                  <p>{stampVerified?.email}</p>
                  <p>
                    Verified On :{" "}
                    {dayjs(stampVerified?.creationTime).format("DD MMM YYYY")}
                  </p>
                </div>
              </div>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <PhoneNumberConnect
          open={phonenumber}
          dbUser={supabaseUser}
          uid={uuid}
          fetchStamps={() => {
            fetchUserData()
            fetchStampData()
          }}
          onClose={() => {
            onMainPanelClose()
            setPhonenumber(false)
          }}
        />
        <InstagramConnect
          open={instagramShow}
          uid={uuid}
          onOpen={() => {
            setInstagramShow(true)
          }}
          fetchStamps={() => {
            fetchUserData()
            fetchStampData()
          }}
          email={email}
          dbUser={supabaseUser}
          onClose={() => {
            onMainPanelClose()
            setInstagramShow(false)
          }}
        />
      </div>
    </div>
  )
}
