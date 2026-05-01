import type { SupabaseClient } from "@supabase/supabase-js"
import { getStampTypeName } from "@cubid/stamps"

type AppScopedSubjectRow = {
  app_scoped_subject: string
  id: string
}

type SelectiveDisclosureGrantRow = {
  app_scoped_subject_id?: string | null
  granted_claims?: Array<{ claim?: unknown }> | null
  granted_scopes?: string[] | null
}

type StampLike = {
  id?: unknown
  stamptype?: unknown
}

type DappUserGrantLookup = {
  dappId: number | string
  dappUserUuid: string
}

type LegacyPermissionRow = {
  dappuser_id?: string | null
  stamp_id?: number | string | null
}

export type DappDisclosureGrantSet = {
  appScopedSubject: string | null
  grantedClaims: Set<string>
  grantedScopes: Set<string>
  grantedStampTypes: Set<string>
  hasStampScope: boolean
  legacyGrantedStampIds: Set<string>
}

const createEmptyDappDisclosureGrants = (): DappDisclosureGrantSet => ({
  appScopedSubject: null,
  grantedClaims: new Set(),
  grantedScopes: new Set(),
  grantedStampTypes: new Set(),
  hasStampScope: false,
  legacyGrantedStampIds: new Set(),
})

export const DISCLOSURE_CLAIMS = {
  locationApproximate: "location:approximate",
  locationExact: "location:exact",
  locationRough: "location:rough",
  locationWildcard: "location:*",
  profileName: "profile:name",
  profileWildcard: "profile:*",
} as const

export type LocationDisclosureLevel = "rough" | "approximate" | "exact"

export async function loadDappDisclosureGrants(
  supabase: SupabaseClient,
  input: {
    dappId: number | string
    dappUserUuid: string
    legacyStampId?: number | string
  }
): Promise<DappDisclosureGrantSet> {
  const grantsByUser = await loadDappDisclosureGrantsForUsers(supabase, [input], {
    legacyStampId: input.legacyStampId,
  })
  return grantsByUser.get(input.dappUserUuid) ?? createEmptyDappDisclosureGrants()
}

function mergeGrantRows(
  appScopedSubject: AppScopedSubjectRow | null,
  grants: SelectiveDisclosureGrantRow[],
  legacyPermissions: LegacyPermissionRow[] = []
): DappDisclosureGrantSet {
  const grantedClaims = new Set<string>()
  const grantedScopes = new Set<string>()
  const grantedStampTypes = new Set<string>()
  let hasStampScope = false

  for (const grant of grants) {
    for (const scope of grant.granted_scopes ?? []) {
      grantedScopes.add(scope)
    }

    if (grantedScopes.has("cubid:stamps")) {
      hasStampScope = true
    }

    for (const claim of grant.granted_claims ?? []) {
      if (typeof claim.claim !== "string") {
        continue
      }
      grantedClaims.add(claim.claim)
      if (claim.claim === "stamp:*") {
        grantedStampTypes.add("*")
        continue
      }
      if (claim.claim.startsWith("stamp:")) {
        grantedStampTypes.add(claim.claim.slice("stamp:".length))
      }
    }
  }

  return {
    appScopedSubject: appScopedSubject?.app_scoped_subject ?? null,
    grantedClaims,
    grantedScopes,
    grantedStampTypes,
    hasStampScope,
    legacyGrantedStampIds: new Set(
      legacyPermissions
        .map((row) => row.stamp_id)
        .filter((value): value is number | string => value !== null && value !== undefined)
        .map(String)
    ),
  }
}

export function hasDisclosedClaim(
  grants: DappDisclosureGrantSet | undefined,
  claim: string
): boolean {
  if (!grants) {
    return false
  }

  if (grants.grantedClaims.has(claim)) {
    return true
  }

  const namespace = claim.split(":")[0]
  return Boolean(namespace && grants.grantedClaims.has(`${namespace}:*`))
}

export function isProfileNameDisclosed(
  grants: DappDisclosureGrantSet | undefined
): boolean {
  return (
    hasDisclosedClaim(grants, DISCLOSURE_CLAIMS.profileName) ||
    Boolean(
      grants?.grantedScopes.has("profile") ||
        grants?.grantedScopes.has("cubid:profile")
    )
  )
}

export function isLocationDisclosed(
  grants: DappDisclosureGrantSet | undefined,
  level: LocationDisclosureLevel
): boolean {
  if (!grants) {
    return false
  }

  if (hasDisclosedClaim(grants, DISCLOSURE_CLAIMS.locationWildcard)) {
    return true
  }

  const grantedLevels = new Set<LocationDisclosureLevel>()
  if (hasDisclosedClaim(grants, DISCLOSURE_CLAIMS.locationExact)) {
    grantedLevels.add("exact")
    grantedLevels.add("approximate")
    grantedLevels.add("rough")
  }
  if (hasDisclosedClaim(grants, DISCLOSURE_CLAIMS.locationApproximate)) {
    grantedLevels.add("approximate")
    grantedLevels.add("rough")
  }
  if (hasDisclosedClaim(grants, DISCLOSURE_CLAIMS.locationRough)) {
    grantedLevels.add("rough")
  }

  return grantedLevels.has(level)
}

export function sanitizeDisclosedUserProfile<TUser extends Record<string, any>>(
  user: TUser | null | undefined,
  grants: DappDisclosureGrantSet | undefined
): Record<string, unknown> | null {
  if (!user) {
    return null
  }

  const exactLocationDisclosed = isLocationDisclosed(grants, "exact")
  const approximateLocationDisclosed = isLocationDisclosed(grants, "approximate")
  const roughLocationDisclosed = isLocationDisclosed(grants, "rough")

  return {
    address: exactLocationDisclosed ? user.address ?? null : null,
    cubid_country:
      roughLocationDisclosed || approximateLocationDisclosed || exactLocationDisclosed
        ? user.cubid_country ?? null
        : null,
    cubid_postalcode:
      approximateLocationDisclosed || exactLocationDisclosed
        ? user.cubid_postalcode ?? null
        : null,
    email: isStampTypeDisclosed(grants, "email") ? user.email ?? null : null,
    nickname: isProfileNameDisclosed(grants) ? user.nickname ?? null : null,
    phone: isStampTypeDisclosed(grants, "phone") ? user.phone ?? null : null,
  }
}

export async function loadDappDisclosureGrantsForUsers(
  supabase: SupabaseClient,
  users: DappUserGrantLookup[],
  options: {
    includeLegacyPermissions?: boolean
    legacyStampId?: number | string
  } = {}
): Promise<Map<string, DappDisclosureGrantSet>> {
  const result = new Map<string, DappDisclosureGrantSet>()
  const uniqueUsers = users.filter(
    (user, index, allUsers) =>
      user.dappUserUuid &&
      allUsers.findIndex((candidate) => candidate.dappUserUuid === user.dappUserUuid) === index
  )

  for (const user of uniqueUsers) {
    result.set(user.dappUserUuid, createEmptyDappDisclosureGrants())
  }

  if (!uniqueUsers.length) {
    return result
  }

  const dappUserUuids = uniqueUsers.map((user) => user.dappUserUuid)
  const { data: appScopedSubjects, error: subjectError } = await supabase
    .from("app_scoped_subjects")
    .select("id,app_scoped_subject,dapp_id,dapp_user_uuid")
    .in("dapp_user_uuid", dappUserUuids)
    .eq("status", "active")

  if (subjectError) {
    throw subjectError
  }

  const subjectsByUser = new Map<string, AppScopedSubjectRow>()
  for (const subject of (appScopedSubjects ?? []) as Array<AppScopedSubjectRow & { dapp_id?: unknown; dapp_user_uuid?: unknown }>) {
    const matchingUser = uniqueUsers.find(
      (user) =>
        String(user.dappId) === String(subject.dapp_id) &&
        user.dappUserUuid === String(subject.dapp_user_uuid)
    )

    if (matchingUser) {
      subjectsByUser.set(matchingUser.dappUserUuid, subject)
    }
  }

  const subjectIds = [...subjectsByUser.values()].map((subject) => subject.id)
  const grantsBySubjectId = new Map<string, SelectiveDisclosureGrantRow[]>()
  if (subjectIds.length) {
    const { data: grants, error: grantsError } = await supabase
      .from("selective_disclosure_grants")
      .select("app_scoped_subject_id,granted_scopes,granted_claims")
      .in("app_scoped_subject_id", subjectIds)
      .eq("status", "active")

    if (grantsError) {
      throw grantsError
    }

    for (const grant of (grants ?? []) as SelectiveDisclosureGrantRow[]) {
      const subjectId = String(grant.app_scoped_subject_id ?? "")
      if (!subjectId) {
        continue
      }

      const existing = grantsBySubjectId.get(subjectId) ?? []
      existing.push(grant)
      grantsBySubjectId.set(subjectId, existing)
    }
  }

  const legacyPermissionsByUser = new Map<string, LegacyPermissionRow[]>()
  if (options.includeLegacyPermissions ?? true) {
    let legacyQuery = supabase
      .from("stamp_dappuser_permissions")
      .select("dappuser_id,stamp_id")
      .in("dappuser_id", dappUserUuids)

    if (options.legacyStampId !== undefined) {
      legacyQuery = legacyQuery.eq("stamp_id", options.legacyStampId)
    }

    const { data: legacyPermissions, error: legacyError } = await legacyQuery

    if (legacyError) {
      throw legacyError
    }

    for (const permission of (legacyPermissions ?? []) as LegacyPermissionRow[]) {
      const dappUserUuid = String(permission.dappuser_id ?? "")
      if (!dappUserUuid) {
        continue
      }

      const existing = legacyPermissionsByUser.get(dappUserUuid) ?? []
      existing.push(permission)
      legacyPermissionsByUser.set(dappUserUuid, existing)
    }
  }

  for (const user of uniqueUsers) {
    const subject = subjectsByUser.get(user.dappUserUuid) ?? null
    result.set(
      user.dappUserUuid,
      mergeGrantRows(
        subject,
        subject ? grantsBySubjectId.get(subject.id) ?? [] : [],
        legacyPermissionsByUser.get(user.dappUserUuid) ?? []
      )
    )
  }

  return result
}

export async function loadDappDisclosureGrantsForStamp(
  supabase: SupabaseClient,
  users: DappUserGrantLookup[],
  stamp: StampLike | null | undefined
): Promise<Map<string, DappDisclosureGrantSet>> {
  return loadDappDisclosureGrantsForUsers(supabase, users, {
    legacyStampId:
      stamp?.id === null || stamp?.id === undefined ? undefined : String(stamp.id),
  })
}

export async function hasActiveSelectiveDisclosureGrants(
  supabase: SupabaseClient,
  input: {
    dappId: number | string
    dappUserUuid: string
  }
): Promise<boolean> {
  const grants = await loadDappDisclosureGrants(supabase, input)
  return grants.hasStampScope || grants.legacyGrantedStampIds.size > 0
}

export function isStampTypeDisclosed(
  grants: DappDisclosureGrantSet | undefined,
  stampTypeName: string
): boolean {
  if (!grants) {
    return false
  }

  return (
    grants.hasStampScope &&
    (grants.grantedStampTypes.has("*") ||
      grants.grantedStampTypes.has(stampTypeName))
  )
}

export function isStampDisclosed(
  grants: DappDisclosureGrantSet | undefined,
  stamp: StampLike | null | undefined
): boolean {
  if (!grants || !stamp) {
    return false
  }

  if (grants.legacyGrantedStampIds.has(String(stamp.id ?? ""))) {
    return true
  }

  const stampTypeId = Number(stamp.stamptype)
  if (!Number.isInteger(stampTypeId) || stampTypeId <= 0) {
    return false
  }

  return isStampTypeDisclosed(grants, getStampTypeName(stampTypeId))
}

export function filterDisclosedStamps<TStamp extends StampLike>(
  grants: DappDisclosureGrantSet,
  stamps: TStamp[]
): TStamp[] {
  return stamps.filter((stamp) => isStampDisclosed(grants, stamp))
}
