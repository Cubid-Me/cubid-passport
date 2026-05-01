import { randomUUID } from "node:crypto"
import type { NextApiRequest } from "next"
import { ApiSecurityError } from "@cubid/auth/server"
import { getStampTypeId } from "@cubid/stamps"

import {
  normalizeStringArray,
  requirePassportFirebaseUser,
} from "./oidcConsentManagement"
import { getPassportSupabase } from "./supabase"

type AppScopedSubjectRow = {
  app_scoped_subject: string
  cubid_user_id: number | string | null
  dapp_id: number | string | null
  dapp_user_uuid: string | null
  id: string
}

type AppDisclosureGrantRow = {
  app_scoped_subject_id: string
  consent_version: number
  dapp_id: number | string
  granted_at: string
  granted_claims: unknown
  granted_scopes: unknown
  id: string
  metadata: unknown
  policy_version: string
  revoked_at: string | null
  revoked_by: "user" | "operator" | "system" | null
  source: string
  status: "active" | "revoked"
}

type DappRow = {
  appname?: string | null
  id: number | string
}

type StampRow = {
  id: number | string
  stamptype: number | string
}

export type PassportAppDisclosureGrantSummary = {
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

const normalizeGrantedClaims = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { claim?: unknown }).claim === "string"
    ) {
      return [(entry as { claim: string }).claim]
    }

    if (typeof entry === "string") {
      return [entry]
    }

    return []
  })
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

const loadOwnedAllowPageGrants = async (req: NextApiRequest) => {
  const supabase = getPassportSupabase()
  const userIds = await resolvePassportUserIds(req)

  if (userIds.length === 0) {
    return {
      dappsById: new Map<string, DappRow>(),
      grantRows: [] as AppDisclosureGrantRow[],
      subjectsById: new Map<string, AppScopedSubjectRow>(),
      userIds,
    }
  }

  const { data: subjectRows, error: subjectError } = await supabase
    .from("app_scoped_subjects")
    .select("id,app_scoped_subject,dapp_id,dapp_user_uuid,cubid_user_id")
    .in("cubid_user_id", userIds)
    .eq("status", "active")

  if (subjectError) {
    throw subjectError
  }

  const ownedSubjects = ((subjectRows ?? []) as AppScopedSubjectRow[]).filter(
    (subject) => subject.dapp_id !== null && subject.dapp_id !== undefined
  )
  const subjectIds = ownedSubjects.map((subject) => subject.id)
  const subjectsById = new Map(
    ownedSubjects.map((subject) => [subject.id, subject])
  )

  if (subjectIds.length === 0) {
    return {
      dappsById: new Map<string, DappRow>(),
      grantRows: [] as AppDisclosureGrantRow[],
      subjectsById,
      userIds,
    }
  }

  const { data: grantRows, error: grantError } = await supabase
    .from("selective_disclosure_grants")
    .select(
      "id,app_scoped_subject_id,dapp_id,source,granted_scopes,granted_claims,policy_version,consent_version,status,granted_at,revoked_at,revoked_by,metadata"
    )
    .in("app_scoped_subject_id", subjectIds)
    .eq("source", "allow_page")

  if (grantError) {
    throw grantError
  }

  const dappIds = [
    ...new Set(
      ((grantRows ?? []) as AppDisclosureGrantRow[]).map((grant) =>
        String(grant.dapp_id)
      )
    ),
  ]
  const dappsById = new Map<string, DappRow>()

  if (dappIds.length > 0) {
    const { data: dappRows, error: dappError } = await supabase
      .from("dapps")
      .select("id,appname")
      .in("id", dappIds)

    if (dappError) {
      throw dappError
    }

    for (const dapp of (dappRows ?? []) as DappRow[]) {
      dappsById.set(String(dapp.id), dapp)
    }
  }

  return {
    dappsById,
    grantRows: ((grantRows ?? []) as AppDisclosureGrantRow[]).sort((left, right) =>
      String(right.granted_at).localeCompare(String(left.granted_at))
    ),
    subjectsById,
    userIds,
  }
}

export const listPassportAppDisclosureGrants = async (
  req: NextApiRequest
): Promise<PassportAppDisclosureGrantSummary[]> => {
  const { dappsById, grantRows, subjectsById } = await loadOwnedAllowPageGrants(req)

  return grantRows.map((grant) => {
    const subject = subjectsById.get(grant.app_scoped_subject_id) ?? null
    const dappId = String(grant.dapp_id)
    return {
      appName: dappsById.get(dappId)?.appname ?? `Dapp ${dappId}`,
      appScopedSubject: subject?.app_scoped_subject ?? null,
      claimClassificationSummary: normalizeClaimClassificationSummary(
        grant.granted_claims
      ),
      consentVersion: grant.consent_version,
      dappId,
      dappUserUuid: subject?.dapp_user_uuid ?? null,
      grantId: grant.id,
      grantedAt: grant.granted_at,
      grantedClaims: normalizeGrantedClaims(grant.granted_claims),
      grantedScopes: normalizeStringArray(grant.granted_scopes),
      policyVersion: grant.policy_version,
      revokedAt: grant.revoked_at,
      revokedBy: grant.revoked_by,
      source: "allow_page",
    }
  })
}

const revokeLegacyStampPermissions = async (input: {
  dappUserUuid: string | null
  grant: AppDisclosureGrantRow
  userId: number | string | null
}) => {
  if (!input.dappUserUuid || input.userId === null || input.userId === undefined) {
    return
  }

  const stampTypeIds = normalizeGrantedClaims(input.grant.granted_claims)
    .filter((claim) => claim.startsWith("stamp:") && claim !== "stamp:*")
    .map((claim) => getStampTypeId(claim.slice("stamp:".length)))
    .filter((value): value is number => value !== null)

  if (stampTypeIds.length === 0) {
    return
  }

  const supabase = getPassportSupabase()
  const { data: stamps, error: stampsError } = await supabase
    .from("stamps")
    .select("id,stamptype")
    .eq("created_by_user_id", input.userId)
    .in("stamptype", stampTypeIds)

  if (stampsError) {
    throw stampsError
  }

  for (const stamp of (stamps ?? []) as StampRow[]) {
    const { error } = await supabase
      .from("stamp_dappuser_permissions")
      .delete()
      .eq("dappuser_id", input.dappUserUuid)
      .eq("stamp_id", stamp.id)

    if (error) {
      throw error
    }
  }
}

export const revokePassportAppDisclosureGrant = async (
  req: NextApiRequest,
  grantId: string,
  requestId: string
) => {
  if (!grantId) {
    throw new ApiSecurityError(400, "invalid_request", "grantId is required.")
  }

  const supabase = getPassportSupabase()
  const { grantRows, subjectsById, userIds } = await loadOwnedAllowPageGrants(req)
  const grant = grantRows.find((row) => row.id === grantId)

  if (!grant) {
    throw new ApiSecurityError(404, "not_found", "Disclosure grant not found.")
  }

  const subject = subjectsById.get(grant.app_scoped_subject_id)
  if (!subject || !userIds.map(String).includes(String(subject.cubid_user_id))) {
    throw new ApiSecurityError(404, "not_found", "Disclosure grant not found.")
  }

  if (grant.revoked_at || grant.status === "revoked") {
    return {
      grantId,
      revokedAt: grant.revoked_at,
    }
  }

  const revokedAt = new Date().toISOString()

  const { error: revokeError } = await supabase
    .from("selective_disclosure_grants")
    .update({
      revoked_at: revokedAt,
      revoked_by: "user",
      status: "revoked",
      updated_at: revokedAt,
    })
    .eq("id", grantId)
    .eq("status", "active")

  if (revokeError) {
    throw revokeError
  }

  await revokeLegacyStampPermissions({
    dappUserUuid: subject.dapp_user_uuid,
    grant,
    userId: subject.cubid_user_id,
  })

  const { error: eventError } = await supabase
    .from("selective_disclosure_events")
    .insert({
      actor_identifier: subject.app_scoped_subject,
      actor_type: "user",
      app_scoped_subject_id: subject.id,
      details: {
        dapp_id: grant.dapp_id,
        revoked_by: "user",
        source: "allow_page",
      },
      disclosure_grant_id: grantId,
      event_type: "disclosure.revoked",
      outcome: "success",
      request_id: requestId || `passport_${randomUUID()}`,
    })

  if (eventError) {
    throw eventError
  }

  return {
    grantId,
    revokedAt,
  }
}
