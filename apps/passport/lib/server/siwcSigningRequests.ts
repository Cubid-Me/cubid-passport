import { createHash, randomUUID } from "node:crypto"

import { ApiSecurityError } from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ethers } from "ethers"
import { KeyPair } from "near-api-js"
import type { NextApiRequest } from "next"
import nacl from "tweetnacl"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Keypair } from "@solana/web3.js"

import {
  decryptBlockchainPrivateKeyWithKey,
  getBlockchainPrivateKeyWrappingKey,
  normalizeChainKey,
  normalizePublicAddress,
  type SupportedGeneratedChain,
} from "./blockchainAccounts"
import { getOidcSessionId } from "./oidcInteractionProxy"
import {
  requirePassportFirebaseUser,
  resolveHumanSubjectKeys,
} from "./oidcConsentManagement"
import { getPassportSupabase } from "./supabase"

export const SIWC_PASSKEY_ACR = "urn:cubid:acr:passkey" as const
const SIGNING_REQUEST_TTL_MS = 10 * 60 * 1000

type SigningRequestType = "message" | "transaction" | "typed_data"
type SigningRequestStatus =
  | "approved"
  | "cancelled"
  | "completed"
  | "expired"
  | "failed"
  | "pending_user_approval"
  | "policy_denied"
  | "rejected"
  | "signing"

type SiwcPolicyRow = {
  allowed_chains: unknown
  allowed_request_types: unknown
  custody_enabled: boolean
  dapp_id: number | string
  policy_version: number
  required_acr: string | null
  sandbox_mode: boolean
  signing_enabled: boolean
  status: string
}

type DappUserRow = {
  dapp_id: number | string
  user_id: number | string
  uuid: string
}

type UserAccountRow = {
  chain_key: string
  custody_status: string
  id: string
  public_address: string
  public_address_normalized: string | null
  status: string
  user_id: number | string
}

type DappUserAccountRow = {
  dapp_id: number | string
  dapp_user_uuid: string
  id: string
  status: string
  user_account_id: string
}

type SiwcSigningRequestRow = {
  approved_at: string | null
  chain_key: string
  completed_at: string | null
  created_at: string
  dapp_id: number | string
  dapp_user_account_id: string
  dapp_user_uuid: string
  error_code: string | null
  error_message: string | null
  expires_at: string
  idempotency_key: string | null
  payload: unknown
  payload_hash: string
  payload_summary: unknown
  policy_version: number
  rejected_at: string | null
  required_acr: string | null
  result: unknown
  request_type: string
  signing_request_id: string
  status: SigningRequestStatus
  updated_at: string
  user_account_id: string
  user_id: number | string
}

type RequestContext = {
  account: UserAccountRow
  dappUser: DappUserRow
  link: DappUserAccountRow
}

type PolicyEvaluation = {
  allowed: boolean
  denialCode?: string
  denialMessage?: string
  policyVersion: number
  requiredAcr: typeof SIWC_PASSKEY_ACR | null
}

export type SiwcSigningRequestSummary = {
  approvedAt: string | null
  chain: string
  completedAt: string | null
  createdAt: string
  dappId: string
  dappUserAccountId: string
  dappUserUuid: string
  errorCode: string | null
  errorMessage: string | null
  expiresAt: string
  payloadHash: string
  payloadSummary: Record<string, unknown>
  policyVersion: number
  rejectedAt: string | null
  requiredAcr: typeof SIWC_PASSKEY_ACR | null
  requestType: SigningRequestType
  result: unknown
  signingRequestId: string
  status: SigningRequestStatus
  updatedAt: string
  userAccountId: string
}

export type PassportSiwcSigningRequestSummary = SiwcSigningRequestSummary & {
  dappName: string
  publicAddress: string
}

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableValue(nestedValue)])
    )
  }

  return value
}

const hashPayload = (payload: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex")

const createSigningRequestId = () =>
  `siwc_req_${randomUUID().replace(/-/g, "")}`

const isExpired = (row: Pick<SiwcSigningRequestRow, "expires_at">) =>
  new Date(row.expires_at).getTime() <= Date.now()

const isTerminalStatus = (status: SigningRequestStatus) =>
  [
    "cancelled",
    "completed",
    "expired",
    "failed",
    "policy_denied",
    "rejected",
  ].includes(status)

const summarizePayload = (
  requestType: SigningRequestType,
  payload: unknown,
  providedSummary?: Record<string, unknown>
) => {
  if (providedSummary) {
    return providedSummary
  }

  if (
    requestType === "message" &&
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    const message = (payload as { message: string }).message
    return {
      kind: "message",
      preview: message.slice(0, 160),
      sizeBytes: Buffer.byteLength(message, "utf8"),
    }
  }

  if (requestType === "typed_data") {
    const domain = (payload as { domain?: Record<string, unknown> })?.domain
    return {
      kind: "typed_data",
      domainName:
        domain && typeof domain.name === "string" ? domain.name : null,
    }
  }

  return {
    kind: requestType,
    payloadHash: hashPayload(payload),
  }
}

const mapSigningRequest = (
  row: SiwcSigningRequestRow
): SiwcSigningRequestSummary => ({
  approvedAt: row.approved_at,
  chain: row.chain_key,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  dappId: String(row.dapp_id),
  dappUserAccountId: String(row.dapp_user_account_id),
  dappUserUuid: String(row.dapp_user_uuid),
  errorCode: row.error_code,
  errorMessage: row.error_message,
  expiresAt: row.expires_at,
  payloadHash: row.payload_hash,
  payloadSummary:
    typeof row.payload_summary === "object" && row.payload_summary !== null
      ? (row.payload_summary as Record<string, unknown>)
      : {},
  policyVersion: Number(row.policy_version ?? 0),
  rejectedAt: row.rejected_at,
  requiredAcr: row.required_acr === SIWC_PASSKEY_ACR ? SIWC_PASSKEY_ACR : null,
  requestType: row.request_type as SigningRequestType,
  result: row.result ?? null,
  signingRequestId: row.signing_request_id,
  status: row.status,
  updatedAt: row.updated_at,
  userAccountId: String(row.user_account_id),
})

const insertSecurityEvent = async (
  supabase: SupabaseClient,
  input: {
    actorIdentifier: string
    actorType: "dapp" | "user"
    details: Record<string, unknown>
    eventType: string
    outcome: "failure" | "success"
    requestId: string
    route: string
  }
) => {
  const { error } = await supabase.from("api_security_events").insert({
    actor_identifier: input.actorIdentifier,
    actor_type: input.actorType,
    details: input.details,
    event_id: `api_event_${randomUUID().replace(/-/g, "")}`,
    event_type: input.eventType,
    outcome: input.outcome,
    request_id: input.requestId,
    route: input.route,
  })

  if (error) {
    throw error
  }
}

const loadPolicy = async (supabase: SupabaseClient, dappId: number | string) => {
  const { data, error } = await supabase
    .from("siwc_signing_policies")
    .select(
      "dapp_id,status,policy_version,custody_enabled,signing_enabled,sandbox_mode,allowed_chains,allowed_request_types,required_acr"
    )
    .eq("dapp_id", dappId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as SiwcPolicyRow | null
}

const evaluatePolicy = (
  policy: SiwcPolicyRow | null,
  input: { chain: string; requestType: SigningRequestType }
): PolicyEvaluation => {
  if (!policy) {
    return {
      allowed: false,
      denialCode: "policy_missing",
      denialMessage: "Signing policy is not configured for this app.",
      policyVersion: 0,
      requiredAcr: null,
    }
  }

  if (policy.status !== "enabled" || !policy.signing_enabled) {
    return {
      allowed: false,
      denialCode: "signing_disabled",
      denialMessage: "Signing is disabled for this app.",
      policyVersion: Number(policy.policy_version ?? 0),
      requiredAcr:
        policy.required_acr === SIWC_PASSKEY_ACR ? SIWC_PASSKEY_ACR : null,
    }
  }

  if (!normalizeStringArray(policy.allowed_chains).includes(input.chain)) {
    return {
      allowed: false,
      denialCode: "chain_not_allowed",
      denialMessage: "This chain is not enabled for app signing.",
      policyVersion: Number(policy.policy_version ?? 0),
      requiredAcr:
        policy.required_acr === SIWC_PASSKEY_ACR ? SIWC_PASSKEY_ACR : null,
    }
  }

  if (
    !normalizeStringArray(policy.allowed_request_types).includes(
      input.requestType
    )
  ) {
    return {
      allowed: false,
      denialCode: "request_type_not_allowed",
      denialMessage: "This signing request type is not enabled for this app.",
      policyVersion: Number(policy.policy_version ?? 0),
      requiredAcr:
        policy.required_acr === SIWC_PASSKEY_ACR ? SIWC_PASSKEY_ACR : null,
    }
  }

  if (input.requestType === "transaction") {
    return {
      allowed: false,
      denialCode: "transaction_signing_deferred",
      denialMessage:
        "Transaction signing requires SIWC05 risk controls before it can be approved.",
      policyVersion: Number(policy.policy_version ?? 0),
      requiredAcr:
        policy.required_acr === SIWC_PASSKEY_ACR ? SIWC_PASSKEY_ACR : null,
    }
  }

  return {
    allowed: true,
    policyVersion: Number(policy.policy_version ?? 0),
    requiredAcr:
      policy.required_acr === SIWC_PASSKEY_ACR ? SIWC_PASSKEY_ACR : null,
  }
}

const assertRequestContext = async (
  supabase: SupabaseClient,
  input: {
    dappId: number | string
    dappUserUuid: string
    userAccountId: string
  }
): Promise<RequestContext | null> => {
  const { data: dappUser, error: dappUserError } = await supabase
    .from("dapp_users")
    .select("uuid,dapp_id,user_id")
    .eq("uuid", input.dappUserUuid)
    .eq("dapp_id", input.dappId)
    .maybeSingle()

  if (dappUserError) {
    throw dappUserError
  }

  if (!dappUser?.user_id) {
    return null
  }

  const { data: link, error: linkError } = await supabase
    .from("dapp_user_accounts")
    .select("id,dapp_user_uuid,user_account_id,dapp_id,status")
    .eq("dapp_user_uuid", input.dappUserUuid)
    .eq("dapp_id", input.dappId)
    .eq("user_account_id", input.userAccountId)
    .eq("status", "active")
    .maybeSingle()

  if (linkError) {
    throw linkError
  }

  if (!link) {
    return null
  }

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select(
      "id,user_id,chain_key,public_address,public_address_normalized,custody_status,status"
    )
    .eq("id", input.userAccountId)
    .eq("status", "active")
    .maybeSingle()

  if (accountError) {
    throw accountError
  }

  if (!account || String(account.user_id) !== String(dappUser.user_id)) {
    return null
  }

  return {
    account: account as UserAccountRow,
    dappUser: dappUser as DappUserRow,
    link: link as DappUserAccountRow,
  }
}

export async function createSiwcSigningRequest(input: {
  dappId: number | string
  dappUserUuid: string
  idempotencyKey: string
  payload: unknown
  payloadSummary?: Record<string, unknown>
  requestId: string
  requestType: SigningRequestType
  supabase: SupabaseClient
  userAccountId: string
}) {
  const context = await assertRequestContext(input.supabase, input)

  if (!context) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "The requested app-scoped account was not found for this dapp user."
    )
  }

  const chain = normalizeChainKey(context.account.chain_key)
  const policy = await loadPolicy(input.supabase, input.dappId)
  const evaluation = evaluatePolicy(policy, {
    chain,
    requestType: input.requestType,
  })
  const now = new Date().toISOString()
  const status: SigningRequestStatus = evaluation.allowed
    ? "pending_user_approval"
    : "policy_denied"
  const signingRequestId = createSigningRequestId()
  const payloadHash = hashPayload(input.payload)
  const expiresAt = new Date(Date.now() + SIGNING_REQUEST_TTL_MS).toISOString()

  const { data, error } = await input.supabase
    .from("siwc_signing_requests")
    .insert({
      chain_key: chain,
      dapp_id: input.dappId,
      dapp_user_account_id: context.link.id,
      dapp_user_uuid: input.dappUserUuid,
      error_code: evaluation.denialCode ?? null,
      error_message: evaluation.denialMessage ?? null,
      expires_at: expiresAt,
      idempotency_key: input.idempotencyKey,
      payload: input.payload,
      payload_hash: payloadHash,
      payload_summary: summarizePayload(
        input.requestType,
        input.payload,
        input.payloadSummary
      ),
      policy_version: evaluation.policyVersion,
      request_id_header: input.requestId,
      request_type: input.requestType,
      required_acr: evaluation.requiredAcr,
      signing_request_id: signingRequestId,
      status,
      updated_at: now,
      user_account_id: input.userAccountId,
      user_id: context.dappUser.user_id,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  await insertSecurityEvent(input.supabase, {
    actorIdentifier: String(input.dappId),
    actorType: "dapp",
    details: {
      chain,
      dappId: String(input.dappId),
      dappUserUuid: input.dappUserUuid,
      policyVersion: evaluation.policyVersion,
      signingRequestId,
      status,
      userAccountId: input.userAccountId,
    },
    eventType: evaluation.allowed
      ? "signing_request.created"
      : "signing_request.policy_denied",
    outcome: evaluation.allowed ? "success" : "failure",
    requestId: input.requestId,
    route: "v3.signing.requests.create",
  })

  return mapSigningRequest(data as SiwcSigningRequestRow)
}

const loadDappSigningRequest = async (
  supabase: SupabaseClient,
  input: { dappId: number | string; signingRequestId: string }
) => {
  const { data, error } = await supabase
    .from("siwc_signing_requests")
    .select("*")
    .eq("signing_request_id", input.signingRequestId)
    .eq("dapp_id", input.dappId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as SiwcSigningRequestRow | null
}

export async function getSiwcSigningRequestForDapp(input: {
  dappId: number | string
  signingRequestId: string
  supabase: SupabaseClient
}) {
  const row = await loadDappSigningRequest(input.supabase, input)

  if (!row) {
    throw new ApiSecurityError(404, "not_found", "Signing request not found.")
  }

  return mapSigningRequest(row)
}

export async function listSiwcSigningRequestsForDapp(input: {
  dappId: number | string
  dappUserUuid?: string | null
  limit?: number
  supabase: SupabaseClient
}) {
  let query = input.supabase
    .from("siwc_signing_requests")
    .select("*")
    .eq("dapp_id", input.dappId)

  if (input.dappUserUuid) {
    query = query.eq("dapp_user_uuid", input.dappUserUuid)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 25)

  if (error) {
    throw error
  }

  return ((data ?? []) as SiwcSigningRequestRow[]).map(mapSigningRequest)
}

export async function cancelSiwcSigningRequestForDapp(input: {
  dappId: number | string
  requestId: string
  signingRequestId: string
  supabase: SupabaseClient
}) {
  const row = await loadDappSigningRequest(input.supabase, input)

  if (!row) {
    throw new ApiSecurityError(404, "not_found", "Signing request not found.")
  }

  if (isTerminalStatus(row.status)) {
    return mapSigningRequest(row)
  }

  if (row.status !== "pending_user_approval") {
    throw new ApiSecurityError(
      409,
      "invalid_state",
      "Only pending signing requests can be cancelled."
    )
  }

  const now = new Date().toISOString()
  const { data, error } = await input.supabase
    .from("siwc_signing_requests")
    .update({
      cancelled_at: now,
      status: "cancelled",
      updated_at: now,
    })
    .eq("signing_request_id", input.signingRequestId)
    .eq("dapp_id", input.dappId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  await insertSecurityEvent(input.supabase, {
    actorIdentifier: String(input.dappId),
    actorType: "dapp",
    details: {
      signingRequestId: input.signingRequestId,
    },
    eventType: "signing_request.cancelled",
    outcome: "success",
    requestId: input.requestId,
    route: "v3.signing.requests.cancel",
  })

  return mapSigningRequest(data as SiwcSigningRequestRow)
}

const resolvePassportUserIds = async (req: NextApiRequest) => {
  const token = await requirePassportFirebaseUser(req)
  const supabase = getPassportSupabase()
  const userIds = new Set<string>()

  if (token.email) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", token.email)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data?.id !== undefined && data.id !== null) {
      userIds.add(String(data.id))
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

    if (data?.id !== undefined && data.id !== null) {
      userIds.add(String(data.id))
    }
  }

  return { token, userIds: [...userIds] }
}

const loadDappNames = async (supabase: SupabaseClient, dappIds: string[]) => {
  if (dappIds.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from("dapps")
    .select("id,appname")
    .in("id", dappIds)

  if (error) {
    throw error
  }

  return new Map(
    ((data ?? []) as Array<{ appname?: string | null; id: string | number }>).map(
      (row) => [String(row.id), row.appname ?? `Dapp ${row.id}`]
    )
  )
}

const loadAccountAddresses = async (
  supabase: SupabaseClient,
  accountIds: string[]
) => {
  if (accountIds.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from("user_accounts")
    .select("id,public_address")
    .in("id", accountIds)

  if (error) {
    throw error
  }

  return new Map(
    ((data ?? []) as Array<{ id: string | number; public_address: string }>).map(
      (row) => [String(row.id), String(row.public_address)]
    )
  )
}

export async function listPassportSiwcSigningRequests(req: NextApiRequest) {
  const supabase = getPassportSupabase()
  const { userIds } = await resolvePassportUserIds(req)

  if (userIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("siwc_signing_requests")
    .select("*")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    throw error
  }

  const rows = (data ?? []) as SiwcSigningRequestRow[]
  const dappNames = await loadDappNames(
    supabase,
    [...new Set(rows.map((row) => String(row.dapp_id)))]
  )
  const addresses = await loadAccountAddresses(
    supabase,
    [...new Set(rows.map((row) => String(row.user_account_id)))]
  )

  return rows.map((row) => ({
    ...mapSigningRequest(row),
    dappName: dappNames.get(String(row.dapp_id)) ?? `Dapp ${row.dapp_id}`,
    publicAddress: addresses.get(String(row.user_account_id)) ?? "",
  }))
}

const loadOwnedPassportSigningRequest = async (
  req: NextApiRequest,
  signingRequestId: string
) => {
  const supabase = getPassportSupabase()
  const { token, userIds } = await resolvePassportUserIds(req)

  if (userIds.length === 0) {
    throw new ApiSecurityError(404, "not_found", "Signing request not found.")
  }

  const { data, error } = await supabase
    .from("siwc_signing_requests")
    .select("*")
    .eq("signing_request_id", signingRequestId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const row = data as SiwcSigningRequestRow | null

  if (!row || !userIds.includes(String(row.user_id))) {
    throw new ApiSecurityError(404, "not_found", "Signing request not found.")
  }

  return { row, token }
}

const assertPasskeyAcrSatisfied = async (
  req: NextApiRequest,
  row: SiwcSigningRequestRow,
  token: Awaited<ReturnType<typeof requirePassportFirebaseUser>>
) => {
  if (row.required_acr !== SIWC_PASSKEY_ACR) {
    return
  }

  const sessionId = getOidcSessionId(req)

  if (!sessionId) {
    throw new ApiSecurityError(
      403,
      "step_up_required",
      "Passkey step-up is required before approving this signing request."
    )
  }

  const supabase = getPassportSupabase()
  const { data: session, error } = await supabase
    .from("oidc_sessions")
    .select("session_id,human_subject_key,metadata,expires_at,revoked_at")
    .eq("session_id", sessionId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const metadata = (session?.metadata ?? {}) as Record<string, unknown>
  const authMethods = normalizeStringArray(
    metadata.authentication_methods ?? metadata.authenticationMethods
  )
  const acr = typeof metadata.acr === "string" ? metadata.acr : null

  if (
    !session ||
    !session.human_subject_key ||
    session.revoked_at ||
    new Date(String(session.expires_at)).getTime() <= Date.now() ||
    (acr !== SIWC_PASSKEY_ACR && !authMethods.includes("passkey"))
  ) {
    throw new ApiSecurityError(
      403,
      "step_up_required",
      "Passkey step-up is required before approving this signing request."
    )
  }

  const subjectKeys = await resolveHumanSubjectKeys(supabase, token)

  if (!subjectKeys.includes(String(session.human_subject_key))) {
    throw new ApiSecurityError(
      403,
      "step_up_required",
      "Passkey step-up is required before approving this signing request."
    )
  }
}

const assertMessagePayload = (payload: unknown) => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message
  }

  throw new ApiSecurityError(
    400,
    "invalid_request",
    "Signing payload is not valid for message signing."
  )
}

const assertTypedDataPayload = (payload: unknown) => {
  if (typeof payload === "object" && payload !== null) {
    return payload as {
      domain?: Record<string, unknown>
      types?: Record<string, Array<Record<string, string>>>
      value?: Record<string, unknown>
    }
  }

  throw new ApiSecurityError(
    400,
    "invalid_request",
    "Signing payload is not valid for typed-data signing."
  )
}

const signPayload = async (
  input: {
    account: UserAccountRow
    payload: unknown
    requestType: SigningRequestType
  },
  privateKey: string
) => {
  const chain = normalizeChainKey(input.account.chain_key)

  if (input.requestType === "transaction") {
    throw new ApiSecurityError(
      409,
      "transaction_signing_deferred",
      "Transaction signing requires SIWC05 risk controls before it can be approved."
    )
  }

  if (chain === "evm") {
    const wallet = new ethers.Wallet(privateKey)

    if (input.requestType === "message") {
      const message = assertMessagePayload(input.payload)
      return {
        algorithm: "evm_secp256k1",
        publicAddress: input.account.public_address,
        signature: await wallet.signMessage(message),
        type: "signature",
      }
    }

    const typedData = assertTypedDataPayload(input.payload)
    return {
      algorithm: "evm_eip712",
      publicAddress: input.account.public_address,
      signature: await wallet._signTypedData(
        typedData.domain ?? {},
        (typedData.types ?? {}) as never,
        typedData.value ?? {}
      ),
      type: "signature",
    }
  }

  if (input.requestType !== "message") {
    throw new ApiSecurityError(
      409,
      "request_type_not_supported",
      "This chain only supports message signing in the current SIWC slice."
    )
  }

  const message = assertMessagePayload(input.payload)
  const messageBytes = Buffer.from(message, "utf8")

  if (chain === "near") {
    const keyPair = KeyPair.fromString(privateKey)
    return {
      algorithm: "near_ed25519",
      publicAddress: input.account.public_address,
      signature: Buffer.from(keyPair.sign(messageBytes).signature).toString(
        "base64"
      ),
      type: "signature",
    }
  }

  if (chain === "solana") {
    const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, "base64"))
    return {
      algorithm: "solana_ed25519",
      publicAddress: input.account.public_address,
      signature: Buffer.from(
        nacl.sign.detached(messageBytes, keypair.secretKey)
      ).toString("base64"),
      type: "signature",
    }
  }

  if (chain === "sui") {
    const keypair = (Ed25519Keypair as unknown as {
      fromSecretKey: (secretKey: string) => Ed25519Keypair
    }).fromSecretKey(privateKey)
    const result = await (keypair as unknown as {
      signPersonalMessage: (bytes: Uint8Array) => Promise<{ signature: string }>
    }).signPersonalMessage(messageBytes)
    return {
      algorithm: "sui_ed25519_personal_message",
      publicAddress: input.account.public_address,
      signature: result.signature,
      type: "signature",
    }
  }

  throw new ApiSecurityError(
    409,
    "chain_not_supported",
    "This chain is not supported for SIWC signing."
  )
}

const completeApprovedSigning = async (
  supabase: SupabaseClient,
  row: SiwcSigningRequestRow
) => {
  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select(
      "id,user_id,chain_key,public_address,public_address_normalized,custody_status,status"
    )
    .eq("id", row.user_account_id)
    .eq("status", "active")
    .maybeSingle()

  if (accountError) {
    throw accountError
  }

  if (!account) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "Signing account is no longer active."
    )
  }

  const policy = await loadPolicy(supabase, row.dapp_id)
  const evaluation = evaluatePolicy(policy, {
    chain: String(account.chain_key),
    requestType: row.request_type as SigningRequestType,
  })

  if (!evaluation.allowed) {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("siwc_signing_requests")
      .update({
        error_code: evaluation.denialCode ?? "policy_denied",
        error_message: evaluation.denialMessage ?? "Signing policy denied.",
        status: "policy_denied",
        updated_at: now,
      })
      .eq("signing_request_id", row.signing_request_id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return data as SiwcSigningRequestRow
  }

  const chainKey = normalizeChainKey(String(account.chain_key)) as SupportedGeneratedChain
  const normalizedAddress =
    typeof account.public_address_normalized === "string" &&
    account.public_address_normalized
      ? account.public_address_normalized
      : normalizePublicAddress(chainKey, String(account.public_address))
  const { data: keyRow, error: keyError } = await supabase
    .schema("private")
    .from("private_keys")
    .select("*")
    .eq("user_account_id", row.user_account_id)
    .eq("status", "active")
    .maybeSingle()

  if (keyError) {
    throw keyError
  }

  if (!keyRow) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "Signing key is not available for this account."
    )
  }

  const wrappingKey = await getBlockchainPrivateKeyWrappingKey(supabase)
  const privateKey = decryptBlockchainPrivateKeyWithKey(keyRow, wrappingKey, {
    chainKey,
    publicAddressNormalized: normalizedAddress,
    userAccountId: String(account.id),
    userId: account.user_id,
  })
  const result = await signPayload(
    {
      account: account as UserAccountRow,
      payload: row.payload,
      requestType: row.request_type as SigningRequestType,
    },
    privateKey
  )
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("siwc_signing_requests")
    .update({
      completed_at: now,
      result,
      status: "completed",
      updated_at: now,
    })
    .eq("signing_request_id", row.signing_request_id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data as SiwcSigningRequestRow
}

export async function approvePassportSiwcSigningRequest(input: {
  req: NextApiRequest
  requestId: string
  signingRequestId: string
}) {
  const supabase = getPassportSupabase()
  const { row, token } = await loadOwnedPassportSigningRequest(
    input.req,
    input.signingRequestId
  )

  if (isExpired(row) && row.status === "pending_user_approval") {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("siwc_signing_requests")
      .update({
        status: "expired",
        updated_at: now,
      })
      .eq("signing_request_id", row.signing_request_id)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    return mapSigningRequest(data as SiwcSigningRequestRow)
  }

  if (row.status === "completed") {
    return mapSigningRequest(row)
  }

  if (row.status !== "pending_user_approval") {
    throw new ApiSecurityError(
      409,
      "invalid_state",
      "Only pending signing requests can be approved."
    )
  }

  await assertPasskeyAcrSatisfied(input.req, row, token)

  const approvedAt = new Date().toISOString()
  const { data: approvedRow, error: approveError } = await supabase
    .from("siwc_signing_requests")
    .update({
      approved_at: approvedAt,
      approved_by_firebase_uid: token.uid,
      status: "approved",
      updated_at: approvedAt,
    })
    .eq("signing_request_id", row.signing_request_id)
    .eq("status", "pending_user_approval")
    .select("*")
    .single()

  if (approveError) {
    throw approveError
  }

  await insertSecurityEvent(supabase, {
    actorIdentifier: token.uid,
    actorType: "user",
    details: {
      signingRequestId: row.signing_request_id,
    },
    eventType: "signing_request.approved",
    outcome: "success",
    requestId: input.requestId,
    route: "passport.siwc.signing.requests.approve",
  })

  const completedRow = await completeApprovedSigning(
    supabase,
    approvedRow as SiwcSigningRequestRow
  )

  await insertSecurityEvent(supabase, {
    actorIdentifier: token.uid,
    actorType: "user",
    details: {
      signingRequestId: row.signing_request_id,
      status: completedRow.status,
    },
    eventType:
      completedRow.status === "completed"
        ? "signing_request.completed"
        : "signing_request.policy_denied",
    outcome: completedRow.status === "completed" ? "success" : "failure",
    requestId: input.requestId,
    route: "passport.siwc.signing.requests.approve",
  })

  return mapSigningRequest(completedRow)
}

export async function rejectPassportSiwcSigningRequest(input: {
  req: NextApiRequest
  requestId: string
  signingRequestId: string
}) {
  const supabase = getPassportSupabase()
  const { row, token } = await loadOwnedPassportSigningRequest(
    input.req,
    input.signingRequestId
  )

  if (isTerminalStatus(row.status)) {
    return mapSigningRequest(row)
  }

  if (row.status !== "pending_user_approval") {
    throw new ApiSecurityError(
      409,
      "invalid_state",
      "Only pending signing requests can be rejected."
    )
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("siwc_signing_requests")
    .update({
      rejected_at: now,
      rejected_by_firebase_uid: token.uid,
      status: "rejected",
      updated_at: now,
    })
    .eq("signing_request_id", row.signing_request_id)
    .eq("status", "pending_user_approval")
    .select("*")
    .single()

  if (error) {
    throw error
  }

  await insertSecurityEvent(supabase, {
    actorIdentifier: token.uid,
    actorType: "user",
    details: {
      signingRequestId: row.signing_request_id,
    },
    eventType: "signing_request.rejected",
    outcome: "success",
    requestId: input.requestId,
    route: "passport.siwc.signing.requests.reject",
  })

  return mapSigningRequest(data as SiwcSigningRequestRow)
}
