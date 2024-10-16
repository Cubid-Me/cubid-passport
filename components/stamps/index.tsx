/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import axios from "axios"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import { useAccount, useConnect, useDisconnect } from "wagmi"

import Web3 from "web3"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet as useSolanaWallet, useConnection as useSolanaConnection } from "@solana/wallet-adapter-react";

import { LoginOptions } from './lensProtocolLogin'

import { useStamps } from "./../../hooks/useStamps"
import "@near-wallet-selector/modal-ui/styles.css"
import { useRouter } from "next/navigation"
import { useProfile as useFarcasterProfile } from '@farcaster/auth-kit';

import useAuth from "@/hooks/useAuth"
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

import { supabase } from "../../lib/supabase"
import { BrightIdConnectSheet } from "./brightIdConnectSheet"
import { GooddollarConnect } from "./gooddollarConnect"
import { InstagramConnect } from "./instagramConnect"
import { PhoneNumberConnect } from "./phoneNumberConnect"
import { insertStamp } from "@/lib/stampInsertion"
import { SignInButton } from '@farcaster/auth-kit';

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
      "data:image/png;base64,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",
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
  worldcoin: 26,
  telegram: 27,
  solana: 53,
  'lens-protocol': 66,
  'farcaster': 68
}

export const Stamps = () => {
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




  const { connectors, connect } = useConnect({
  })
  const { supabaseUser, getUser } = useAuth({})

  const { isAuthenticated: isFarcasterAuthenticated,
    profile: { username, fid, ...restFarcasterJSON }, } = useFarcasterProfile()

  const fetchStampData = useCallback(async () => {
    console.log("fetch Stampdata executed")
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
      console.log("all stamps executed", dbData)
      setAllStamps(dbData)
      setStampLoading(false)
    }
  }, [supabaseUser])

  useEffect(() => {
    (async () => {
      const dbUser = await getUser()
      if (isFarcasterAuthenticated && fid && username) {
        await insertStamp({
          stampData: { uniquevalue: fid, identity: username, ...restFarcasterJSON }, stamp_type: "farcaster", app_id: parseInt(process.env.NEXT_PUBLIC_DAPP_ID ?? ""), user_data: {
            user_id: dbUser?.id,
            uuid: '',
          }
        })
        fetchStampData()
      }
    })()
  }, [isFarcasterAuthenticated, fid, username, getUser, fetchStampData, restFarcasterJSON])


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
  const email: any = useSelector((state: any) => state?.user?.email ?? "")
  const { stampCollector, fetchNearAndGitcoinStamps, gitcoinScore } = useStamps(
    {}
  )
  const { push } = useRouter()

  console.log({ supabaseUser }, "supabaseUser")



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

  const { publicKey, connected: solConnected } = useSolanaWallet()
  console.log({ publicKey: publicKey?.toString() }, 'sol pub key')

  useEffect(() => {
    (async () => {
      if (!doesStampExist(stampsWithId["solana"]) && solConnected) {
        const dbUser = await getUser()
        const string_publicKey = publicKey?.toString()
        await insertStamp({
          stamp_type: 'solana',
          user_data: { user_id: dbUser?.id, uuid: "" },
          stampData: {
            identity: publicKey?.toString(),
            uniquevalue: publicKey?.toString(),
          },
          app_id: await getIdForApp()
        })
        fetchUserData()
        fetchStampData()
      }
    })()

  }, [publicKey, solConnected])

  const connectToWeb3Node = useCallback(
    async (address: string) => {
      console.log({ address })
      if (address) {
        const {
          data: { stamps, scores },
        } = await axios.post("/api/gitcoin-passport-data", { address })
        const stampId = stampsWithId.gitcoin

        const dbUser = await getUser()
        if (scores.score !== "0E-9") {
          await insertStamp({
            stamp_type: 'gitcoin',
            user_data: { user_id: dbUser?.id, uuid: "" },
            stampData: {
              identity: address,
              uniquevalue: address,
              stamps,
              scores
            },
            app_id: await getIdForApp()
          })
        }
        await insertStamp({
          stamp_type: 'evm',
          user_data: { user_id: dbUser?.id, uuid: "" },
          stampData: {
            identity: address,
            uniquevalue: address,
          },
          app_id: await getIdForApp()
        })

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
      disconnect,
      email,
      fetchStampData,
      fetchUserData,
      getIdForApp,
      getUser,
      userState,
      fetchNearAndGitcoinStamps,
    ]
  )
  const { address } = useAccount()

  console.log("here is address->", address)

  useEffect(() => {
    if (address && !localStorage.getItem("lens-loggin")) {
      connectToWeb3Node(address)
    }
  }, [connectToWeb3Node, address])

  useEffect(() => {
    if (email) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { user_metadata } = session?.user
          const providerKey: any = localStorage.getItem("socialName") ?? ""
          console.log(providerKey, session?.user, 'stamp defense')
          const stampId = (stampsWithId as any)[providerKey]
          const dbUser = await getUser()
          await insertStamp({
            stamp_type: providerKey,
            user_data: { user_id: dbUser?.id, uuid: "" },
            stampData: {
              identity: providerKey === "discord" ? user_metadata?.name : providerKey === "twitter" ? user_metadata?.user_name : user_metadata?.sub,
              uniquevalue: user_metadata?.sub,
              email: user_metadata?.email,
              phone: user_metadata?.phone,
            },
            app_id: await getIdForApp()
          })
          // const database = {
          //   uniquehash: await encode_data(user_metadata?.email),
          //   stamptype: stampId,
          //   created_by_user_id: dbUser?.id,
          //   unencrypted_unique_data: JSON.stringify(user_metadata),
          //   type_and_hash: `${stampId} ${await encode_data(
          //     user_metadata?.email
          //   )}`,
          // }
          // const dataToSet = {
          //   created_by_user_id: dbUser?.id,
          //   created_by_app: await getIdForApp(),
          //   stamptype: stampId,
          //   uniquevalue: user_metadata?.email,
          //   user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${user_metadata?.email}`,
          //   unique_hash: await encode_data(user_metadata?.email),
          //   stamp_json: user_metadata,
          //   type_and_uniquehash: `${stampId} ${await encode_data(
          //     user_metadata?.email
          //   )}`,
          // }
          // await axios.post("/api/supabase/insert", {
          //   table: "uniquestamps",
          //   body: database,
          // })
          // const {
          //   data: { error, data },
          // } = await axios.post("/api/supabase/insert", {
          //   table: "stamps",
          //   body: dataToSet,
          // })
          // if (data?.[0]?.id) {
          //   await axios.post("/api/supabase/insert", {
          //     table: "authorized_dapps",
          //     body: {
          //       dapp_id: process.env.NEXT_PUBLIC_DAPP_ID,
          //       dapp_and_stamp_id: `${process.env.NEXT_PUBLIC_DAPP_ID} ${data?.[0]?.id}`,
          //       stamp_id: data?.[0]?.id,
          //       can_read: true,
          //       can_update: true,
          //       can_delete: true,
          //     },
          //   })
          // }
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
      const dbUser = await getUser()
      if (dbUser?.id) {

        await insertStamp({
          stamp_type: 'iah',
          user_data: { user_id: dbUser?.id, uuid: "" },
          stampData: {
            identity: (wallet as any).accountId,
            uniquevalue: (wallet as any).accountId,
          },
          app_id: await getIdForApp()
        })

        await insertStamp({
          stamp_type: 'near-wallet',
          user_data: { user_id: dbUser?.id, uuid: "" },
          stampData: {
            identity: (wallet as any).accountId,
            uniquevalue: (wallet as any).accountId,
          },
          app_id: await getIdForApp()
        })



        fetchUserData()
        fetchStampData()
        wallet.signOut()
      }
    }
  }, [email, fetchStampData, fetchUserData, getUser, getIdForApp])

  useEffect(() => {
    fetchNearWallet()
  }, [fetchNearWallet])

  const deleteStamp = async (stamp_type: number) => {
    const supabaseUser = await getUser()
    const { unique_hash, id } = allStamps.filter(
      (item: any) => item.stamptype === stamp_type
    )[0]
    await axios.post("/api/supabase/delete", {
      match: { dapp_id: process.env.NEXT_PUBLIC_DAPP_ID, stamp_id: id },
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


  const [lensModalOpen, setLensModalOpen] = useState(false)
  const [gitcoinModalOpen, setGitcoinModalOpen] = useState(false)


  return (
    <div className="p-3 pb-16">
      <div className="flex mb-3 items-center justify-between">
        <h1 className=" text-3xl font-semibold">Stamps</h1>
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
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 ${stampLoading && "pointer-events-none opacity-40"
          }`}
      >
        {socialDataToMap.map((item) => (
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
        {/* <Card>
          <CardHeader>
            <img
              src={
                "data:image/jpeg;base64,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"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>POH - Proof of Humanity</CardTitle>
            {doesStampExist(stampsWithId.poh) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your Wallet Account account is verified</p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="#00e64d"
                    className="h-6 w-6"
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
              <CardDescription>Connect your web3 wallet</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId.poh) && isPohVerified ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="default">Verified Stamp</Button>
              </div>
            ) : (
              <>
                {isPohVerified === false && (
                  <Button
                    onClick={() => {
                      open()
                    }}
                    variant="outline"
                  >
                    Not Verified
                  </Button>
                )}
                {isPohVerified === null && (
                  <Button
                    onClick={() => {
                      open()
                    }}
                    variant="outline"
                  >
                    Connect Wallet
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader>
            <img
              src={
                "data:image/jpeg;base64,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"
              }
              alt="Image"
              className="mb-1 size-10 rounded-md"
            />
            <CardTitle>Lens Protocol</CardTitle>
            {doesStampExist(stampsWithId["lens-protocol"]) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your Lens Protocol is verified</p>
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
                Use a Lens Protocol Account
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {false ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="flex items-center space-x-2">
                  <Button>Verified Stamp</Button>
                </div>
              </div>
            ) : (
              <>

                {address ? <>
                  <LoginOptions wallet={address ?? ""} onSuccess={async (args) => {
                    const dbUser = await getUser()
                    console.log(args, 'lens args')
                    await insertStamp({
                      app_id: parseInt(process.env?.NEXT_PUBLIC_DAPP_ID ?? ""), stamp_type: "lens-protocol",
                      stampData: {
                        uniquevalue: args?.id,
                        identity: args.handle?.fullHandle,
                      },
                      user_data: {
                        user_id: dbUser?.id,
                        uuid: ""
                      }
                    })
                    disconnect()
                    fetchUserData()
                    fetchStampData()
                    window.location.reload()
                  }} />
                </> : <>
                  <Sheet
                    open={lensModalOpen}
                    onOpenChange={(value) => {
                      if (value === false) {
                        setLensModalOpen(false)
                      }
                    }}
                  >
                    <SheetContent>
                      <p className="text-xl font-bold mb-5">Connect Web3 Wallet for Lens</p>
                      {connectors.map((connector) => (
                        <Button
                          variant="secondary"
                          className="bg-blue-500 mb-4 text-white"
                          style={{ width: "200px" }}
                          key={connector.uid}
                          onClick={() => {
                            localStorage?.setItem("lens-loggin", 'true');
                            connect({ connector })
                          }}
                        >
                          {connector.name}
                        </Button>
                      ))}
                    </SheetContent>
                  </Sheet>
                  <Button variant="outline"
                    className="bg-blue-500 text-white" onClick={() => {
                      setLensModalOpen(true)
                    }}>Connect Lens Wallet</Button>
                </>}

              </>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <img
              src={
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQB0LwYIlZ9aYglKkSRuhEH0TM6VkCmqRqXpQ&s"
              }
              alt="Image"
              className="mb-1 size-10 rounded-md"
            />
            <CardTitle>Farcaster</CardTitle>
            {doesStampExist(stampsWithId["farcaster"]) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your Farcaster is verified</p>
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
                Use a Farcaster Account
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId["farcaster"]) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="flex items-center space-x-2">
                  <Button>Verified Stamp</Button>
                </div>
              </div>
            ) : (
              <div className="bg-white w-[fit-content] rounded-lg">
                <SignInButton />
              </div>
            )}
          </CardContent>
        </Card>


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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
        <Card>
          <CardHeader>
            <img
              src={
                "https://logowik.com/content/uploads/images/worldcoin2094.logowik.com.webp"
              }
              alt="Image"
              className="mb-1 size-10 object-fit rounded-md"
            />
            <CardTitle>Worldcoin</CardTitle>
            {doesStampExist(stampsWithId["iah"]) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your worldcoin account is verified</p>
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
              <CardDescription>Connect to worldcoin</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId["worldcoin"]) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      // connect worldoin wallet
                    }}
                    variant="secondary"
                    className="bg-white text-black"
                    style={{ width: "200px" }}
                  >
                    WorldId Connected
                  </Button>
                </div>

                {/* <DropdownMenu>
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
                        //
                      }}
                    >
                      View Stamp
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        //delete world coin
                      }}
                      style={{ color: "red" }}
                    >
                      Remove Stamp
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> */}
              </div>
            ) : (
              <Button
                onClick={() => {
                  window.location.href =
                    "https://id.worldcoin.org/authorize?response_type=code&response_mode=query&client_id=app_541763ec208991dcb4232108de2f9553&redirect_uri=https://passport.cubid.me/worldcoin&ready=true&scope=openid"
                }}
                variant="secondary"
                className="bg-blue-500 text-white"
                style={{ width: "200px" }}
              >
                Connect Worldcoin
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <img
              src={
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHCA8PEhISERQSERIREhESFBEREhgRFRERGBUZGRgUFhgcIC4lHB4rHxgYJjgmKy8xNTU1GiQ7QDs0Py40NTEBDAwMEA8QHxISHjQrJCw2NDQ2NDQ0NDQ0NDQ0NDE0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NP/AABEIAOEA4QMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAQYCBAUHA//EAD0QAAIBAQMHCQcDAwUBAAAAAAABAgMEBREGEiExQVFxFSIyUmFyobHRE0JTYoGRwUOCkiPC4SQzorLxFv/EABoBAQACAwEAAAAAAAAAAAAAAAADBQIEBgH/xAAyEQACAgADBgIJBAMAAAAAAAAAAQIDBBExEhMhUVKRM0EFFDJCYXGB0fAiQ6GxFSPh/9oADAMBAAIRAxEAPwD2YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYjEAkEAZgkEEgAAjEAkEYjEAkEDEZgkEYhMAkAAAAAAAAAAAAAAAAAAAAAhkkAFJqXraVKSVSWt7t/Ajla1fEl4ehp1OlLvPzMCodk+bOjVVeS/SuyN7la1fEl4ehlC9bS5R/qS1rdv4GgZU+lHvLzCsnzYdVeXsrsj0IyMTItznAcHKO11KXs8yTjnZ2OGGnDA7xXMrP0uMvwQ4htVvI2MIk7opnJ5WtXxJeHoOVrV8SXh6GiCt3k+bLzc19K7I3uVrV8SXh6Eq97V8SXh6GgBvJ833G5r6V2R1ad/WmOtxn3o+mBu2fKXZUp/WEvw/UroM1fYvMilhKZe724F3st7WerojNJ9WXNf+TfxPOjesV616OCUs6PUnpWHZuNiGL60advo7zrf0f3LwDl3de9KvgujPqyevhvOnibcZKSzRXThKD2ZLJkgAyMQAAAAAAAAAAAAQSQAeeVOlLvPzZgZ1elLvS82YFK9Tp46IGdPpR7y8zAzp9KPeXmA9GehGRBJdHMArmVn6XGX4LGVzKv9L9/9pDiPCZs4Px4/nkVsAFUX4AAAAAAAABJ3bqv1rCFZ4x1Ketx729dpwSTOuyUHmiK2mFscpHocZJrFPFPU1pxMyn3LerotQm8ab1fI967C2waaxTxT2otKrVYs0UV9EqZZP6PmZgAkIQAAAAAAAAAQSADkO4bM23hPS8emyP8A5+zbp/zZ2AR7mvpRN6xd1M5HIFm3T/kFcFmTTwloePTZ1wN1Dkg8Ra/efcxRkASEINO22GlXwz03m44YNrXw4G4DxpNZM9TaeaOVyFZeq/5y9RyFZeq/5S9Tqgw3UOldiTf29T7s5XIVl6r/AJy9TGVw2Z7JLhJnXA3VfSj31i7rfdlfrZN030JyXeSkvDA5dquW0U9ObnrfT0+GsugI5Yat6cCWGOujq8/mecsgu1vuulXWLWbLZOOv67yqW+76lnlhJYp9GS1S9H2GnZRKvj5FnRi4W8NHy/NTUABAbQLDk9eWD9jN6H0G9nyleJTa0rQ1pXEkrscJZoiuqVsHFnoqJOdc9tVekpPpR5sl8y2/XWdEtotSWaOelFxbi9UAAemIAAAAAAAIAJBocq2ZaPaR0cRyvZviR8fQw2480SbqzpfY3wc/lezfEj4+g5Xs3xI+Poe7yHNDdWdL7HQBBJkRgA1rTa6dLDPko52OGO3DWeNpanqTbyRsg5/K1m+JHx9CeVrN8SPj6GO8jzXcy3U+l9jfBocrWb4kfH0MoXlZ5aFUhjucsPM9248w65ryfY3QYRknpTTW9GZkYA+FooQqRcZpSi9aZ9wGCjXrd8rPLDXB6Yy3rc+00S+W+yRrwcJbdT6stjKPWpShKUZLCUW00Vl9O7fDQvMJiN7HJ6r8zPmADXNw6lw2v2VVJvCNTmvj7r++j6lyR50nhqL3d9f2tKE9sorHvLQ/FG/hJ8HEqfSNWUlYvPgbYANwrQAAAAAAQySADzyp0pd6XmYGdTpS7z8zApXqdPHRAlEEnh6ehxWhcEZmMdS4IyLs5cFcys1Uv3/2ljK7lZqpcZfghxHhM2cH48fzyK0ACqL8EkAA2rJbqtF4wk0tsXpi+KLXdd5wtC6s1rh+V2FKPpZ60qc1KDwlF4r0fYT1XSg/gauIwsbVmuEuZ6GDXsdojVpxnHVJY4bntX3Ngs08+KKFpp5MjArOU9kwcaq282XHY/x9Czmhe9D2lGcdqi5LjHSjC6G3Bomw9m7tUvziUcAFQdEC05L1sac4P3J4rg16plWO7ktPCpOPWhj9mvVk+GeViNTGx2qX8OJagAWhRAAAAAAAgkgA88qdKXefmYH3tiwqVF88/wDsz4FK9Tp46IEogk8PT0SOpcEZGEXoXBGZdnLgruVmqlxl+CxFcyrTwpPZjJeC9CHEeGzZwfjx/PIrYAKovwAAAAACzZLVW4VIdWSkvr/4WErGSa51V7M2K8WWctcP4aKDGJK+WQMJxxTW9YGZBMax53OODa3NoxPpaHz59+Xmz5lKzp1oDq5Nv/UR7YS8jlHVycX+oj2Ql5ElPiR+ZDifBl8i5AAtjngAAAAAAQySGAUW9YZteqvnb++n8mmdjKalm1s7ZOCf1Wh/g45UWrKbR0dEtqqL+H/AACMlL7YamdSpy3wj98DaOJkzaM+k4vXTlh+16V44nbLiuW1FM5u6GxZKPxByr/s7qUZYa4NTXBa/DE6pi14nso7UXE8hNwkpLyPOyDqXzdroScor+nJ6PlfVf4OWVE4uLyZ0VdkbIqUdAADEzAB0Lpu6VeenRCPSlv8AlXaZRi5PJGE5qEXKWh3cmrM4UnJ66ksf2rQvydo+cIKKSSwSWCS2I+hbwjsxSOdsm7JuT8wfKvUzIyl1Yyf2WJ9Tk5Q2j2dGS2z5i4e94CctmLYrg5zUV5lPxIAKY6UHcyWhjUnLqww+rf8Ag4ZaMlqWFOc3788FwivVsnw6zsRqY2WzQ/jw/k74ALQogAAAAAAAADh5TWbPpKaWmEv+MtD8cCqHoNakpxlF6pJxfBoolpoOnOUZa4trjuZoYuH6lLmW/o+zODhyPiADTLE6Fy2z2NVN9CfMl2J6n9GXbE85LVk/ePtIqnN8+K5rfvRX5Ru4W33GVmPoz/2R+v3O6CCTeKo+VSnGacZJNNYNPSmjgW7J3FuVGSXyy1LgyyAwnXGftIkqunU84so1S6bRF6acn3ed5EU7qtEtVOa7yzfMvQIPVIc2bn+Rsy0X8/crNiydeh1pLDqQ28X6Fho0YwiowSjFakj6gmhVGHso1Lbp2vOb+wAIxJCIhlPv+2e1q5sejDmrtl7z/H0O1ft4qjHNi/6k1o+WO2RUTSxVnuL6lpgKP3ZfT7kAA0S0JRertoeypQhtUVj3npfiyr3FZPa1U2ubDnvitS+/kXM38JDg5FT6RszagvLiSADcK0AAAAAAAAAhleyksGclWitMdEkursl9PyWI+c4KSaelPQ1vRhZBTi0ySqx1zUkeeA6F73e6E9HQli4v+19qOeVMouLyZ0MJqcVKOjBnCTi1KLwaeKa1pmAMTMt90XxGslCeEaiXBT7V29h18TzpM7V33/OGEavPj1l0lx3m9VilpPuVOIwLT2quxbAalmttKssac1L5ccJLitZtG4mnxRXNNPJkggHp4SCMTXtNsp0ljOUY9jel8FrYby1PUm3kjYxOVet6woJpYSqNaI7F2s5l4ZQyljGis1deXSfBbDhyk222229Lb0ts07cSlwh3LDD4Fv8AVZwXImtUlOTlJ50pPFtmABolskkskCUm9C2g72T124tVZrmroLrPrcDOuDnLZRHdaqoOTOtc1i9hTSfSlzpcd30OkQkSW0YqKyRz0pOUnJ6sAA9MQAAAAAAAAAQ0SADWtllhWg4TWKf3T2NdpTLwsM7PPNlpT0xlskvXsL4a1qssKsHGSxT+6e9bmQXUqxfE2sNiXS+On5oUEHRvO6qlB49KnsmtnZLcc4rZRcXky7hOM1tRfAAAxMyVo0rQ95uUb1tENCqSa3S53maQMlJx0ZjKEZ+0szsQyitC1qnLjF4+DJllFaHqVNftfqcYGe+s6iL1WnpRv1b3tE9c2u7zfI0pSbeLbb3vSzEGDk5asljCMPZWQABiZAEnbuq45TwnVWbDZHVKXHcjOEJTeSI7bYVR2pM+FzXU6zz5pqmn/N7l2FupwUUkkkksElsQpwUUkkkksElsRmWdVSrWRQ33yulm9PJEgAlIQAAAAAAAAAAAAAAAQSADCUU000mnselM4dvyfjPGVJ5r6r6L4bjvgwnXGaykSV2zrecWef2myVKTwnFx7XqfB6mfA9CqU4yTUkmnrTWKOXabhoT0xUoP5XivszTnhH7rLKv0jH9xZfIqIO5XycqroyjLsbcWac7mtMfcb7rT/JA6bFqjbjiaZaSX9f2c8G27utC/Sq/SDfkTG7bQ/wBKp9YteZhsS5PsSb2HUu6NMHShcdpl7ub3pJG9Ryak/wDcqJdkFj4szVNj8iKWKpjrJfTiV83LFdtav0Y83ry5sf8AP0LRZrns9PB5uc170+d4avA6KRsQwnWzTt9I+Va+rOXd1zU6OEpf1J9ZrRHuo6qRINyMVFZIrpzlN7UnmwADIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/Z"
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
        <Card>
          <CardHeader>
            <img
              src={
                "https://logos-world.net/wp-content/uploads/2024/01/Solana-Logo.png"
              }
              alt="Image"
              className="mb-1 size-10 object-fit rounded-md"
            />
            <CardTitle>Solana</CardTitle>
            {doesStampExist(stampsWithId["solana"]) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your Solana address is verified</p>
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
              <CardDescription>Connect to Solana</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId["solana"]) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      // connect worldoin wallet
                    }}
                    variant="secondary"
                    className="bg-white text-black"
                    style={{ width: "200px" }}
                  >
                    Solana Connected
                  </Button>
                </div>
              </div>
            ) : (
              <WalletMultiButton />

            )}
          </CardContent>
        </Card>
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
              <>
                <Sheet
                  open={lensModalOpen}
                  onOpenChange={(value) => {
                    if (value === false) {
                      setGitcoinModalOpen(false)
                    }
                  }}
                >
                  <SheetContent>
                    <p className="text-xl font-bold mb-5">Connect Web3 Wallet for Gitcoin Passport</p>
                    {connectors.map((connector) => (
                      <Button
                        variant="secondary"
                        className="bg-blue-500 mb-4 text-white"
                        style={{ width: "200px" }}
                        key={connector.uid}
                        onClick={() => {
                          connect({ connector })
                        }}
                      >
                        {connector.name}
                      </Button>
                    ))}
                  </SheetContent>
                </Sheet>
                <Button variant="outline"
                  className="bg-blue-500 text-white" onClick={() => {
                    setGitcoinModalOpen(true)
                  }}>Connect Gitcoin</Button>

              </>

            )}
          </CardContent>
        </Card>
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
              <CardDescription>Verify your mobile phone number</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId.phone) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
        <Card>
          <CardHeader>
            <img
              src={
                "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Telegram_2019_Logo.svg/2048px-Telegram_2019_Logo.svg.png"
              }
              alt="Image"
              className="mb-1 size-10 rounded-md object-cover"
            />
            <CardTitle>Telegram</CardTitle>
            {doesStampExist(stampsWithId.telegram) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your telegram is verified</p>
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
              <CardDescription>Verify your telegram</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId.telegram) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button>Verified Stamp</Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => {
                    push("/telegram-connect")
                  }}
                  className="bg-blue-500 text-white"
                >
                  Connect Telegram
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <GooddollarConnect
          fetchStamps={() => {
            fetchStampData()
            fetchUserData()
          }}
          deleteStamp={() => deleteStamp(stampsWithId.gooddollar)}
          isExistingStamp={doesStampExist(stampsWithId.gooddollar)}
        />
        <BrightIdConnectSheet
          modalOpen={brightIdSheetOpen}
          email={email}
          closeModal={() => {
            setBrightIdSheetOpen(false)
          }}
        />
        <Sheet
          open={gitcoinStamps}
          onOpenChange={(value) => {
            if (value === false) {
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
          fetchStamps={() => {
            fetchUserData()
            fetchStampData()
          }}
          onClose={() => {
            setPhonenumber(false)
          }}
        />
        <InstagramConnect
          open={instagramShow}
          onOpen={() => {
            setInstagramShow(true)
          }}
          fetchStamps={() => {
            fetchUserData()
            fetchStampData()
          }}
          onClose={() => {
            setInstagramShow(false)
          }}
        />
      </div>
    </div>
  )
}
