/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useCallback, useEffect, useState } from "react"
import { newKitFromWeb3 } from "@celo/contractkit"
import { ClaimSDK } from "@gooddollar/web3sdk-v2"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import axios from "axios"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import { useAccount } from "wagmi"
import Web3 from "web3"

import { gooddollar_ABI, pohABI } from "../../lib/contract_abi"
import { useStamps } from "./../../hooks/useStamps"
import "@near-wallet-selector/modal-ui/styles.css"
import { encode_data } from "@/lib/encode_data"
import useAuth from "@/hooks/useAuth"
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
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"

const nodeUrl = "https://forno.celo.org"
const goodDollarAddress = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" // replace with GoodDollar contract address

const web3 = new Web3(nodeUrl)
const kit = newKitFromWeb3(web3 as any)

// Load the GoodDollar contract
const goodDollarContract = new web3.eth.Contract(
  require("@gooddollar/goodcontracts/build/contracts/Identity.json").abi,
  goodDollarAddress
)

export const GooddollarConnect = ({
  isExistingStamp,
  fetchStamps,
  deleteStamp,
}: any) => {
  const [gooddollarConnect, setGooddollarConnect] = useState<any>(false)
  const [gooddolarOpen, setGooddollarOpen] = useState(false)
  const [stepState, setStepState] = useState(0)
  const [whitelisted, setWhitelisted] = useState(false)
  const { open } = useWeb3Modal()
  const { address } = useAccount()
  const authData = useAuth({})
  const { getUser } = authData

  useEffect(() => {
    if (address) {
      ;(async () => {
        try {
          const isWhitelisted = await (goodDollarContract as any).methods
            .isWhitelisted(address)
            .call()
          setWhitelisted(isWhitelisted)
          if (isWhitelisted) {
            await axios.post("/api/supabase/insert", {
              body: {
                email: authData?.user?.email,
                "wallet-address": address,
                wallet_data: {},
              },
              table: "wallet_details",
            })
            const {
              data: { data: supabaseData },
            } = await axios.post("/api/supabase/select", {
              match: { email: authData?.user?.email, identifier: address },
              table: "whitelist",
            })
            if (!supabaseData[0]) {
              await axios.post("/api/supabase/insert", {
                table: "whitelist",
                body: {
                  email: authData?.user?.email,
                  identifier: address,
                },
              })
            } else {
              if (supabaseData?.[0]?.email !== authData?.user?.email) {
                await axios.post("/api/supabase/insert", {
                  table: "blacklist",
                  body: {
                    email: authData?.user?.email,
                    identifier: address,
                  },
                })
              }
            }
            localStorage.deleteItem("connectGooddollar")
          }
        } catch (err) {
          console.log(err)
        }
      })()
    }
  }, [address, authData?.user?.email])

  const [showGooddollarDetails, setShowGooddollarDetails] = useState(false)
  const {getIdForApp} = useCreatedByAppId()

  useEffect(() => {
    if (!localStorage.getItem("gooddollar_connect_flow")) {
      ;(async () => {
        const params = window.location.href?.split("?")
        const userData = await getUser()
        if (params[1]?.includes("gooddollardata") && userData?.email) {
          localStorage.setItem("gooddollar_connect_flow", "true")
          const jsonData = params[1]?.replace("gooddollardata=", "")
          const data = JSON.parse(decodeURIComponent(jsonData).replace("/", ""))
          const gooddollar_data = {
            email: userData?.email,
            "wallet-address": data?.walletAddress?.value,
            wallet_data: data,
          }
          const dbUser = await getUser()
          const database = {
            uniquehash: await encode_data(gooddollar_data["wallet-address"]),
            stamptype: 12,
            created_by_user_id: dbUser?.id,
            unencrypted_unique_data: gooddollar_data["wallet-address"],
            type_and_hash: `12 ${await encode_data(
              gooddollar_data["wallet-address"]
            )}`,
          }
          const dataToSet = {
            created_by_user_id: dbUser?.id,
            created_by_app:await getIdForApp(),
            stamptype: 12,
            uniquevalue: gooddollar_data["wallet-address"],
            unique_hash: await encode_data(gooddollar_data["wallet-address"]),
            stamp_json: gooddollar_data,
            type_and_uniquehash: `12 ${await encode_data(
              gooddollar_data["wallet-address"]
            )}`,
          }
          const {
            data: { error: uniquestampsError },
          } = await axios.post("/api/supabase/insert", {
            table: "uniquestamps",
            body: database,
          })
          if (!uniquestampsError) {
            const {
              data: { error, data: stampData },
            } = await axios.post("/api/supabase/insert", {
              table: "stamps",
              body: dataToSet,
            })

            if (stampData?.[0]?.id) {
              await axios.post("/api/supabase/insert", {
                table: "authorized_dapps",
                body: {
                  dapp_id: 22,
                  dapp_and_stamp_id: `22 ${stampData?.[0]?.id}`,
                  stamp_id: stampData?.[0]?.id,
                  can_read: true,
                  can_update: true,
                  can_delete: true,
                },
              })
            }
            toast.success("Successfully authenticated with gooddollar data")
            fetchStamps()
            setTimeout(() => {
              window.history.replaceState(null, "", "/app")
            }, 1500)
          }
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchWalletDetails = useCallback(async (email: string) => {
    const {
      data: { data: wallet_details },
    } = await axios.post(`/api/supabase/select`, {
      match: {
        email,
      },
      table: "wallet_details",
    })
    if (wallet_details?.[0]) {
      setGooddollarConnect(wallet_details?.[0])
    } else {
      setGooddollarConnect(null)
    }
  }, [])

  useEffect(() => {
    if (authData?.user?.email) fetchWalletDetails(authData?.user?.email)
  }, [fetchWalletDetails, authData?.user?.email])

  useEffect(() => {
    if (localStorage.getItem("connectGooddollar") === "true") {
      setGooddollarOpen(true)
      setStepState(1)
      localStorage.removeItem("connectGooddollar")
    }
  }, [])

  const steps: any = {
    0: (
      <div>
        <p>Which app do you use ?</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            marginTop: 15,
          }}
        >
          <Button
            onClick={() => {
              setStepState(1)
              if (address) {
                localStorage.setItem("connectGooddollar", "true")
              }
            }}
          >
            Gooddapp
          </Button>
          <Button
            onClick={() => {
              setStepState(2)
            }}
          >
            Gooddollar Wallet
          </Button>
        </div>
      </div>
    ),
    1: (
      <>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setStepState(0)
            }}
            variant="ghost"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="22px"
              id="Layer_1"
              fill="#fff"
              version="1.1"
              viewBox="0 0 512 512"
              width="22px"
            >
              <polygon points="352,128.4 319.7,96 160,256 160,256 160,256 319.7,416 352,383.6 224.7,256 " />
            </svg>
          </Button>

          <p>Login with Gooddapp</p>
        </div>
        <div className="mx-auto w-[fit-content]">
          {Boolean(address) ? (
            <div className="text-left">
              <p>Account Connected</p>
              <p>Wallet Address: {address}</p>
              <p>Is Whitelisted : {whitelisted ? "Yes" : "No"}</p>
            </div>
          ) : (
            <button
              onClick={() => {
                open()
              }}
              className="m-2 rounded bg-blue-500 p-2 text-white"
            >
              {" "}
              Connect Gooddollar
            </button>
          )}
        </div>
      </>
    ),
    2: (
      <div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setStepState(0)
            }}
            variant="ghost"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="22px"
              id="Layer_1"
              fill="#fff"
              version="1.1"
              viewBox="0 0 512 512"
              width="22px"
            >
              <polygon points="352,128.4 319.7,96 160,256 160,256 160,256 319.7,416 352,383.6 224.7,256 " />
            </svg>
          </Button>
          <p>Login with Gooddollar Wallet</p>
        </div>
        <div className="mx-auto w-[fit-content]">
          <>
            <button
              onClick={() => {
                window.open(
                  `https://gooddollar-connect.netlify.app?website=${window.location.href}`,
                  "_self"
                )
              }}
              className="m-2 rounded bg-blue-500 p-2 text-white"
            >
              {" "}
              Authorize Gooddollar
            </button>
          </>
        </div>
      </div>
    ),
  }

  return (
    <>
      <Card>
        <CardHeader>
          <img
            src={
              "https://pbs.twimg.com/profile_images/1468937571954737157/Mi7uJpGm_400x400.jpg"
            }
            alt="Image"
            className="mb-1 h-10 w-10 rounded-md"
          />
          <CardTitle>Gooddollar</CardTitle>
          <CardDescription>Connect your web3 gooddollar</CardDescription>
        </CardHeader>
        <CardContent>
          {isExistingStamp ? (
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
                      setShowGooddollarDetails(true)
                    }}
                  >
                    View Stamp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      deleteStamp()
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
                localStorage.removeItem("gooddollar_connect_flow")
                setGooddollarOpen(true)
              }}
              variant="secondary"
              style={{ width: "250px" }}
            >
              Connect Gooddollar Wallet
            </Button>
          )}
        </CardContent>
      </Card>
      <Sheet
        open={gooddolarOpen}
        onOpenChange={(value) => {
          if (value === false) {
            setGooddollarOpen(false)
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-3xl">
              Gooddollar Wallet Connect
            </SheetTitle>
            {isExistingStamp ? <></> : <div>{steps[stepState]}</div>}
          </SheetHeader>
        </SheetContent>
      </Sheet>
      <Sheet
        open={showGooddollarDetails}
        onOpenChange={(value) => {
          if (value === false) {
            setShowGooddollarDetails(false)
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Gooddollar Wallet Details</SheetTitle>
            {gooddollarConnect ? (
              <div className="break-all">
                <p className="text-xl font-bold">Wallet Details</p>
                <p>
                  <span className="font-bold">Wallet Address :</span>{" "}
                  {(gooddollarConnect as any)?.["wallet-address"]}
                </p>
                <p>
                  <span className="font-bold">Name :</span>{" "}
                  {(gooddollarConnect as any)?.["wallet_data"]?.fullName?.value}
                </p>
                <p>
                  <span className="font-bold">Location :</span>{" "}
                  {(gooddollarConnect as any)?.["wallet_data"]?.location?.value}
                </p>
                <p>
                  <span className="font-bold">Is Whitelisted :</span>{" "}
                  {(gooddollarConnect as any)?.["wallet_data"]
                    ?.isAddressWhitelisted?.isVerified
                    ? "Yes"
                    : "No"}
                </p>
              </div>
            ) : (
              <></>
            )}
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  )
}
