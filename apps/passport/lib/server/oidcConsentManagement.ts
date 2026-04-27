import { randomUUID } from "node:crypto"
import type { NextApiRequest } from "next"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { DecodedIdToken } from "firebase-admin/auth"
import { ApiSecurityError } from "@cubid/auth/server"
import { getSupabaseServiceRoleConfig } from "@cubid/config"

import { getPassportFirebaseAdminAuth } from "./firebaseAdmin"

type PassportSupabaseClient = SupabaseClient

type ConsentRow = {
  claim_classification_summary: unknown
  client_id: string
  consent_id: string
  consent_version: number
  granted_at: string
  granted_claims: unknown
  granted_scopes: unknown
  policy_version: string
  revoked_at: string | null
  revoked_by: "user" | "operator" | null
}

type ClientRow = {
  client_id: string
  client_name: string
}

export type PassportConsentSummary = {
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

let supabaseClient: PassportSupabaseClient | null = null

export const getPassportSupabase = () => {
  if (!supabaseClient) {
    const config = getSupabaseServiceRoleConfig()
    supabaseClient = createClient(
      config.url,
      config.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return supabaseClient
}

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === "string")
}

const normalizeClaimClassificationSummary = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { claim?: unknown }).claim === "string"
    ) {
      return [
        {
          claim: (entry as { claim: string }).claim,
          dataClass:
            typeof (entry as { dataClass?: unknown }).dataClass === "string"
              ? (entry as { dataClass: string }).dataClass
              : "json",
        },
      ]
    }

    return []
  })
}

const getBearerToken = (req: NextApiRequest) => {
  const authorizationHeader = req.headers.authorization

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null
  }

  return authorizationHeader.slice("Bearer ".length).trim()
}

export const requirePassportFirebaseUser = async (req: NextApiRequest) => {
  const bearerToken = getBearerToken(req)

  if (!bearerToken) {
    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Missing Firebase bearer token."
    )
  }

  try {
    const token = await getPassportFirebaseAdminAuth().verifyIdToken(
      bearerToken
    )

    if (!token.email && !token.phone_number) {
      throw new ApiSecurityError(
        401,
        "unauthorized",
        "Firebase token is missing email or phone identity."
      )
    }

    return token
  } catch (error) {
    if (error instanceof ApiSecurityError) {
      throw error
    }

    throw new ApiSecurityError(
      401,
      "unauthorized",
      "Invalid Firebase bearer token."
    )
  }
}

export const resolveHumanSubjectKeys = async (
  supabase: PassportSupabaseClient,
  token: DecodedIdToken
) => {
  const userIds = new Set<number>()
  const subjectKeys = new Set<string>()

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

    const subjectResponse = await supabase
      .from("oidc_human_subjects")
      .select("human_subject_key")
      .eq("primary_email", token.email)

    if (subjectResponse.error) {
      throw subjectResponse.error
    }

    for (const subject of subjectResponse.data ?? []) {
      if (typeof subject.human_subject_key === "string") {
        subjectKeys.add(subject.human_subject_key)
      }
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

    const subjectResponse = await supabase
      .from("oidc_human_subjects")
      .select("human_subject_key")
      .eq("primary_phone", token.phone_number)

    if (subjectResponse.error) {
      throw subjectResponse.error
    }

    for (const subject of subjectResponse.data ?? []) {
      if (typeof subject.human_subject_key === "string") {
        subjectKeys.add(subject.human_subject_key)
      }
    }
  }

  if (userIds.size > 0) {
    const { data, error } = await supabase
      .from("oidc_human_subjects")
      .select("human_subject_key")
      .in("cubid_user_id", [...userIds])

    if (error) {
      throw error
    }

    for (const subject of data ?? []) {
      if (typeof subject.human_subject_key === "string") {
        subjectKeys.add(subject.human_subject_key)
      }
    }
  }

  return [...subjectKeys]
}

const mapConsentSummary = (
  row: ConsentRow,
  clientsById: Map<string, ClientRow>
): PassportConsentSummary => {
  return {
    claimClassificationSummary: normalizeClaimClassificationSummary(
      row.claim_classification_summary
    ),
    clientId: row.client_id,
    clientName: clientsById.get(row.client_id)?.client_name ?? row.client_id,
    consentId: row.consent_id,
    consentVersion: row.consent_version,
    grantedAt: row.granted_at,
    grantedClaims: normalizeStringArray(row.granted_claims),
    grantedScopes: normalizeStringArray(row.granted_scopes),
    policyVersion: row.policy_version,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
  }
}

export const listPassportOidcConsents = async (req: NextApiRequest) => {
  const supabase = getPassportSupabase()
  const token = await requirePassportFirebaseUser(req)
  const subjectKeys = await resolveHumanSubjectKeys(supabase, token)

  if (subjectKeys.length === 0) {
    return []
  }

  const { data: consentRows, error: consentsError } = await supabase
    .from("oidc_consents")
    .select(
      "consent_id,client_id,granted_scopes,granted_claims,claim_classification_summary,consent_version,policy_version,granted_at,revoked_at,revoked_by"
    )
    .in("human_subject_key", subjectKeys)
    .order("granted_at", { ascending: false })

  if (consentsError) {
    throw consentsError
  }

  const clientIds = [
    ...new Set(
      ((consentRows ?? []) as ConsentRow[]).map((row) => row.client_id)
    ),
  ]
  const clientsById = new Map<string, ClientRow>()

  if (clientIds.length > 0) {
    const { data: clientRows, error: clientsError } = await supabase
      .from("oidc_clients")
      .select("client_id,client_name")
      .in("client_id", clientIds)

    if (clientsError) {
      throw clientsError
    }

    for (const client of (clientRows ?? []) as ClientRow[]) {
      clientsById.set(client.client_id, client)
    }
  }

  return ((consentRows ?? []) as ConsentRow[]).map((row) =>
    mapConsentSummary(row, clientsById)
  )
}

export const revokePassportOidcConsent = async (
  req: NextApiRequest,
  consentId: string,
  requestId: string
) => {
  if (!consentId) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "consentId is required."
    )
  }

  const supabase = getPassportSupabase()
  const token = await requirePassportFirebaseUser(req)
  const subjectKeys = await resolveHumanSubjectKeys(supabase, token)

  if (subjectKeys.length === 0) {
    throw new ApiSecurityError(404, "not_found", "Consent not found.")
  }

  const { data: consent, error: consentError } = await supabase
    .from("oidc_consents")
    .select("consent_id,client_id,human_subject_key,revoked_at")
    .eq("consent_id", consentId)
    .maybeSingle()

  if (consentError) {
    throw consentError
  }

  if (!consent || !subjectKeys.includes(consent.human_subject_key)) {
    throw new ApiSecurityError(404, "not_found", "Consent not found.")
  }

  if (consent.revoked_at) {
    return {
      consentId,
      revokedAt: consent.revoked_at,
    }
  }

  const revokedAt = new Date().toISOString()

  const { error: revokeError } = await supabase
    .from("oidc_consents")
    .update({
      revoked_at: revokedAt,
      revoked_by: "user",
    })
    .eq("consent_id", consentId)
    .is("revoked_at", null)

  if (revokeError) {
    throw revokeError
  }

  const [accessTokenResponse, refreshTokenResponse] = await Promise.all([
    supabase
      .from("oidc_access_tokens")
      .update({ revoked_at: revokedAt })
      .eq("consent_id", consentId)
      .is("revoked_at", null),
    supabase
      .from("oidc_refresh_tokens")
      .update({ revoked_at: revokedAt })
      .eq("consent_id", consentId)
      .is("revoked_at", null),
  ])

  if (accessTokenResponse.error) {
    throw accessTokenResponse.error
  }

  if (refreshTokenResponse.error) {
    throw refreshTokenResponse.error
  }

  const { error: auditError } = await supabase.from("oidc_audit_logs").insert({
    log_id: `audit_${randomUUID()}`,
    client_id: consent.client_id,
    event_type: "consent.revoked",
    actor_type: "user",
    actor_identifier: consent.human_subject_key,
    request_id: requestId,
    outcome: "success",
    details: {
      consent_id: consentId,
      revoked_by: "user",
    },
  })

  if (auditError) {
    throw auditError
  }

  return {
    consentId,
    revokedAt,
  }
}
