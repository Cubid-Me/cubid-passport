// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-toastify"

import useAuth from "@/hooks/useAuth"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { logout } from "../../redux/userSlice"

export const Profile = () => {
  const { email = "" } = useSelector((state: any) => state?.user) ?? {}
  const dispatch = useDispatch()
  const [userState, setUserState] = useState<any>({})
  const [walletState, setWalletState] = useState<any>({})
  const [exportPrivateKey, setExportPrivateKey] = useState(undefined)

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
      setWalletState(wallet_details?.[0])
    } else {
      setWalletState(null)
    }
  }, [])

  useEffect(() => {
    if (email) {
      fetchStamps()
      fetchWalletDetails(email)
    }
  }, [fetchStamps, fetchWalletDetails, email])

  const [nearAcc, setNearAcc] = useState([])
  const [allNearData, setAllNearData] = useState([])
  const [allEvmData, setAllEvmData] = useState([])
  const { supabaseUser } = useAuth({})

  const fetchWallets = useCallback(async () => {
    if (supabaseUser?.id) {
      const {
        data: { data },
      } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 15,
        },
        table: "stamps",
      })
      const {
        data: { data: evmData },
      } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 14,
        },
        table: "stamps",
      })
      const allNearAcc = data.map((item: any) => item.uniquevalue)
      setAllEvmData((evmData ?? []).map((item: any) => item.uniquevalue))
      setNearAcc(allNearAcc)
      setAllNearData(data)
    }
  }, [supabaseUser])

  const fetchPrivateKeyWithAddress = (nearKey: any) => {
    console.log(nearKey, allNearData)
    const stampData = (
      allNearData.find((item: any) => item.uniquevalue === nearKey) as any
    )?.stamp_json?.transaction?.signature
    setExportPrivateKey(stampData)
  }

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  return (
    <div className="p-3">
      <h1 className="mb-2 text-3xl font-semibold">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card style={{ height: "auto" }}>
          <CardHeader>
            <CardTitle>My Trust Score</CardTitle>
            <CardDescription>
              Trust score in cubid is a proof of trust
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">87%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My Wallets</CardTitle>
            <CardDescription>
              List of wallets you have connected to cubid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Boolean((userState as any)?.iah) && (
                <Button className="block" variant="outline">
                  NEAR : {(userState as any)?.iah}
                </Button>
              )}
              {Boolean(walletState?.["wallet-address"]) && (
                <Button className="block" variant="outline">
                  G$ : {walletState?.["wallet-address"]}
                </Button>
              )}
              {allEvmData.map((item) => (
                <Button className="block" key={item} variant="outline">
                  {item}
                </Button>
              ))}
              {nearAcc.map((item) => (
                <div className="flex justify-between items-center">
                  <Button className="block" key={item} variant="outline">
                    {item}
                  </Button>
                  {Boolean(
                    (
                      allNearData.find(
                        (_: any) => _.uniquevalue === item
                      ) as any
                    )?.stamp_json?.transaction?.signature
                  ) && (
                    <button
                      onClick={() => {
                        fetchPrivateKeyWithAddress(item)
                      }}
                      className="text-white rounded-md bg-blue-600 text-xs p-2 py-1"
                    >
                      Export Private Key
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card style={{ height: "auto" }}>
          <CardHeader>
            <CardTitle>Language Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="gm">German</SelectItem>
                <SelectItem value="sp">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Email : {email} </p>
              <div className="mt-2 flex items-center gap-2">
                <img
                  alt="image"
                  className="h-20 w-20 rounded"
                  src="https://media.licdn.com/dms/image/C4D0BAQF0BbRWBLibVQ/company-logo_200_200/0/1622628086077?e=2147483647&v=beta&t=z_LYy9iZWArzniYy0I2aWqRgyK6kMTLcRsSuW7dZfq0"
                />
                <p>Enabled Login</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ height: "fit-content", paddingTop: "15px" }}>
          <CardContent>
            <Button
              onClick={() => {
                dispatch(logout())
                window.location.reload()
              }}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
        <Sheet
          open={Boolean(exportPrivateKey)}
          onOpenChange={(value) => {
            if (value === false) {
              setExportPrivateKey(undefined)
            }
          }}
        >
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Export Private Key</SheetTitle>
              <p className="break-all">Copy Private Key : {exportPrivateKey}</p>
              <p>
                Copy they key if you want to import it to any other Near-wallet.
              </p>
              <Button
                className="block"
                onClick={() => {
                  navigator.clipboard.writeText(exportPrivateKey as any)
                  toast.success("Successfully copied private key")
                }}
                variant="outline"
              >
                Copy
              </Button>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
