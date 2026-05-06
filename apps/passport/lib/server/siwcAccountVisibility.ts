import type { NextApiRequest } from "next"

import { requirePassportFirebaseUser } from "./oidcConsentManagement"
import { getPassportSupabase } from "./supabase"

type UserAccountRow = {
  account_label: string | null
  chain_key: string
  created_at: string
  custody_status: string
  id: string
  public_address: string
  status: string
  updated_at: string
  user_id: number | string
}

type DappUserAccountRow = {
  created_at: string
  dapp_id: number | string
  dapp_user_uuid: string
  id: string
  status: string
  updated_at: string
  user_account_id: string
}

type DappRow = {
  appname?: string | null
  id: number | string
}

type SiwcPolicyRow = {
  custody_enabled: boolean
  dapp_id: number | string
  policy_version: number
  required_acr: string | null
  sandbox_mode: boolean
  signing_enabled: boolean
  status: string
}

export type PassportSiwcAccountSummary = {
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

const resolvePassportUserIds = async (req: NextApiRequest) => {
  const token = await requirePassportFirebaseUser(req)
  const supabase = getPassportSupabase()
  const userIds = new Set<number>()

  if (token.email) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", token.email)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (typeof data?.id === "number") {
      userIds.add(data.id)
    }
  }

  if (token.phone_number) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("phone", token.phone_number)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (typeof data?.id === "number") {
      userIds.add(data.id)
    }
  }

  return [...userIds]
}

const mapPolicy = (row?: SiwcPolicyRow | null) => ({
  custodyEnabled: row?.custody_enabled ?? false,
  policyStatus: row?.status ?? "disabled",
  policyVersion: row?.policy_version ?? 0,
  requiredAcr:
    row?.required_acr === "urn:cubid:acr:passkey"
      ? ("urn:cubid:acr:passkey" as const)
      : null,
  sandboxMode: row?.sandbox_mode ?? true,
  signingEnabled: row?.signing_enabled ?? false,
})

export const listPassportSiwcAccounts = async (
  req: NextApiRequest
): Promise<PassportSiwcAccountSummary[]> => {
  const supabase = getPassportSupabase()
  const userIds = await resolvePassportUserIds(req)

  if (userIds.length === 0) {
    return []
  }

  const { data: accountRows, error: accountError } = await supabase
    .from("user_accounts")
    .select(
      "id,user_id,chain_key,public_address,account_label,custody_status,status,created_at,updated_at"
    )
    .in("user_id", userIds)
    .eq("status", "active")

  if (accountError) {
    throw accountError
  }

  const accounts = (accountRows ?? []) as UserAccountRow[]
  const accountIds = accounts.map((account) => String(account.id))

  if (accountIds.length === 0) {
    return []
  }

  const { data: linkRows, error: linkError } = await supabase
    .from("dapp_user_accounts")
    .select("id,dapp_user_uuid,user_account_id,dapp_id,status,created_at,updated_at")
    .in("user_account_id", accountIds)
    .eq("status", "active")

  if (linkError) {
    throw linkError
  }

  const links = (linkRows ?? []) as DappUserAccountRow[]

  if (links.length === 0) {
    return []
  }

  const dappIds = [...new Set(links.map((link) => String(link.dapp_id)))]
  const { data: dappRows, error: dappError } = await supabase
    .from("dapps")
    .select("id,appname")
    .in("id", dappIds)

  if (dappError) {
    throw dappError
  }

  const { data: policyRows, error: policyError } = await supabase
    .from("siwc_signing_policies")
    .select(
      "dapp_id,status,policy_version,custody_enabled,signing_enabled,sandbox_mode,required_acr"
    )
    .in("dapp_id", dappIds)

  if (policyError) {
    throw policyError
  }

  const dappsById = new Map(
    ((dappRows ?? []) as DappRow[]).map((dapp) => [String(dapp.id), dapp])
  )
  const policiesByDappId = new Map(
    ((policyRows ?? []) as SiwcPolicyRow[]).map((policy) => [
      String(policy.dapp_id),
      policy,
    ])
  )
  const accountsById = new Map(
    accounts.map((account) => [String(account.id), account])
  )

  return links
    .flatMap((link): PassportSiwcAccountSummary[] => {
      const account = accountsById.get(String(link.user_account_id))

      if (!account) {
        return []
      }

      const dappId = String(link.dapp_id)
      const dapp = dappsById.get(dappId)
      const policy = mapPolicy(policiesByDappId.get(dappId))

      return [
        {
          accountId: String(account.id),
          accountStatus: String(account.status),
          chain: String(account.chain_key),
          createdAt: String(account.created_at),
          custodyStatus: String(account.custody_status),
          dappId,
          dappName: dapp?.appname ?? `Dapp ${dappId}`,
          dappUserAccountId: String(link.id),
          dappUserUuid: String(link.dapp_user_uuid),
          label: account.account_label ? String(account.account_label) : null,
          linkStatus: String(link.status),
          publicAddress: String(account.public_address),
          updatedAt: String(account.updated_at),
          ...policy,
        },
      ]
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}
