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
        redirectTo: "http://localhost:3000/app",
      },
    })
  }
  const [brightIdData, setBrightIdData] = useState(null)
  const [brightIdSheetOpen, setBrightIdSheetOpen] = useState(false)
  const [userState, setUserState] = useState({})
  const [stampVerified, setStampVerified] = useState<any>(null)
  const {
    user: { email },
  }: any = useSelector((state) => state)

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
        if (session?.user) {
          const {
            app_metadata,
            user_metadata,
            email: social_email,
            phone,
            created_at,
          }: any = session?.user
          const providerKey = allAuthType[app_metadata?.provider]
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
          fetchStamps()
          supabase.auth.signOut()
        }
      })
    }
  }, [email, fetchStamps])

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
      console.log(dataCategory)
      if (dataCategory?.[0]?.[1]?.[0]) {
        await axios.post("/api/supabase/update", {
          body: {
            iah: (wallet as any).accountId,
          },
          table: "users",
          match: { email },
        })
        fetchStamps()
      } else {
        toast.error(
          "Please verify yourself with IAH to get a verified stamp with near"
        )
      }
    }
  }, [email, fetchStamps])

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
  const { address, isConnecting, isDisconnected } = useAccount()

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
                "data:image/png;base64,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"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>Wallet Connect</CardTitle>
            {Boolean((userState as any)?.walletAccount) ? (
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
            {Boolean((userState as any)?.walletAccount) ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
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
                        console.log(userState)
                        setStampVerified({
                          image:
                            "https://bafybeid4hlg7litcsn4gjpk5qednyarcsgmadzjovjk5k7565xdtd2aulu.ipfs.nftstorage.link/",
                          displayName: (userState as any)?.iah,
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
                  open()
                }}
                variant="outline"
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
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMkAAAD7CAMAAAD3qkCRAAAAflBMVEX///8AAABQUFBLS0u1tbXW1tZAQECjo6Pq6urz8/NXV1eSkpIxMTHPz89GRkagoKCCgoJxcXHk5OTGxsYICAh3d3eIiIjc3Nzw8PCvr68bGxs2Nja5ubn5+flUVFTMzMxlZWUkJCTBwcFpaWmOjo4gICB8fHwWFhZeXl4rKyth+mX/AAAI/klEQVR4nO2d22LaMAyGE6ABeuKwUiiUtazbur7/C47ITuKD5DiJU/tC/9VGEpUPHEWWJZNlLBaLxWKxWCwWi8VisVgsFovFYrFYLBaLxWKxousw2zwWpabPP8Yw//Jxtf24mR1GMK5qsclVrQKb3340tjeLwMY1rXJTbyHN/9Zth/6cFG0skDx/CWf+1rS9CWdb1w4ByfNZKPM/bdu7ULZ1zVGQPH8IY/4Zsz0PY1vXggDJ8yBuZo/bHuO2x8dWqVMI8/e47RHG15kEyfPb4ebXlO3zcNuGXh0k+Xqo9QfS9GuIN6+JHlylhvriT9Jy+OGF+EhVwxwYObby/Geg999o4iYZ5GTeHHYnwQgqtZFc+ps+/0mKZIADc96CEUh6OzDX2IpD0tOBnY/pkfRzYFiAHZ0k33a3+6vFZCSSr86xhSsIiknS/TnWMrbikXQNLpzRXFySbnOjZbu9eCSdchTvSZN0cGDtYysuydHXgR3MKwskJv4Okj9bO/0F8nVg/4zr/mXZYxSSCRn7/fWyODOuer6+No1CMkVfBflkD82xBVFbPBJqauGR/DYyjr+yuCRkFqzVgb3o5++z2CTU7OK4dJvTP4Gv6uyYJOaHaxylpCU4bmu/HZUk+4ujOCMwDV9Jyccl6eHAtLF1pxyITHL+wlF+kcbUNzyjDkQgybY4CenA1PULfcYcm4RK6z7hEZgCfjQSftFJqFWiR9RU0Rw3UeOTUJldzIE1cec/61gCJPZyp5DtwJqxhaT6UiDJCAdmRWD12MLmyUmQUBHYXj+tHltokJkECeXA9ClkvTBqACZFQkVghXqOzG+diPXiREjwJXW91EEUpkyoqX4qJNQSnhJZwfdGB5fJkGQnHEVZwJ2fvhyrE+mQeDowUumQZDc4yVPLFLJSQiRW7keqQE+2lBKJWW5W6d3rryRFYqUWpbwq6NIiyS44ik8FSmIkVuZa6qb9ryRGQlYGtTuw1EiohZH2krbkSHo7sPRIqHW3O9c1WZIkHhEYphRJqGVddwSWIgkZgTlrcpMkoSIwpwNLkyS7w1FcJW2JklAO7Dd9RaokVGE23VSQLMnhCUchI7BkSai6f7KpIF2SrhFYwiSUA7PT9KCUSaiqumf05KRJlIUfTagDS4/koEyqqAgMc2DJkWy0ZDDlwJCmgsRIzlClpeRSCAf2lTrJQrTFfCgveTuwpEiqdIS2ikg4MGulMSWSOpbXH+N2WSDITNsnRFIvIxrT3CURgRlNBemQ1KPowzxCVYToDiwVknNzkp2kI5oa7rWFukRIDs10BEuhEDW52hQyDRLlAWiNLRDhwNSa3CRIlNHzSSztEg5MKZZIgURdjKdK1JZEK2nTVJAAiboUT2810OrA4pNo61iODoEfOEldERKbZKndAM767ZamgsgkW60kvaW/yR2BxSXRV7CO3Q2B5vFJjPRva3MT1VTwFpvEmHp4tJ64HFhEEmPYe/WWO5oKopGczTIov85foiZ3GoukyA5mFadvYznVVPBqz2K+pXfOCqP89y2wP3tKcboAPYogpM6XpEnwBCkuyoElQXLfyR69V0x8Et8KQSlq66n4JG3lD5YIBxadpNvYArVsqxOLpOPYKkV1RcUl6Ty2StGbm8Uj8Sw9NeXeNCYKSd/9lYimgngk/XdudOx3FYOk59hqtfv9JD22vmlEVISMR0J0lJUatmljiwMLsBugIXpADxlbpdwR2ODNAC0RObc8wOaTTgc2wta/1J8KsCEo0RUFGm7dElECHGRvQKKpIO8ZO7SI2J8qzN7MF4ok/BadGXGnBNpemCppG2OD7AzNTgfzLLgDG23XZwuly8y9RVh58YjbVz9o4/mT3l6hhw7mxOsSaAtmQvOa5bgKfTe+qVmwyyjbPWvaz9dXrfxzWx20mD2vQfMeU1AWi8VisVgsFovFYrFYlbY3VxmvLcvXmgr6G1tI0mIBB+wll4V24X68352DwqE/euLmTktKYV3kSIOc/EEKi9G8tAj462ma5JqW9lkCSZ3NwXJvdqdAlZO1GO1S9eM4CS9JorW56iTYAp5NUqXlrfUjLO0c7JfgEBItw2mQLG0U6600++NYdwpWkjNGVq1+l8oSlkFyHWAzQ1ZDTZNatvv9D6/VZfPVlPjmQpIoSz8WSbtgpRc2h39yn7g9jfWlNCOn8SndScArnEQVUUt+XPzqjmOnhr4qSdaiGbkeMt1JduJWA4dNNJbXmvuc1EMlybtoYHqvXutMIlb4DvLh0bJoDKWSSEftUE3gFhGrtNW46EwC69VlrcDOdIOIwM0N+MExSiXJvXxCVzsJdiYpqs8BFuNa2iLgHHyv5UGaiK9aVGTJ/qWuJGJwwj+h3M79DH9W/lJITeSbEC0BYk12pZEgbfDG0w/e27q51Pk2HwxHGUwVyRnWm0Vj1YtGgkSQxocOr4nVKlF3Q6/vHeQj1HNHzD4ksm9x3YMErqye2rfmJ76a3Daq9p4Yo0SiJpG7DZVv8q0bifbmX1WsUvbVY5REVSQwGsRD4UKQTB8bnbT7xBhQylCjSMb54WIgEc8yUcX0W96UOomjaAI83Xv9XygYU5qhLI5p0N/cbqSQyOLrPUbiqJqAR1FTiCImZs1h+O9mt9uJ6r6PEe51IZVEjJNC+F1fEhiKagAMYXEzFYPDMPbEBzXKgn8plUTOMlaLLiQfckjWggixKdgEEvgiRKPz51hfikYi90hE7niSRPgJ1QWI6WNtsiGRD8XwValCOolo6Sme/EngG9Ab0cGd108MhUROhMMXc4J0EqUh05MEnnV67AFPyjrYVUlk3iL8L0mXMkiagmU/EhGUGdFJrnozjSS7WIMxmEySPU6S36tqMn3QAGQ+6aBItJoV6iRi+F7GKIM0SepSaFe0UmeJxP1uRvF79Z7XSaS19+8gyZ48SF7VY5+W0ZNiwCCR04cRCginFokcX155Ybjf7cAW4p5jQ6IF8VPtNgqn3akoTvqwXWyKorivkz376xmG7qvQqTx0sjMQSzhJWL29/lP/5YpVeVHAolEWi8VisVgsFovFYrFYLBaLxWKxWCwWi8VisVhd9R+9z2XKxbECfgAAAABJRU5ErkJggg=="
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
                            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHCA8PEhISERQSERIREhESFBEREhgRFRERGBUZGRgUFhgcIC4lHB4rHxgYJjgmKy8xNTU1GiQ7QDs0Py40NTEBDAwMEA8QHxISHjQrJCw2NDQ2NDQ0NDQ0NDQ0NDE0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NP/AABEIAOEA4QMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAQYCBAUHA//EAD0QAAIBAQMHCQcDAwUBAAAAAAABAgMEBREGEiExQVFxFSIyUmFyobHRE0JTYoGRwUOCkiPC4SQzorLxFv/EABoBAQACAwEAAAAAAAAAAAAAAAADBQIEBgH/xAAyEQACAgADBgIJBAMAAAAAAAAAAQIDBBExEhMhUVKRM0EFFDJCYXGB0fAiQ6GxFSPh/9oADAMBAAIRAxEAPwD2YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYjEAkEAZgkEEgAAjEAkEYjEAkEDEZgkEYhMAkAAAAAAAAAAAAAAAAAAAAAhkkAFJqXraVKSVSWt7t/Ajla1fEl4ehp1OlLvPzMCodk+bOjVVeS/SuyN7la1fEl4ehlC9bS5R/qS1rdv4GgZU+lHvLzCsnzYdVeXsrsj0IyMTItznAcHKO11KXs8yTjnZ2OGGnDA7xXMrP0uMvwQ4htVvI2MIk7opnJ5WtXxJeHoOVrV8SXh6GiCt3k+bLzc19K7I3uVrV8SXh6Eq97V8SXh6GgBvJ833G5r6V2R1ad/WmOtxn3o+mBu2fKXZUp/WEvw/UroM1fYvMilhKZe724F3st7WerojNJ9WXNf+TfxPOjesV616OCUs6PUnpWHZuNiGL60advo7zrf0f3LwDl3de9KvgujPqyevhvOnibcZKSzRXThKD2ZLJkgAyMQAAAAAAAAAAAAQSQAeeVOlLvPzZgZ1elLvS82YFK9Tp46IGdPpR7y8zAzp9KPeXmA9GehGRBJdHMArmVn6XGX4LGVzKv9L9/9pDiPCZs4Px4/nkVsAFUX4AAAAAAAABJ3bqv1rCFZ4x1Ketx729dpwSTOuyUHmiK2mFscpHocZJrFPFPU1pxMyn3LerotQm8ab1fI967C2waaxTxT2otKrVYs0UV9EqZZP6PmZgAkIQAAAAAAAAAQSADkO4bM23hPS8emyP8A5+zbp/zZ2AR7mvpRN6xd1M5HIFm3T/kFcFmTTwloePTZ1wN1Dkg8Ra/efcxRkASEINO22GlXwz03m44YNrXw4G4DxpNZM9TaeaOVyFZeq/5y9RyFZeq/5S9Tqgw3UOldiTf29T7s5XIVl6r/AJy9TGVw2Z7JLhJnXA3VfSj31i7rfdlfrZN030JyXeSkvDA5dquW0U9ObnrfT0+GsugI5Yat6cCWGOujq8/mecsgu1vuulXWLWbLZOOv67yqW+76lnlhJYp9GS1S9H2GnZRKvj5FnRi4W8NHy/NTUABAbQLDk9eWD9jN6H0G9nyleJTa0rQ1pXEkrscJZoiuqVsHFnoqJOdc9tVekpPpR5sl8y2/XWdEtotSWaOelFxbi9UAAemIAAAAAAAIAJBocq2ZaPaR0cRyvZviR8fQw2480SbqzpfY3wc/lezfEj4+g5Xs3xI+Poe7yHNDdWdL7HQBBJkRgA1rTa6dLDPko52OGO3DWeNpanqTbyRsg5/K1m+JHx9CeVrN8SPj6GO8jzXcy3U+l9jfBocrWb4kfH0MoXlZ5aFUhjucsPM9248w65ryfY3QYRknpTTW9GZkYA+FooQqRcZpSi9aZ9wGCjXrd8rPLDXB6Yy3rc+00S+W+yRrwcJbdT6stjKPWpShKUZLCUW00Vl9O7fDQvMJiN7HJ6r8zPmADXNw6lw2v2VVJvCNTmvj7r++j6lyR50nhqL3d9f2tKE9sorHvLQ/FG/hJ8HEqfSNWUlYvPgbYANwrQAAAAAAQySADzyp0pd6XmYGdTpS7z8zApXqdPHRAlEEnh6ehxWhcEZmMdS4IyLs5cFcys1Uv3/2ljK7lZqpcZfghxHhM2cH48fzyK0ACqL8EkAA2rJbqtF4wk0tsXpi+KLXdd5wtC6s1rh+V2FKPpZ60qc1KDwlF4r0fYT1XSg/gauIwsbVmuEuZ6GDXsdojVpxnHVJY4bntX3Ngs08+KKFpp5MjArOU9kwcaq282XHY/x9Czmhe9D2lGcdqi5LjHSjC6G3Bomw9m7tUvziUcAFQdEC05L1sac4P3J4rg16plWO7ktPCpOPWhj9mvVk+GeViNTGx2qX8OJagAWhRAAAAAAAgkgA88qdKXefmYH3tiwqVF88/wDsz4FK9Tp46IEogk8PT0SOpcEZGEXoXBGZdnLgruVmqlxl+CxFcyrTwpPZjJeC9CHEeGzZwfjx/PIrYAKovwAAAAACzZLVW4VIdWSkvr/4WErGSa51V7M2K8WWctcP4aKDGJK+WQMJxxTW9YGZBMax53OODa3NoxPpaHz59+Xmz5lKzp1oDq5Nv/UR7YS8jlHVycX+oj2Ql5ElPiR+ZDifBl8i5AAtjngAAAAAAQySGAUW9YZteqvnb++n8mmdjKalm1s7ZOCf1Wh/g45UWrKbR0dEtqqL+H/AACMlL7YamdSpy3wj98DaOJkzaM+k4vXTlh+16V44nbLiuW1FM5u6GxZKPxByr/s7qUZYa4NTXBa/DE6pi14nso7UXE8hNwkpLyPOyDqXzdroScor+nJ6PlfVf4OWVE4uLyZ0VdkbIqUdAADEzAB0Lpu6VeenRCPSlv8AlXaZRi5PJGE5qEXKWh3cmrM4UnJ66ksf2rQvydo+cIKKSSwSWCS2I+hbwjsxSOdsm7JuT8wfKvUzIyl1Yyf2WJ9Tk5Q2j2dGS2z5i4e94CctmLYrg5zUV5lPxIAKY6UHcyWhjUnLqww+rf8Ag4ZaMlqWFOc3788FwivVsnw6zsRqY2WzQ/jw/k74ALQogAAAAAAAADh5TWbPpKaWmEv+MtD8cCqHoNakpxlF6pJxfBoolpoOnOUZa4trjuZoYuH6lLmW/o+zODhyPiADTLE6Fy2z2NVN9CfMl2J6n9GXbE85LVk/ePtIqnN8+K5rfvRX5Ru4W33GVmPoz/2R+v3O6CCTeKo+VSnGacZJNNYNPSmjgW7J3FuVGSXyy1LgyyAwnXGftIkqunU84so1S6bRF6acn3ed5EU7qtEtVOa7yzfMvQIPVIc2bn+Rsy0X8/crNiydeh1pLDqQ28X6Fho0YwiowSjFakj6gmhVGHso1Lbp2vOb+wAIxJCIhlPv+2e1q5sejDmrtl7z/H0O1ft4qjHNi/6k1o+WO2RUTSxVnuL6lpgKP3ZfT7kAA0S0JRertoeypQhtUVj3npfiyr3FZPa1U2ubDnvitS+/kXM38JDg5FT6RszagvLiSADcK0AAAAAAAAAhleyksGclWitMdEkursl9PyWI+c4KSaelPQ1vRhZBTi0ySqx1zUkeeA6F73e6E9HQli4v+19qOeVMouLyZ0MJqcVKOjBnCTi1KLwaeKa1pmAMTMt90XxGslCeEaiXBT7V29h18TzpM7V33/OGEavPj1l0lx3m9VilpPuVOIwLT2quxbAalmttKssac1L5ccJLitZtG4mnxRXNNPJkggHp4SCMTXtNsp0ljOUY9jel8FrYby1PUm3kjYxOVet6woJpYSqNaI7F2s5l4ZQyljGis1deXSfBbDhyk222229Lb0ts07cSlwh3LDD4Fv8AVZwXImtUlOTlJ50pPFtmABolskkskCUm9C2g72T124tVZrmroLrPrcDOuDnLZRHdaqoOTOtc1i9hTSfSlzpcd30OkQkSW0YqKyRz0pOUnJ6sAA9MQAAAAAAAAAQ0SADWtllhWg4TWKf3T2NdpTLwsM7PPNlpT0xlskvXsL4a1qssKsHGSxT+6e9bmQXUqxfE2sNiXS+On5oUEHRvO6qlB49KnsmtnZLcc4rZRcXky7hOM1tRfAAAxMyVo0rQ95uUb1tENCqSa3S53maQMlJx0ZjKEZ+0szsQyitC1qnLjF4+DJllFaHqVNftfqcYGe+s6iL1WnpRv1b3tE9c2u7zfI0pSbeLbb3vSzEGDk5asljCMPZWQABiZAEnbuq45TwnVWbDZHVKXHcjOEJTeSI7bYVR2pM+FzXU6zz5pqmn/N7l2FupwUUkkkksElsQpwUUkkkksElsRmWdVSrWRQ33yulm9PJEgAlIQAAAAAAAAAAAAAAAQSADCUU000mnselM4dvyfjPGVJ5r6r6L4bjvgwnXGaykSV2zrecWef2myVKTwnFx7XqfB6mfA9CqU4yTUkmnrTWKOXabhoT0xUoP5XivszTnhH7rLKv0jH9xZfIqIO5XycqroyjLsbcWac7mtMfcb7rT/JA6bFqjbjiaZaSX9f2c8G27utC/Sq/SDfkTG7bQ/wBKp9YteZhsS5PsSb2HUu6NMHShcdpl7ub3pJG9Ryak/wDcqJdkFj4szVNj8iKWKpjrJfTiV83LFdtav0Y83ry5sf8AP0LRZrns9PB5uc170+d4avA6KRsQwnWzTt9I+Va+rOXd1zU6OEpf1J9ZrRHuo6qRINyMVFZIrpzlN7UnmwADIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/Z",
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
                Connect Wallet
              </Button>
            )}
          </CardContent>
        </Card>
        <BrightIdConnectSheet
          modalOpen={brightIdSheetOpen}
          email={email}
          closeModal={() => {
            setBrightIdSheetOpen(false)
          }}
        />
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
