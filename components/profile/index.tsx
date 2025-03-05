// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-toastify"
import dayjs from "dayjs"

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
  const { email = "", phone } = useSelector((state: any) => state?.user) ?? {}
  const dispatch = useDispatch()
  const { supabaseUser } = useAuth({})

  // State for basic user and wallet details
  const [userState, setUserState] = useState<any>({})
  const [walletState, setWalletState] = useState<any>({})
  const [exportPrivateKey, setExportPrivateKey] = useState(undefined)

  // State for stamp wallets (from supabase)
  const [nearAcc, setNearAcc] = useState([])
  const [allNearData, setAllNearData] = useState([])
  const [allEvmData, setAllEvmData] = useState([])

  // State for blockchain wallets (from dedicated tables)
  const [ethWallets, setEthWallets] = useState([])
  const [nearWallets, setNearWallets] = useState([])
  const [suiWallets, setSuiWallets] = useState([])

  // State to track revealed keys (walletId => private_key)
  const [revealedKeys, setRevealedKeys] = useState({})

  // Fetch basic user stamps data
  const fetchStamps = useCallback(async () => {
    if (email) {
      const { data: { data: userData } } = await axios.post("/api/supabase/select", {
        match: { email },
        table: "users",
      })
      setUserState(userData?.[0])
    }
    if (phone) {
      const { data: { data: userData } } = await axios.post("/api/supabase/select", {
        match: { phone },
        table: "users",
      })
      setUserState(userData?.[0])
    }
  }, [email, phone])

  // Fetch wallet details from supabase
  const fetchWalletDetails = useCallback(async () => {
    if (email) {
      const { data: { data: wallet_details } } = await axios.post("/api/supabase/select", {
        match: { email },
        table: "wallet_details",
      })
      setWalletState(wallet_details?.[0] || null)
    }
    if (phone) {
      const { data: { data: wallet_details_phone } } = await axios.post("/api/supabase/select", {
        match: { phone },
        table: "wallet_details",
      })
      setWalletState(wallet_details_phone?.[0] || null)
    }
  }, [email, phone])

  useEffect(() => {
    if (email || phone) {
      fetchStamps()
      fetchWalletDetails()
    }
  }, [fetchStamps, fetchWalletDetails, email, phone])

  // Separate function to fetch NEAR stamps (stamptype: 15)
  const fetchNearStamps = useCallback(async () => {
    if (supabaseUser?.id) {
      const { data: { data: nearData } } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 15,
        },
        table: "stamps",
      })
      const nearAddresses = nearData.map((item: any) => item.uniquevalue)
      setNearAcc(nearAddresses)
      setAllNearData(nearData)
    }
  }, [supabaseUser])

  // Separate function to fetch EVM stamps (stamptype: 14)
  const fetchEvmStamps = useCallback(async () => {
    if (supabaseUser?.id) {
      const { data: { data: evmData } } = await axios.post("/api/supabase/select", {
        match: {
          created_by_user_id: supabaseUser.id,
          stamptype: 14,
        },
        table: "stamps",
      })
      const evmAddresses = (evmData ?? []).map((item: any) => item.uniquevalue)
      setAllEvmData(evmAddresses)
    }
  }, [supabaseUser])

  // Updated functions to fetch blockchain wallets using the supabase select endpoint
  const fetchEthWallets = useCallback(async (userId: string) => {
    try {
      const { data: { data: evmData } } = await axios.post("/api/supabase/select", {
        match: { owner_id: userId },
        table: "eth-api-accounts",
      })
      setEthWallets(evmData)
    } catch (error) {
      console.error("Error fetching ETH wallets:", error)
    }
  }, [])

  const fetchNearWallets = useCallback(async (userId: string) => {
    try {
      const { data: { data: nearData } } = await axios.post("/api/supabase/select", {
        match: { owner_id: userId },
        table: "near-api-accounts",
      })
      setNearWallets(nearData)
    } catch (error) {
      console.error("Error fetching NEAR wallets:", error)
    }
  }, [])

  const fetchSuiWallets = useCallback(async (userId: string) => {
    try {
      const { data: { data: suiData } } = await axios.post("/api/supabase/select", {
        match: { owner_id: userId },
        table: "sui-api-accounts",
      })
      setSuiWallets(suiData)
    } catch (error) {
      console.error("Error fetching Sui wallets:", error)
    }
  }, [])

  // useEffect to fetch all stamp and blockchain wallet data once the user is available
  useEffect(() => {
    if (supabaseUser?.id) {
      fetchNearStamps()
      fetchEvmStamps()
      fetchEthWallets(supabaseUser.id)
      fetchNearWallets(supabaseUser.id)
      fetchSuiWallets(supabaseUser.id)
    }
  }, [
    supabaseUser,
    fetchNearStamps,
    fetchEvmStamps,
    fetchEthWallets,
    fetchNearWallets,
    fetchSuiWallets,
  ])

  // Function to fetch a private key using the NEAR stamp data (unchanged)
  const fetchPrivateKeyWithAddress = (nearKey: any) => {
    const stampData = (
      allNearData.find((item: any) => item.uniquevalue === nearKey) || {}
    ).stamp_json?.transaction?.signature
    setExportPrivateKey(stampData)
  }

  // Function to handle private key reveal.
  // This will fetch the user's IP, get the current timestamp,
  // then update the corresponding wallet record with the new event.
  const handleReveal = async (wallet: any, tableName: string) => {
    try {
      // Fetch public IP (you can replace the URL if needed)
      const ipRes = await axios.get("https://api.ipify.org?format=json")
      const ip = ipRes.data.ip

      // Append event to the existing reveal_log array or create a new one.
      const recToAdd = { [tableName]: wallet.id }

      // Update the wallet record in Supabase via your update endpoint.
      await axios.post("/api/supabase/insert", {
        table: 'ip_private_reveal',
        body: { ip, user_id: supabaseUser.id, ...recToAdd },
      })

      // Mark the wallet as revealed by storing its private key in state.
      setRevealedKeys((prev) => ({ ...prev, [wallet.id]: wallet.private_key }))
      toast.success("Private key revealed and logged.")
    } catch (error) {
      console.error("Error revealing private key:", error)
      toast.error("Failed to reveal private key.")
    }
  }

  // WalletTable component now accepts tableName and onReveal props.
  const WalletTable = ({ title, wallets, tableName }) => {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Displaying wallet data fetched from the respective API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wallets && wallets.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-600">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Created At</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Account Address</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Private Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {wallets.map((wallet) => (
                  <tr key={wallet.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{wallet.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {dayjs(wallet.created_at).format("DD MM YYYY")}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{wallet.account_address}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 break-all dark:text-white">
                      {revealedKeys[wallet.id] ? (
                        wallet.private_key
                      ) : (
                        <>
                          {"********"}
                          <Button
                            onClick={() => handleReveal(wallet, tableName)}
                            variant="outline"
                            className="ml-2 text-xs"
                          >
                            Reveal
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No wallet records found.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-3">
      <h1 className="mb-2 text-3xl font-semibold">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trust Score Card */}
        <Card style={{ height: "auto" }}>
          <CardHeader>
            <CardTitle>My Trust Score</CardTitle>
            <CardDescription>Trust score in cubid is a proof of trust</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">87%</p>
          </CardContent>
        </Card>
        {/* Wallets Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle>My Wallets</CardTitle>
            <CardDescription>List of wallets you have connected to cubid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Boolean(userState?.iah) && (
                <Button className="block" variant="outline">
                  NEAR : {userState?.iah}
                </Button>
              )}
              {Boolean(walletState?.["wallet-address"]) && (
                <Button className="block" variant="outline">
                  G$ : {walletState?.["wallet-address"]}
                </Button>
              )}
              {allEvmData.map((item) => (
                <Button key={item} className="block" variant="outline">
                  {item}
                </Button>
              ))}
              {nearAcc.map((item) => (
                <div key={item} className="flex justify-between items-center">
                  <Button variant="outline">{item}</Button>
                  {Boolean(
                    allNearData.find((_: any) => _.uniquevalue === item)
                      ?.stamp_json?.transaction?.signature
                  ) && (
                    <button
                      onClick={() => fetchPrivateKeyWithAddress(item)}
                      className="text-white rounded-md bg-blue-600 text-xs p-2 py-1"
                    >
                      Export Private Key
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card> */}
        {/* Language Preferences */}
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
        {/* Login & Security */}
        <Card>
          <CardHeader>
            <CardTitle>Login & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Email : {email}</p>
              <p>Phone : {phone}</p>
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
        {/* Logout Button */}
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
        {/* Sheet for Exporting Private Key (for NEAR stamps) */}
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
              <p>Copy the key if you want to import it to any other Near-wallet.</p>
              <Button
                className="block"
                onClick={() => {
                  navigator.clipboard.writeText(exportPrivateKey)
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
      {/* New Tables for blockchain wallets */}
      <div className="mt-6">
        <WalletTable title="Ethereum Wallets" wallets={ethWallets} tableName="eth_rec" />
        <WalletTable title="NEAR Wallets" wallets={nearWallets} tableName="near_rec" />
        <WalletTable title="Sui Wallets" wallets={suiWallets} tableName="sui_rec" />
      </div>
    </div>
  )
}

export default Profile