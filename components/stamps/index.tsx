/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import axios from "axios"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import { useAccount } from "wagmi"
import Web3 from "web3"

import { pohABI } from "../../lib/contract_abi"
import { useStamps } from "./../../hooks/useStamps"
import "@near-wallet-selector/modal-ui/styles.css"
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

const socialDataToMap = [
  {
    local_key: "facebook_data",
    supabase_key: "facebook",
    title: "Facebook",
    image:
      "https://play-lh.googleusercontent.com/ccWDU4A7fX1R24v-vvT480ySh26AYp97g1VrIB_FIdjRcuQB2JP2WdY7h_wVVAeSpg",
    color: "info",
  },
  {
    local_key: "github_data",
    supabase_key: "github",
    image:
      "https://play-lh.googleusercontent.com/PCpXdqvUWfCW1mXhH1Y_98yBpgsWxuTSTofy3NGMo9yBTATDyzVkqU580bfSln50bFU",
    title: "Github",
    color: "secondary",
  },
  {
    local_key: "google_data",
    supabase_key: "google",
    image:
      "https://play-lh.googleusercontent.com/aFWiT2lTa9CYBpyPjfgfNHd0r5puwKRGj2rHpdPTNrz2N9LXgN_MbLjePd1OTc0E8Rl1=w240-h480-rw",
    title: "Google",
    color: "primary",
  },
  {
    local_key: "twitter_data",
    supabase_key: "twitter",
    image:
      "data:image/png;base64,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",
    title: "Twitter",
    color: "error",
  },
  {
    local_key: "discord_data",
    supabase_key: "discord",
    image:
      "https://images-eds-ssl.xboxlive.com/image?url=Q_rwcVSTCIytJ0KOzcjWTYl.n38D8jlKWXJx7NRJmQKBAEDCgtTAQ0JS02UoaiwRCHTTX1RAopljdoYpOaNfVf5nBNvbwGfyR5n4DAs0DsOwxSO9puiT_GgKqinHT8HsW8VYeiiuU1IG3jY69EhnsQ--&format=source",
    title: "Discord",
    color: "error",
  },
]

export const Stamps = () => {
  const signInWithSocial = async (socialName: any) => {
    await supabase.auth.signOut()
    const { data: d, error: e } = await supabase.auth.signInWithOAuth({
      provider: socialName,
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    })
  }

  const [brightIdData, setBrightIdData] = useState(null)
  const [brightIdSheetOpen, setBrightIdSheetOpen] = useState(false)
  const [userState, setUserState] = useState({})
  const [stampVerified, setStampVerified] = useState<any>(null)
  const [gitcoinStamps, setGitcoinStamps] = useState(false)
  const {
    user: { email },
  }: any = useSelector((state) => state)
  const { stamps, stampCollector } = useStamps()

  const fetchStamps = useCallback(async () => {
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

  const connectToWeb3Node = useCallback(
    (address: string) => {
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
              fetchStamps()
              setIsPohVerified(true)
            } else {
              setIsPohVerified(false)
            }
          })
          .catch((err: any) => {
            toast.error("An error occured")
          })
      }
    },
    [email, fetchStamps, userState]
  )
  const { address } = useAccount()

  useEffect(() => {
    if (address) {
      connectToWeb3Node(address)
    }
  }, [connectToWeb3Node, address])

  useEffect(() => {
    if (email) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        const allAuthType: any = {
          github: "github_data",
          facebook: "facebook_data",
          google: "google_data",
          twitter: "twitter_data",
          discord: "discord_data",
        }
        console.log(session, "session")
        if (session?.user) {
          const {
            app_metadata,
            user_metadata,
            email: social_email,
            phone,
          }: any = session?.user
          const providerKey =
            allAuthType[
              app_metadata?.providers?.[1]
                ? app_metadata?.providers?.[1]
                : app_metadata?.provider
            ]
          const dataToSet = {
            [providerKey]: {
              email: social_email,
              displayName: user_metadata.full_name,
              phoneNumber: phone,
              photoURL: user_metadata.avatar_url,
              creationTime: Date.now(),
            },
          }
          await axios.post("/api/supabase/update", {
            table: "users",
            body: dataToSet,
            match: { email },
          })
          const {
            data: { data: supabaseData },
          } = await axios.post("/api/supabase/select", {
            match: { email, identifier: social_email },
            table: "whitelist",
          })
          if (!supabaseData[0]) {
            await axios.post("/api/supabase/insert", {
              table: "whitelist",
              body: {
                email: email,
                identifier: social_email,
              },
            })
          } else {
            await axios.post("/api/supabase/insert", {
              table: "blacklist",
              body: {
                email: email,
                identifier: social_email,
              },
            })
          }

          fetchStamps()
          supabase.auth.signOut()
        }
      })
    }
  }, [email, fetchStamps, userState])

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
      if (dataCategory?.[0]?.[1]?.[0]) {
        const {
          data: { data: supabaseData },
        } = await axios.post("/api/supabase/select", {
          match: { email, identifier: (wallet as any).accountId },
          table: "whitelist",
        })
        if (!supabaseData[0]) {
          await axios.post("/api/supabase/insert", {
            table: "whitelist",
            body: {
              email: email,
              identifier: (wallet as any).accountId,
            },
          })
        } else {
          if (supabaseData?.[0]?.email !== email) {
            await axios.post("/api/supabase/insert", {
              table: "blacklist",
              body: {
                email: email,
                identifier: (wallet as any).accountId,
              },
            })
          }
        }
        await axios.post("/api/supabase/update", {
          body: {
            iah: (wallet as any).accountId,
          },
          table: "users",
          match: { email },
        })
        fetchStamps()
        wallet.signOut()
      } else {
        toast.error(
          "Please verify yourself with IAH to get a verified stamp with near"
        )
      }
    }
  }, [email, fetchStamps])

  console.log({ wallet, userState })

  useEffect(() => {
    fetchNearWallet()
  }, [fetchNearWallet])

  const deleteStamp = async (key_for_db: string) => {
    const data = await axios.post("/api/supabase/update", {
      match: { email },
      body: {
        [key_for_db]: null,
      },
      table: "users",
    })
    toast.success("Stamp removed successfully")
    fetchStamps()
  }

  useEffect(() => {
    fetchStamps()
  }, [fetchStamps])

  const { open } = useWeb3Modal()

  function camelCaseToWords(s: string) {
    const result = s.replace(/([A-Z])/g, " $1")
    return result.charAt(0).toUpperCase() + result.slice(1)
  }

  return (
    <div className="p-3 pb-16">
      <h1 className="mb-2 text-3xl font-semibold">Stamps</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {socialDataToMap.map((item) => (
          <Card style={{ height: "auto" }}>
            <CardHeader>
              <img
                src={item.image}
                alt="Image"
                className="mb-1 h-10 w-10 rounded-md"
              />
              <CardTitle>{item.title}</CardTitle>
              {(userState as any)?.[item.local_key] ? (
                <CardDescription>
                  <div className="flex items-center space-x-1">
                    <p>Your {item.supabase_key} account is verified</p>
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
                <CardDescription>
                  Connect your existing {item.supabase_key} to verify
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {(userState as any)?.[item.local_key] ? (
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
                          deleteStamp(item?.local_key)
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
                >
                  Connect Account
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <img
              src={
                "data:image/jpeg;base64,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"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>POH - Proof of Humanity</CardTitle>
            {Boolean((userState as any)?.poh_IsRegistered) ? (
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
            {Boolean((userState as any)?.poh_IsRegistered) && isPohVerified ? (
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
        </Card>
        <Card>
          <CardHeader>
            <img
              src={
                "data:image/png;base64,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"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>Near Wallet - IAH Integration</CardTitle>
            {Boolean((userState as any)?.iah) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your NEAR account is verified</p>
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
              <CardDescription>Connect your wallet connect</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {Boolean((userState as any)?.iah) ? (
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
                        deleteStamp("iah")
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
                "data:image/jpeg;base64,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"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>Bright Id Connect</CardTitle>
            {Boolean(brightIdData) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your brightid has been connected</p>
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
              <CardDescription>Connect your bright id wallet</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {Boolean(brightIdData) ? (
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
                        console.log(brightIdData)
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
              src={"https://passport.gitcoin.co/assets/gitcoinLogoWhite.svg"}
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>Gitcoin Passport</CardTitle>
            <CardDescription>
              Connect your web3 to be verified by gitcoin passport
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stampCollector.length !== 0 ? (
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
              <Button
                onClick={() => {
                  open()
                }}
                variant="secondary"
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
                "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&q=80&w=2889&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              }
              alt="Image"
              className="mb-1 h-10 w-10 object-cover rounded-md"
            />
            <CardTitle>Phone Number</CardTitle>
            {Boolean((userState as any)?.phoneNumber) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your phone number is verified</p>
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
              <CardDescription>Verify your phone number</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {Boolean((userState as any)?.phoneNumber) ? (
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
                        console.log(userState)
                        setStampVerified({
                          displayName: "Phone Number",
                          email:(userState as any)?.phoneNumber,
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
                  setBrightIdSheetOpen(true)
                }}
                variant="secondary"
                style={{ width: "200px" }}
              >
                Connect Phone Number
              </Button>
            )}
          </CardContent>
        </Card>
        <GooddollarConnect />
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
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
      </div>
    </div>
  )
}

//allow multiple account - future
// one metamask integration - proof of humanity
//brightid
