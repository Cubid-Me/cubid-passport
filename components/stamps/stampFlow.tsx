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

import { useStamps } from "./../../hooks/useStamps"
import "@near-wallet-selector/modal-ui/styles.css"
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

import { encode_data } from "../../lib/encode_data"
import { supabase } from "../../lib/supabase"
import { BrightIdConnectSheet } from "./brightIdConnectSheet"
import { GooddollarConnect } from "./gooddollarConnect"
import { InstagramConnect } from "./instagramConnect"
import { PhoneNumberConnect } from "./phoneNumberConnect"

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
  if (dataToShare.fractal) {
    delete dataToShare.fractal
    const kycData: any = userState.find((item: any) => item.stamptype == 17)
    dataToShare.kyc = {
      status: kycData.stamp_json.verification_cases[0].status,
      expiry_date: dayjs(kycData.stamp_json.verification_cases[0].created_at)
        .add(1, "year")
        .format("DD/MM/YYYY"),
    }
  }
  return dataToShare
}

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
  {
    local_key: "linkedin_data",
    supabase_key: "linkedin",
    stampTypeId: 22,
    image:
      "https://images-eds-ssl.xboxlive.com/image?url=Q_rwcVSTCIytJ0KOzcjWTYl.n38D8jlKWXJx7NRJmQKBAEDCgtTAQ0JS02UoaiwRCHTTX1RAopljdoYpOaNfVf5nBNvbwGfyR5n4DAs0DsOwxSO9puiT_GgKqinHT8HsW8VYeiiuU1IG3jY69EhnsQ--&format=source",
    title: "Linkedin",
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
  "near-wallet": 7,
  brightid: 8,
  gitcoin: 9,
  instagram: 10,
  phone: 11,
  gooddollar: 12,
  fractal: 17,
  linkedin: 22,
}

export const Stamps = ({
  stampsToAdd,
  fetchAllStamps,
  appId,
  requiredDataAvailable,
  urltoreturn,
  userState,
  fetchUserData,
  isStampOptional,
}: any) => {
  const signInWithSocial = async (socialName: any) => {
    await supabase.auth.signOut()
    localStorage.setItem("socialName", socialName)
    const { data: d, error: e } = await supabase.auth.signInWithOAuth({
      provider: socialName,
      options: {
        redirectTo: `${window.location.href}`,
      },
    })
  }
  useEffect(() => {
    localStorage.removeItem("allow_url")
  }, [])
  console.log( dataToTransform(stampsToAdd, userState as any))

  const [brightIdData, setBrightIdData] = useState(null)
  const [brightIdSheetOpen, setBrightIdSheetOpen] = useState(false)
  const [stampVerified, setStampVerified] = useState<any>(null)
  const [phonenumber, setPhonenumber] = useState<any>(false)
  const [gitcoinStamps, setGitcoinStamps] = useState(false)
  const [instagramShow, setInstagramShow] = useState(false)
  const [stampCategories, setStampCategories] = useState([])
  const [allStamps, setAllStamps] = useState([])
  const [email,setEmail] = useState(false)
  const { stampCollector } = useStamps()
  const { supabaseUser, getUser } = useAuth({ appId })

  useEffect(()=>{
    (async()=>{
      const {email:userEmail} = await getUser();
      setEmail(userEmail)
    })()
  },[getUser])

  const fetchStampData = useCallback(async () => {
    const {
      data: { data },
    } = await axios.post("/api/supabase/select", {
      table: "stamptypes",
    })
    setStampCategories(data)
    const user = await getUser()
    if (user) {
      const {
        data: { data: dbData },
      } = await axios.post(`/api/supabase/select`, {
        table: "stamps",
        match: {
          created_by_user_id: user?.id,
        },
      })
      fetchAllStamps()
      setAllStamps(dbData)
    }
  }, [getUser, fetchAllStamps])

  useEffect(() => {
    fetchStampData()
  }, [fetchStampData])

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
              fetchUserData()
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
    [email, fetchUserData, userState]
  )
  const { address } = useAccount()

  useEffect(() => {
    if (address) {
      connectToWeb3Node(address)
    }
  }, [connectToWeb3Node, address])
  const { getIdForApp } = useCreatedByAppId()

  useEffect(() => {
    if (email) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { user_metadata }: any = session?.user
          const providerKey = localStorage.getItem("socialName") ?? ""
          const stampId = (stampsWithId as any)[providerKey]
          const dbUser = await getUser()
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
          fetchStampData()
          supabase.auth.signOut()
        }
      })
    }
  }, [email, fetchStampData, getIdForApp, getUser, supabaseUser, userState])

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
      if (dataCategory?.[0]?.[1]?.[0] && dbUser?.id) {
        const stampId = (stampsWithId as any)["near-wallet"]

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
      } else {
        toast.error(
          "Please verify yourself with IAH to get a verified stamp with near"
        )
      }
    }
  }, [email, fetchStampData, fetchUserData, getUser, getIdForApp])

  useEffect(() => {
    fetchNearWallet()
  }, [fetchNearWallet])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  useEffect(() => {
    ;(async () => {
      if (localStorage.getItem("kyc_fractal")) {
        const kyc_fractal = JSON.parse(
          localStorage.getItem("kyc_fractal") ?? ""
        )
        const { verification_cases, uid } = kyc_fractal
        const { created_at, status } = verification_cases?.[0]
        const database = {
          uniquehash: await encode_data(uid),
          stamptype: 17,
          created_by_user_id: ((await getUser()) as any).id,
          unencrypted_unique_data: uid,
          type_and_hash: `17 ${await encode_data(uid)}`,
        }
        await axios.post("/api/supabase/insert", {
          table: "uniquestamps",
          body: database,
        })
        const {
          data: { error, data },
        } = await axios.post("/api/supabase/insert", {
          table: "stamps",
          body: {
            created_by_user_id: ((await getUser()) as any).id,
            stamptype: 17,
            created_by_app: appId,
            stamp_json: kyc_fractal,
            user_id_and_uniqueval: `${((await getUser()) as any).id} 17 ${uid}`,
            uniquevalue: uid,
            unique_hash: await encode_data(uid),
            type_and_uniquehash: `17 ${await encode_data(uid)}`,
          },
        })
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
        localStorage.removeItem("kyc_fractal")
        fetchStampData()
      }
    })()
  }, [getUser, appId, fetchStampData])

  const { open } = useWeb3Modal()

  function camelCaseToWords(s: string) {
    const result = s?.replace(/([A-Z])/g, " $1")
    return result?.charAt?.(0)?.toUpperCase() + result?.slice?.(1)
  }

  const doesStampExist = (stamp_id: number | string) =>
    allStamps?.filter(({ stamptype }) => stamptype == stamp_id)?.[0]
  const stampsToRender: React.JSX.Element[] = []
  const supabaseStamps = socialDataToMap.map((item) => item.supabase_key)
  stampsToRender.push(
    <Card>
      <CardHeader>
        <img
          src={
            "data:image/png;base64,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"
          }
          alt="Image"
          className="mb-1 h-10 w-10 rounded-xl"
        />
        <CardTitle>Linkedin</CardTitle>
        <CardDescription>Connect your Linkedin</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {}}
            variant="secondary"
            style={{ width: "200px", backgroundColor: "#3b82f6" }}
          >
            Connect
          </Button>
          <p className="text-lg font-bold ">(Coming Soon)</p>
        </div>
      </CardContent>
    </Card>
  )
  stampsToAdd.map((_: string) => {
    if (_ === "instagram") {
      stampsToRender.push(
        <Card>
          <CardHeader>
            <img
              src={
                "data:image/jpeg;base64,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"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-xl"
            />
            <CardTitle>Instagram</CardTitle>
            <CardDescription>
              {doesStampExist((stampsWithId as any)["instagram"])
                ? "Instagram Connected"
                : "Connect your instagram"}{" "}
              {isStampOptional[_] ? (
                <span style={{ fontWeight: "bold" }}>(Optional)</span>
              ) : (
                <span style={{ fontWeight: "bold" }}>(Required)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {doesStampExist((stampsWithId as any)["instagram"]) ? (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button>Verified Stamp</Button>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setInstagramShow(true)
                    localStorage.setItem(
                      "allow_url",
                      window.location.href.replace(
                        `${window.location.origin}/allow?`,
                        ""
                      )
                    )
                  }}
                  style={{
                    width: "200px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                  }}
                >
                  Connect Instagram
                </Button>
              )}
              <p className="text-md font-bold">(Coming Soon)</p>
            </div>
          </CardContent>
        </Card>
      )
    } else if (supabaseStamps.includes(_)) {
      const supabaseData = socialDataToMap.filter(
        (item) => item.supabase_key === _
      )[0]
      stampsToRender.push(
        <Card style={{ height: "auto" }}>
          <CardHeader>
            <img
              src={supabaseData.image}
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md"
            />
            <CardTitle>{supabaseData.title}</CardTitle>
            {doesStampExist(
              (stampsWithId as any)[supabaseData.supabase_key]
            ) ? (
              <CardDescription>
                <div className="flex items-center space-x-1">
                  <p>Your {supabaseData.supabase_key} account is verified</p>
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
                Connect your existing account to verify{" "}
                {isStampOptional[_] ? (
                  <span style={{ fontWeight: "bold" }}>(Optional)</span>
                ) : (
                  <span style={{ fontWeight: "bold" }}>(Required)</span>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {doesStampExist(
                (stampsWithId as any)[supabaseData.supabase_key]
              ) ? (
                <Button >Verified Stamp</Button>
              ) : (
                <Button
                  onClick={() => {
                    signInWithSocial(_)
                    localStorage.setItem(
                      "allow_url",
                      window.location.href.replace(
                        `${window.location.origin}/allow?`,
                        ""
                      )
                    )
                  }}
                  style={{
                    width: "200px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                  }}
                >
                  Connect
                </Button>
              )}

              <p className="text-md font-bold ">(Coming Soon)</p>
            </div>
          </CardContent>
        </Card>
      )
    } else if (_ === "phone") {
      stampsToRender.push(
        <Card>
          <CardHeader>
            <img
              src={
                "https://images.unsplash.com/photo-1530319067432-f2a729c03db5?auto=format&fit=crop&q=80&w=2889&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              }
              alt="Image"
              className="mb-1 h-10 w-10 rounded-md object-cover"
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
                Verify your phone number{" "}
                {isStampOptional[_] ? (
                  <span style={{ fontWeight: "bold" }}>(Optional)</span>
                ) : (
                  <span style={{ fontWeight: "bold" }}>(Optional)</span>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {doesStampExist(stampsWithId.phone) ? (
              <></>
            ) : (
              <Button
                onClick={() => {
                  setPhonenumber(true)
                }}
                variant="secondary"
                style={{ width: "200px", backgroundColor: "#3b82f6" }}
              >
                Connect Phone Number
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }
  })

  stampsToRender.push(
    <Card>
      <CardHeader>
        <img
          src={
            "https://img.freepik.com/premium-vector/kyc-know-your-customer-idea-business-identification-finance-safety_100456-10462.jpg"
          }
          alt="Image"
          className="mb-1 h-10 w-10 rounded-xl"
        />
        <CardTitle>Government Issued ID</CardTitle>
        <CardDescription>
          {doesStampExist(17) ? (
            <>
              <div className="flex items-center space-x-1">
                <p>Your have connected with KYC</p>
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
            </>
          ) : (
            "Connect and get verified with KYC"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {doesStampExist(17) ? (
          <></>
        ) : (
          <Button
            onClick={() => {
              localStorage.setItem(
                "allow_url",
                window.location.href.replace(
                  `${window.location.origin}/allow?`,
                  ""
                )
              )
              window.open(
                "https://app.fractal.id/authorize?client_id=Zh7_RqOPeQoV1lZJ_ZUF1b88VGyJwaxzQVQbpvxq4S4&redirect_uri=https%3A%2F%2Fpassport.cubid.me%2F&response_type=code&scope=contact%3Aread%20verification.basic%3Aread%20verification.basic.details%3Aread%20verification.liveness%3Aread%20verification.liveness.details%3Aread",
                "_self"
              )
            }}
            variant="outline"
            style={{ width: "200px", backgroundColor: "#3b82f6" }}
          >
            Connect KYC
          </Button>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="p-3 pb-16">
      <h1 className="mb-1 text-3xl font-semibold">Identity Verification</h1>
      <>
        <h1 className="mb-5 text-xl">
          You need to connect these accounts in order to authorise passport data{" "}
        </h1>
      </>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stampsToRender.map((item) => item)}
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
        <PhoneNumberConnect
          open={phonenumber}
          fetchStamps={() => {
            fetchUserData()
            fetchStampData()
          }}
          appId={appId}
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
          allowPage
          appId={appId}
          onClose={() => {
            setInstagramShow(false)
          }}
        />
      </div>

      <div className="ml-auto mt-4 w-[fit-content]">
        <button
          onClick={() => {
            const jsonString = JSON.stringify(
              dataToTransform(stampsToAdd, userState as any)
            )

            const base64Encoded = btoa(jsonString)
            window.location.href = `${urltoreturn}?data=${base64Encoded}`
            localStorage.clear()
            sessionStorage.clear()
          }}
          disabled={!requiredDataAvailable}
          className={`w-[180px] rounded ${
            !requiredDataAvailable ? "opacity-60" : ""
          } bg-blue-500 p-2 text-xs text-white`}
        >
          Import to 3oC
        </button>
      </div>
    </div>
  )
}
