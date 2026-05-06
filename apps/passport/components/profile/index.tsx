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
import {
  findPassportUserByIdentity,
  findPassportWalletDetailsByIdentity,
  listPassportStampsByUser,
} from "@/lib/passportDataApi"
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

type AppDisclosureGrantSummary = {
  appName: string
  appScopedSubject: string | null
  claimClassificationSummary: Array<{
    claim: string
    dataClass: string
  }>
  consentVersion: number
  dappId: string
  dappUserUuid: string | null
  grantId: string
  grantedAt: string
  grantedClaims: string[]
  grantedScopes: string[]
  policyVersion: string
  revokedAt: string | null
  revokedBy: "user" | "operator" | "system" | null
  source: "allow_page"
}

type SiwcAccountSummary = {
  accountId: string
  accountStatus: string
  chain: string
  createdAt: string
  custodyEnabled: boolean
  custodyStatus: string
  dappId: string
  dappName: string
  dappUserAccountId: string
  dappUserUuid: string
  label: string | null
  linkStatus: string
  policyStatus: string
  policyVersion: number
  publicAddress: string
  requiredAcr: "urn:cubid:acr:passkey" | null
  sandboxMode: boolean
  signingEnabled: boolean
  updatedAt: string
}

type PasskeyDeviceSummary = {
  authenticatorAttachment: string | null
  backupEligible: boolean
  backupState: boolean
  createdAt: string
  deviceId: string
  label: string
  lastAuthenticatedAt: string | null
  revokedAt: string | null
  revokedBy: "user" | "operator" | "system" | null
  signCount: number
  transports: string[]
  updatedAt: string
}

type ActorProfileSummary = {
  actorType: "human" | "agent" | "organization"
  agentAffiliation: {
    affiliationType: "standalone" | "human_supported" | "organization_supported"
    description?: string | null
    organizationSubjectKey?: string | null
    supportedHumanSubjectKey?: string | null
  } | null
  createdAt: string | null
  displayName: string | null
  organizationKind:
    | "formal_organization"
    | "team"
    | "group"
    | "network"
    | "community"
    | "collective"
    | "other"
    | null
  updatedAt: string | null
  validationPolicy: {
    description: string
    personhoodScoreEligible: boolean
    socialStampConflictPrevention: boolean
    stampClaimEligible: boolean
    validationIntensity: "deep_human" | "limited_generic" | "none"
  }
}

const actorTypeLabels = {
  agent: "Agent",
  human: "Human",
  organization: "Organization",
}

const organizationKindLabels = {
  collective: "Collective",
  community: "Community",
  formal_organization: "Formal organization",
  group: "Group",
  network: "Network",
  other: "Other",
  team: "Team",
}

const agentAffiliationLabels = {
  human_supported: "Supports one human",
  organization_supported: "Belongs to an organization",
  standalone: "Standalone agent",
}

const actorValidationPolicies = {
  agent: {
    description:
      "Agents self-identify and may claim stamps, but do not receive bespoke personhood validation by default.",
    personhoodScoreEligible: false,
    stampClaimEligible: true,
    validationIntensity: "limited_generic",
  },
  human: {
    description:
      "Humans are the primary proof-of-personhood subject and receive deep validation and scoring.",
    personhoodScoreEligible: true,
    stampClaimEligible: true,
    validationIntensity: "deep_human",
  },
  organization: {
    description:
      "Organizations include teams, groups, networks, communities, collectives, and formal entities; validation is generic by default.",
    personhoodScoreEligible: false,
    stampClaimEligible: true,
    validationIntensity: "limited_generic",
  },
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
  const [nearTransactionSignature, setNearTransactionSignature] =
    useState<string | undefined>(undefined)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [passkeyLabel, setPasskeyLabel] = useState("My passkey")
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyDevices, setPasskeyDevices] = useState<PasskeyDeviceSummary[]>(
    []
  )
  const [passkeyDevicesLoading, setPasskeyDevicesLoading] = useState(false)
  const [passkeyRenameLabels, setPasskeyRenameLabels] = useState<
    Record<string, string>
  >({})
  const [renamingPasskeyId, setRenamingPasskeyId] = useState<string | null>(
    null
  )
  const [revokingPasskeyId, setRevokingPasskeyId] = useState<string | null>(
    null
  )
  const [oidcConsents, setOidcConsents] = useState<OidcConsentSummary[]>([])
  const [oidcConsentsLoading, setOidcConsentsLoading] = useState(false)
  const [revokingConsentId, setRevokingConsentId] = useState<string | null>(
    null
  )
  const [appDisclosureGrants, setAppDisclosureGrants] = useState<
    AppDisclosureGrantSummary[]
  >([])
  const [appDisclosureGrantsLoading, setAppDisclosureGrantsLoading] =
    useState(false)
  const [revokingAppDisclosureGrantId, setRevokingAppDisclosureGrantId] =
    useState<string | null>(null)
  const [siwcAccounts, setSiwcAccounts] = useState<SiwcAccountSummary[]>([])
  const [siwcAccountsLoading, setSiwcAccountsLoading] = useState(false)
  const [actorProfile, setActorProfile] = useState<ActorProfileSummary | null>(
    null
  )
  const [actorProfileLoading, setActorProfileLoading] = useState(false)
  const [actorProfileSaving, setActorProfileSaving] = useState(false)
  const [actorType, setActorType] = useState<
    "human" | "agent" | "organization"
  >("human")
  const [actorDisplayName, setActorDisplayName] = useState("")
  const [organizationKind, setOrganizationKind] =
    useState<NonNullable<ActorProfileSummary["organizationKind"]>>("other")
  const [agentAffiliationType, setAgentAffiliationType] = useState<
    NonNullable<ActorProfileSummary["agentAffiliation"]>["affiliationType"]
  >("standalone")
  const [agentSupportedHumanSubjectKey, setAgentSupportedHumanSubjectKey] =
    useState("")
  const [agentOrganizationSubjectKey, setAgentOrganizationSubjectKey] =
    useState("")
  const [agentAffiliationDescription, setAgentAffiliationDescription] =
    useState("")

  const fetchStamps = useCallback(async () => {
    if (email) {
      setUserState(await findPassportUserByIdentity({ email }))
    }
    if (phone) {
      setUserState(await findPassportUserByIdentity({ phone }))
    }
  }, [email, phone])

  const fetchWalletDetails = useCallback(
    async (emailValue: string) => {
      if (emailValue) {
        const wallet_details = await findPassportWalletDetailsByIdentity({
          email: emailValue,
        })

        if (wallet_details) {
          setWalletState(wallet_details)
          return
        }
      }

      if (phone) {
        const wallet_details_phone = await findPassportWalletDetailsByIdentity({
          phone,
        })

        if (wallet_details_phone) {
          setWalletState(wallet_details_phone)
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
      const data = await listPassportStampsByUser({
        stampTypeIds: [15],
        userId: supabaseUser.id,
      })
      const evmData = await listPassportStampsByUser({
        stampTypeIds: [14],
        userId: supabaseUser.id,
      })
      const allNearAcc = data.map((item: any) => item.uniquevalue)
      setAllEvmData((evmData ?? []).map((item: any) => item.uniquevalue))
      setNearAcc(allNearAcc)
      setAllNearData(data)
    }
  }, [supabaseUser])

  const showNearTransactionSignature = (nearKey: any) => {
    const transactionSignature = (
      allNearData.find((item: any) => item.uniquevalue === nearKey) as any
    )?.stamp_json?.transaction?.signature
    setNearTransactionSignature(transactionSignature)
  }

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

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

  const applyActorProfileFormState = useCallback(
    (profile: ActorProfileSummary) => {
      setActorProfile(profile)
      setActorType(profile.actorType)
      setActorDisplayName(profile.displayName ?? "")
      setOrganizationKind(profile.organizationKind ?? "other")
      setAgentAffiliationType(
        profile.agentAffiliation?.affiliationType ?? "standalone"
      )
      setAgentSupportedHumanSubjectKey(
        profile.agentAffiliation?.supportedHumanSubjectKey ?? ""
      )
      setAgentOrganizationSubjectKey(
        profile.agentAffiliation?.organizationSubjectKey ?? ""
      )
      setAgentAffiliationDescription(
        profile.agentAffiliation?.description ?? ""
      )
    },
    []
  )

  const fetchActorProfile = useCallback(async () => {
    if (!firebase.auth().currentUser) {
      return
    }

    setActorProfileLoading(true)
    try {
      const headers = await getOidcAuthHeaders()
      const { data } = await axios.post<{ data: ActorProfileSummary }>(
        "/api/actors/profile/get",
        {},
        { headers }
      )
      applyActorProfileFormState(data.data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load identity type")
    } finally {
      setActorProfileLoading(false)
    }
  }, [applyActorProfileFormState, getOidcAuthHeaders])

  useEffect(() => {
    fetchActorProfile()
  }, [fetchActorProfile])

  const saveActorProfile = useCallback(async () => {
    setActorProfileSaving(true)
    try {
      const headers = await getOidcAuthHeaders()
      const agentAffiliation =
        actorType === "agent"
          ? {
              affiliationType: agentAffiliationType,
              description: agentAffiliationDescription || null,
              organizationSubjectKey:
                agentAffiliationType === "organization_supported"
                  ? agentOrganizationSubjectKey || null
                  : null,
              supportedHumanSubjectKey:
                agentAffiliationType === "human_supported"
                  ? agentSupportedHumanSubjectKey || null
                  : null,
            }
          : null
      const payload = {
        actorType,
        agentAffiliation,
        displayName: actorDisplayName || null,
        organizationKind: actorType === "organization" ? organizationKind : null,
      }
      const { data } = await axios.post<{ data: ActorProfileSummary }>(
        "/api/actors/profile/upsert",
        payload,
        { headers }
      )
      applyActorProfileFormState(data.data)
      toast.success("Identity type saved")
    } catch (error: any) {
      console.error(error)
      toast.error(
        error?.response?.data?.error?.message ?? "Failed to save identity type"
      )
    } finally {
      setActorProfileSaving(false)
    }
  }, [
    actorDisplayName,
    actorType,
    agentAffiliationDescription,
    agentAffiliationType,
    agentOrganizationSubjectKey,
    agentSupportedHumanSubjectKey,
    applyActorProfileFormState,
    getOidcAuthHeaders,
    organizationKind,
  ])

  const fetchPasskeyDevices = useCallback(async () => {
    if (!email && !phone) {
      setPasskeyDevices([])
      setPasskeyRenameLabels({})
      return
    }

    setPasskeyDevicesLoading(true)
    try {
      const headers = await getOidcAuthHeaders()
      const { data } = await axios.post<{ data: PasskeyDeviceSummary[] }>(
        "/api/oidc/passkeys/list",
        {},
        { headers }
      )
      const devices = data.data ?? []
      setPasskeyDevices(devices)
      setPasskeyRenameLabels(
        devices.reduce<Record<string, string>>((labels, device) => {
          labels[device.deviceId] = device.label
          return labels
        }, {})
      )
    } catch (error) {
      console.error(error)
      toast.error("Failed to load passkey devices")
    } finally {
      setPasskeyDevicesLoading(false)
    }
  }, [email, phone, getOidcAuthHeaders])

  useEffect(() => {
    fetchPasskeyDevices()
  }, [fetchPasskeyDevices])

  const registerPasskey = useCallback(async () => {
    setPasskeyLoading(true)
    try {
      await registerOidcPasskey({ credentialLabel: passkeyLabel })
      toast.success("Passkey added to your Cubid account")
      await fetchPasskeyDevices()
    } catch (error: any) {
      console.error(error)
      toast.error(
        error?.response?.data?.error_description ??
          "Unable to add a passkey. Sign in through Login with Cubid first, then try again."
      )
    } finally {
      setPasskeyLoading(false)
    }
  }, [fetchPasskeyDevices, passkeyLabel])

  const renamePasskey = useCallback(
    async (device: PasskeyDeviceSummary) => {
      const label = passkeyRenameLabels[device.deviceId]?.trim()
      if (!label) {
        toast.error("Passkey label is required")
        return
      }

      setRenamingPasskeyId(device.deviceId)
      try {
        const headers = await getOidcAuthHeaders()
        await axios.post(
          "/api/oidc/passkeys/rename",
          { deviceId: device.deviceId, label },
          { headers }
        )
        toast.success("Passkey renamed")
        await fetchPasskeyDevices()
      } catch (error) {
        console.error(error)
        toast.error("Failed to rename passkey")
      } finally {
        setRenamingPasskeyId(null)
      }
    },
    [fetchPasskeyDevices, getOidcAuthHeaders, passkeyRenameLabels]
  )

  const revokePasskey = useCallback(
    async (device: PasskeyDeviceSummary) => {
      const activePasskeyCount = passkeyDevices.filter(
        (entry) => !entry.revokedAt
      ).length
      const warning =
        activePasskeyCount <= 1
          ? "This is your last active passkey. Passkey-required Login with Cubid requests will not work until you create another passkey. Revoke it anyway?"
          : `Revoke ${device.label}?`

      if (!window.confirm(warning)) {
        return
      }

      setRevokingPasskeyId(device.deviceId)
      try {
        const headers = await getOidcAuthHeaders()
        await axios.post(
          "/api/oidc/passkeys/revoke",
          { deviceId: device.deviceId },
          { headers }
        )
        toast.success("Passkey revoked")
        await fetchPasskeyDevices()
      } catch (error) {
        console.error(error)
        toast.error("Failed to revoke passkey")
      } finally {
        setRevokingPasskeyId(null)
      }
    },
    [fetchPasskeyDevices, getOidcAuthHeaders, passkeyDevices]
  )

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

  const fetchAppDisclosureGrants = useCallback(async () => {
    if (!email && !phone) {
      setAppDisclosureGrants([])
      return
    }

    setAppDisclosureGrantsLoading(true)
    try {
      const headers = await getOidcAuthHeaders()
      const { data } = await axios.post<{ data: AppDisclosureGrantSummary[] }>(
        "/api/disclosures/app-grants/list",
        {},
        { headers }
      )
      setAppDisclosureGrants(data.data ?? [])
    } catch (error) {
      console.error(error)
      toast.error("Failed to load app disclosure grants")
    } finally {
      setAppDisclosureGrantsLoading(false)
    }
  }, [email, phone, getOidcAuthHeaders])

  useEffect(() => {
    fetchAppDisclosureGrants()
  }, [fetchAppDisclosureGrants])

  const revokeAppDisclosureGrant = useCallback(
    async (grant: AppDisclosureGrantSummary) => {
      if (
        !window.confirm(
          `Revoke Allow Page access for ${grant.appName}? This can remove shared stamp permissions for that app.`
        )
      ) {
        return
      }

      setRevokingAppDisclosureGrantId(grant.grantId)
      try {
        const headers = await getOidcAuthHeaders()
        await axios.post(
          "/api/disclosures/app-grants/revoke",
          { grantId: grant.grantId },
          { headers }
        )
        toast.success("App disclosure grant revoked")
        await fetchAppDisclosureGrants()
      } catch (error) {
        console.error(error)
        toast.error("Failed to revoke app disclosure grant")
      } finally {
        setRevokingAppDisclosureGrantId(null)
      }
    },
    [fetchAppDisclosureGrants, getOidcAuthHeaders]
  )

  const fetchSiwcAccounts = useCallback(async () => {
    if (!email && !phone) {
      setSiwcAccounts([])
      return
    }

    setSiwcAccountsLoading(true)
    try {
      const headers = await getOidcAuthHeaders()
      const { data } = await axios.post<{ data: SiwcAccountSummary[] }>(
        "/api/siwc/accounts/list",
        {},
        { headers }
      )
      setSiwcAccounts(data.data ?? [])
    } catch (error) {
      console.error(error)
      toast.error("Failed to load app-scoped accounts")
    } finally {
      setSiwcAccountsLoading(false)
    }
  }, [email, phone, getOidcAuthHeaders])

  useEffect(() => {
    fetchSiwcAccounts()
  }, [fetchSiwcAccounts])

  const selectedActorPolicy = actorValidationPolicies[actorType]

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
                        showNearTransactionSignature(item)
                      }}
                      className="rounded-md bg-blue-600 p-2 py-1 text-xs text-white"
                    >
                      View transaction signature
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Identity type</CardTitle>
            <CardDescription>
              Tell Cubid whether this account represents a human, an agent, or
              an organization. Humans receive the deepest proof-of-personhood
              scoring; agents and organizations can still claim stamps so those
              accounts are not double-counted for human scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="actor-display-name">
                  Display name
                </label>
                <Input
                  id="actor-display-name"
                  value={actorDisplayName}
                  onChange={(event) => setActorDisplayName(event.target.value)}
                  placeholder="Name shown in Cubid trust contexts"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Account represents</p>
                <Select value={actorType} onValueChange={setActorType}>
                  <SelectTrigger aria-label="Account represents">
                    <SelectValue placeholder="Choose identity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(actorTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {actorType === "organization" && (
                <div>
                  <p className="text-sm font-medium">Organization kind</p>
                  <Select
                    value={organizationKind}
                    onValueChange={setOrganizationKind}
                  >
                    <SelectTrigger aria-label="Organization kind">
                      <SelectValue placeholder="Choose organization kind" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(organizationKindLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {actorType === "agent" && (
                <>
                  <div>
                    <p className="text-sm font-medium">Agent relationship</p>
                    <Select
                      value={agentAffiliationType}
                      onValueChange={(value) => {
                        setAgentAffiliationType(value)
                        setAgentSupportedHumanSubjectKey("")
                        setAgentOrganizationSubjectKey("")
                      }}
                    >
                      <SelectTrigger aria-label="Agent relationship">
                        <SelectValue placeholder="Choose relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(agentAffiliationLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {agentAffiliationType === "human_supported" && (
                    <div>
                      <label
                        className="text-sm font-medium"
                        htmlFor="agent-human-subject"
                      >
                        Supported human reference
                      </label>
                      <Input
                        id="agent-human-subject"
                        value={agentSupportedHumanSubjectKey}
                        onChange={(event) =>
                          setAgentSupportedHumanSubjectKey(event.target.value)
                        }
                        placeholder="Optional human subject reference"
                      />
                    </div>
                  )}
                  {agentAffiliationType === "organization_supported" && (
                    <div>
                      <label
                        className="text-sm font-medium"
                        htmlFor="agent-organization-subject"
                      >
                        Organization reference
                      </label>
                      <Input
                        id="agent-organization-subject"
                        value={agentOrganizationSubjectKey}
                        onChange={(event) =>
                          setAgentOrganizationSubjectKey(event.target.value)
                        }
                        placeholder="Optional organization reference"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="agent-affiliation-description"
                    >
                      Relationship note
                    </label>
                    <Input
                      id="agent-affiliation-description"
                      value={agentAffiliationDescription}
                      onChange={(event) =>
                        setAgentAffiliationDescription(event.target.value)
                      }
                      placeholder="Optional context for this agent"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">
                {actorTypeLabels[actorType]} policy
              </p>
              <p className="mt-1 text-muted-foreground">
                {selectedActorPolicy.description}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <span className="rounded-full bg-background px-3 py-2">
                  Validation: {selectedActorPolicy.validationIntensity}
                </span>
                <span className="rounded-full bg-background px-3 py-2">
                  Personhood score:{" "}
                  {selectedActorPolicy.personhoodScoreEligible
                    ? "eligible"
                    : "not eligible"}
                </span>
                <span className="rounded-full bg-background px-3 py-2">
                  Stamp claims:{" "}
                  {selectedActorPolicy.stampClaimEligible
                    ? "available"
                    : "not available"}
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                disabled={actorProfileSaving || actorProfileLoading}
                onClick={saveActorProfile}
              >
                {actorProfileSaving ? "Saving..." : "Save identity type"}
              </Button>
              <Button
                disabled={actorProfileLoading}
                onClick={fetchActorProfile}
                variant="outline"
              >
                {actorProfileLoading ? "Refreshing..." : "Refresh"}
              </Button>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {actorProfile?.updatedAt
                  ? `Last updated ${dayjs(actorProfile.updatedAt).format(
                      "YYYY-MM-DD HH:mm"
                    )}`
                  : "No saved identity type yet."}
              </p>
            </div>
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
                  Manage phishing-resistant passkeys for Login with Cubid. Phone
                  OTP stays available for recovery, but passkey-required app
                  sign-ins need one active passkey.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={passkeyLabel}
                    onChange={(event) => setPasskeyLabel(event.target.value)}
                    placeholder="Passkey label"
                  />
                  <Button
                    variant="outline"
                    onClick={registerPasskey}
                    disabled={!passkeySupported || passkeyLoading}
                  >
                    {passkeyLoading ? "Creating..." : "Create passkey"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchPasskeyDevices}
                    disabled={passkeyDevicesLoading}
                  >
                    {passkeyDevicesLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
                {!passkeySupported && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    This browser does not support passkeys.
                  </p>
                )}
                {passkeyDevicesLoading && passkeyDevices.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading passkey devices...
                  </p>
                )}
                {!passkeyDevicesLoading && passkeyDevices.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No passkeys are registered yet.
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {passkeyDevices.map((device) => {
                    const isRevoked = Boolean(device.revokedAt)
                    const isRenaming = renamingPasskeyId === device.deviceId
                    const isRevoking = revokingPasskeyId === device.deviceId

                    return (
                      <div
                        key={device.deviceId}
                        className="rounded-lg border bg-background p-3"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                className="max-w-xs"
                                disabled={isRevoked || isRenaming}
                                value={
                                  passkeyRenameLabels[device.deviceId] ??
                                  device.label
                                }
                                onChange={(event) =>
                                  setPasskeyRenameLabels((current) => ({
                                    ...current,
                                    [device.deviceId]: event.target.value,
                                  }))
                                }
                              />
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
                              {device.deviceId}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={isRevoked || isRenaming}
                              onClick={() => renamePasskey(device)}
                              variant="outline"
                            >
                              {isRenaming ? "Renaming..." : "Rename"}
                            </Button>
                            {!isRevoked && (
                              <Button
                                disabled={isRevoking}
                                onClick={() => revokePasskey(device)}
                                variant="outline"
                              >
                                {isRevoking ? "Revoking..." : "Revoke"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                          <p>
                            Attachment:{" "}
                            {device.authenticatorAttachment ?? "unspecified"}
                          </p>
                          <p>Transports: {formatList(device.transports)}</p>
                          <p>
                            Backup:{" "}
                            {device.backupEligible
                              ? device.backupState
                                ? "eligible, backed up"
                                : "eligible, not backed up"
                              : "not eligible"}
                          </p>
                          <p>Sign count: {device.signCount}</p>
                          <p>
                            Created:{" "}
                            {dayjs(device.createdAt).format("YYYY-MM-DD HH:mm")}
                          </p>
                          <p>
                            Last used:{" "}
                            {device.lastAuthenticatedAt
                              ? dayjs(device.lastAuthenticatedAt).format(
                                  "YYYY-MM-DD HH:mm"
                                )
                              : "Never"}
                          </p>
                          <p>
                            Updated:{" "}
                            {dayjs(device.updatedAt).format("YYYY-MM-DD HH:mm")}
                          </p>
                          <p>
                            Revoked:{" "}
                            {device.revokedAt
                              ? `${dayjs(device.revokedAt).format(
                                  "YYYY-MM-DD HH:mm"
                                )} by ${device.revokedBy ?? "unknown"}`
                              : "No"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
            <CardTitle>App disclosure grants</CardTitle>
            <CardDescription>
              Manage non-OIDC apps that received Cubid data through Allow Page
              sharing. Revoking a grant stops that app from seeing the granted
              profile, location, or stamp claims through Cubid APIs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button
                disabled={appDisclosureGrantsLoading}
                onClick={fetchAppDisclosureGrants}
                variant="outline"
              >
                {appDisclosureGrantsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {appDisclosureGrantsLoading && appDisclosureGrants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Loading app disclosure grants...
              </p>
            )}
            {!appDisclosureGrantsLoading &&
              appDisclosureGrants.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No non-OIDC app disclosure grants found.
                </p>
              )}
            <div className="space-y-3">
              {appDisclosureGrants.map((grant) => {
                const isRevoked = Boolean(grant.revokedAt)

                return (
                  <div
                    key={grant.grantId}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{grant.appName}</h3>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              isRevoked
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isRevoked ? "Revoked" : "Active"}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            Allow Page
                          </span>
                        </div>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          Dapp {grant.dappId}
                          {grant.dappUserUuid
                            ? ` · user ${grant.dappUserUuid}`
                            : ""}
                        </p>
                      </div>
                      {!isRevoked && (
                        <Button
                          disabled={
                            revokingAppDisclosureGrantId === grant.grantId
                          }
                          onClick={() => revokeAppDisclosureGrant(grant)}
                          variant="outline"
                        >
                          {revokingAppDisclosureGrantId === grant.grantId
                            ? "Revoking..."
                            : "Revoke access"}
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Scopes:</span>{" "}
                        {formatList(grant.grantedScopes)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Claims:</span>{" "}
                        {formatList(grant.grantedClaims)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Policy:</span>{" "}
                        {grant.policyVersion}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Version:</span>{" "}
                        {grant.consentVersion}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Granted:</span>{" "}
                        {dayjs(grant.grantedAt).format("YYYY-MM-DD HH:mm")}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Revoked:</span>{" "}
                        {grant.revokedAt
                          ? `${dayjs(grant.revokedAt).format(
                              "YYYY-MM-DD HH:mm"
                            )} by ${grant.revokedBy}`
                          : "No"}
                      </p>
                    </div>

                    {grant.claimClassificationSummary.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Data classifications
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {grant.claimClassificationSummary.map((entry) => (
                            <span
                              key={`${grant.grantId}-${entry.claim}`}
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>App-scoped accounts</CardTitle>
            <CardDescription>
              View Cubid-generated accounts that belong to one app at a time.
              These are not universal wallets, and Cubid never shows private
              keys or encrypted custody material here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button
                disabled={siwcAccountsLoading}
                onClick={fetchSiwcAccounts}
                variant="outline"
              >
                {siwcAccountsLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {siwcAccountsLoading && siwcAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Loading app-scoped accounts...
              </p>
            )}
            {!siwcAccountsLoading && siwcAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No app-scoped accounts found.
              </p>
            )}
            <div className="space-y-3">
              {siwcAccounts.map((account) => (
                <div
                  key={account.dappUserAccountId}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{account.dappName}</h3>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase">
                          {account.chain}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            account.signingEnabled &&
                            account.policyStatus === "enabled"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {account.signingEnabled &&
                          account.policyStatus === "enabled"
                            ? "Signing policy enabled"
                            : "Signing not live"}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {account.publicAddress}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Policy v{account.policyVersion} · {account.policyStatus}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground">Label:</span>{" "}
                      {account.label ?? "No label"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Custody:</span>{" "}
                      {account.custodyStatus}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account:</span>{" "}
                      {account.accountStatus}
                    </p>
                    <p>
                      <span className="text-muted-foreground">App link:</span>{" "}
                      {account.linkStatus}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Signing:</span>{" "}
                      {account.signingEnabled
                        ? `requires ${account.requiredAcr ?? "configured auth"}`
                        : "disabled"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Sandbox:</span>{" "}
                      {account.sandboxMode ? "yes" : "no"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {dayjs(account.createdAt).format("YYYY-MM-DD HH:mm")}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Updated:</span>{" "}
                      {dayjs(account.updatedAt).format("YYYY-MM-DD HH:mm")}
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    Signing requests are not available yet. Future requests
                    must use Passport approval and the app policy shown above.
                  </p>
                </div>
              ))}
            </div>
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
          open={Boolean(nearTransactionSignature)}
          onOpenChange={(value) => {
            if (value === false) {
              setNearTransactionSignature(undefined)
            }
          }}
        >
          <SheetContent>
            <SheetHeader>
              <SheetTitle>NEAR Transaction Signature</SheetTitle>
              <p className="break-all">
                Transaction signature: {nearTransactionSignature}
              </p>
              <p>
                This is the on-chain signature associated with the NEAR stamp
                transaction. It is not a wallet private key.
              </p>
              <Button
                className="block"
                onClick={() => {
                  navigator.clipboard.writeText(nearTransactionSignature ?? "")
                  toast.success("Successfully copied transaction signature")
                }}
                variant="outline"
              >
                Copy signature
              </Button>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
