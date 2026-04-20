// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from "react"
import axios from "axios"
import dayjs from "dayjs"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-toastify"

import firebase from "@/lib/firebase"
import {
  browserSupportsWebAuthn,
  registerOidcPasskey,
} from "@/lib/oidcPasskeys"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

type OidcConsentSummary = {
  claimClassificationSummary: Array<{
    claim: string
    dataClass: string
  }>
  clientId: string
  clientName: string
  consentId: string
  consentVersion: number
  grantedAt: string
  grantedClaims: string[]
  grantedScopes: string[]
  policyVersion: string
  revokedAt: string | null
  revokedBy: "user" | "operator" | null
}

const formatList = (values: string[]) => {
  if (!values.length) {
    return "None"
  }

  return values.join(", ")
}

export const Profile = () => {
  const { email = "", phone } = useSelector((state: any) => state?.user) ?? {}
  const dispatch = useDispatch()
  const [userState, setUserState] = useState<any>({})
  const [walletState, setWalletState] = useState<any>({})
  const [exportPrivateKey, setExportPrivateKey] = useState(undefined)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [passkeyLabel, setPasskeyLabel] = useState("My passkey")
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [oidcConsents, setOidcConsents] = useState<OidcConsentSummary[]>([])
  const [oidcConsentsLoading, setOidcConsentsLoading] = useState(false)
  const [revokingConsentId, setRevokingConsentId] = useState<string | null>(
    null
  )

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
    if (phone) {
      const {
        data: { data: userData },
      } = await axios.post("/api/supabase/select", {
        match: { phone },
        table: "users",
      })
      setUserState(userData?.[0])
    }
  }, [email, phone])

  const fetchWalletDetails = useCallback(
    async (emailValue: string) => {
      if (emailValue) {
        const {
          data: { data: wallet_details },
        } = await axios.post(`/api/supabase/select`, {
          match: {
            email: emailValue,
          },
          table: "wallet_details",
        })

        if (wallet_details?.[0]) {
          setWalletState(wallet_details?.[0])
          return
        }
      }

      if (phone) {
        const {
          data: { data: wallet_details_phone },
        } = await axios.post(`/api/supabase/select`, {
          match: {
            phone,
          },
          table: "wallet_details",
        })

        if (wallet_details_phone?.[0]) {
          setWalletState(wallet_details_phone?.[0])
          return
        }
      }

      setWalletState(null)
    },
    [phone]
  )

  useEffect(() => {
    if (email || phone) {
      fetchStamps()
      fetchWalletDetails(email)
    }
  }, [fetchStamps, fetchWalletDetails, email, phone])

  const [nearAcc, setNearAcc] = useState([])
  const [allNearData, setAllNearData] = useState([])
  const [allEvmData, setAllEvmData] = useState([])
  const { supabaseUser } = useAuth({})

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn())
  }, [])

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
    const stampData = (
      allNearData.find((item: any) => item.uniquevalue === nearKey) as any
    )?.stamp_json?.transaction?.signature
    setExportPrivateKey(stampData)
  }

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  const registerPasskey = useCallback(async () => {
    setPasskeyLoading(true)
    try {
      await registerOidcPasskey({ credentialLabel: passkeyLabel })
      toast.success("Passkey added to your Cubid account")
    } catch (error: any) {
      console.error(error)
      toast.error(
        error?.response?.data?.error_description ??
          "Unable to add a passkey. Sign in through Login with Cubid first, then try again."
      )
    } finally {
      setPasskeyLoading(false)
    }
  }, [passkeyLabel])

  const getOidcAuthHeaders = useCallback(async () => {
    const currentUser = firebase.auth().currentUser

    if (!currentUser) {
      throw new Error("You must be signed in to manage Login with Cubid access")
    }

    const token = await currentUser.getIdToken()

    return {
      Authorization: `Bearer ${token}`,
    }
  }, [])

  const fetchOidcConsents = useCallback(async () => {
    if (!email && !phone) {
      setOidcConsents([])
      return
    }

    setOidcConsentsLoading(true)
    try {
      const headers = await getOidcAuthHeaders()
      const { data } = await axios.post<{ data: OidcConsentSummary[] }>(
        "/api/oidc/consents/list",
        {},
        { headers }
      )
      setOidcConsents(data.data ?? [])
    } catch (error) {
      console.error(error)
      toast.error("Failed to load Login with Cubid access")
    } finally {
      setOidcConsentsLoading(false)
    }
  }, [email, phone, getOidcAuthHeaders])

  useEffect(() => {
    fetchOidcConsents()
  }, [fetchOidcConsents])

  const revokeOidcConsent = useCallback(
    async (consent: OidcConsentSummary) => {
      if (
        !window.confirm(
          `Revoke Login with Cubid access for ${consent.clientName}?`
        )
      ) {
        return
      }

      setRevokingConsentId(consent.consentId)
      try {
        const headers = await getOidcAuthHeaders()
        await axios.post(
          "/api/oidc/consents/revoke",
          { consentId: consent.consentId },
          { headers }
        )
        toast.success("Login with Cubid access revoked")
        await fetchOidcConsents()
      } catch (error) {
        console.error(error)
        toast.error("Failed to revoke Login with Cubid access")
      } finally {
        setRevokingConsentId(null)
      }
    },
    [fetchOidcConsents, getOidcAuthHeaders]
  )

  return (
    <div className="p-3">
      <h1 className="mb-2 text-3xl font-semibold">Profile</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div className="flex items-center justify-between">
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
                      className="rounded-md bg-blue-600 p-2 py-1 text-xs text-white"
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
              <p>Phone : {phone} </p>
              <div className="mt-4 rounded-lg border p-3">
                <p className="text-sm font-semibold">Passkeys</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a phishing-resistant passkey after a Login with Cubid
                  verification. Email and phone OTP stay available for bootstrap
                  and recovery.
                </p>
                <Input
                  className="mt-3"
                  value={passkeyLabel}
                  onChange={(event) => setPasskeyLabel(event.target.value)}
                  placeholder="Passkey label"
                />
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={registerPasskey}
                  disabled={!passkeySupported || passkeyLoading}
                >
                  {passkeyLoading ? "Creating passkey..." : "Create passkey"}
                </Button>
                {!passkeySupported && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    This browser does not support passkeys.
                  </p>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <img
                  alt="image"
                  className="size-20 rounded"
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
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Login with Cubid access</CardTitle>
            <CardDescription>
              Manage apps that can use your Cubid identity through OIDC sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button
                disabled={oidcConsentsLoading}
                onClick={fetchOidcConsents}
                variant="outline"
              >
                {oidcConsentsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {oidcConsentsLoading && oidcConsents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Loading connected apps...
              </p>
            )}
            {!oidcConsentsLoading && oidcConsents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No apps currently have Login with Cubid access.
              </p>
            )}
            <div className="space-y-3">
              {oidcConsents.map((consent) => {
                const isRevoked = Boolean(consent.revokedAt)

                return (
                  <div
                    key={consent.consentId}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {consent.clientName}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              isRevoked
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isRevoked ? "Revoked" : "Active"}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {consent.clientId}
                        </p>
                      </div>
                      {!isRevoked && (
                        <Button
                          disabled={revokingConsentId === consent.consentId}
                          onClick={() => revokeOidcConsent(consent)}
                          variant="outline"
                        >
                          {revokingConsentId === consent.consentId
                            ? "Revoking..."
                            : "Revoke access"}
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Scopes:</span>{" "}
                        {formatList(consent.grantedScopes)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Claims:</span>{" "}
                        {formatList(consent.grantedClaims)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Policy:</span>{" "}
                        {consent.policyVersion}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Version:</span>{" "}
                        {consent.consentVersion}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Granted:</span>{" "}
                        {dayjs(consent.grantedAt).format("YYYY-MM-DD HH:mm")}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Revoked:</span>{" "}
                        {consent.revokedAt
                          ? `${dayjs(consent.revokedAt).format(
                              "YYYY-MM-DD HH:mm"
                            )} by ${consent.revokedBy}`
                          : "No"}
                      </p>
                    </div>

                    {consent.claimClassificationSummary.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Data classifications
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {consent.claimClassificationSummary.map((entry) => (
                            <span
                              key={`${consent.consentId}-${entry.claim}`}
                              className="rounded-full bg-muted px-3 py-1 text-xs"
                            >
                              {entry.claim}: {entry.dataClass}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
