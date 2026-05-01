import type { SupabaseClient } from "@supabase/supabase-js"
import { getStampTypeName } from "@cubid/stamps"

type AppScopedSubjectRow = {
  app_scoped_subject: string
  id: string
}

type SelectiveDisclosureGrantRow = {
  granted_claims?: Array<{ claim?: unknown }> | null
  granted_scopes?: string[] | null
}

type StampLike = {
  stamptype?: unknown
}

export type DappDisclosureGrantSet = {
  appScopedSubject: string | null
  grantedStampTypes: Set<string>
  hasStampScope: boolean
}

export const EMPTY_DAPP_DISCLOSURE_GRANTS: DappDisclosureGrantSet = {
  appScopedSubject: null,
  grantedStampTypes: new Set(),
  hasStampScope: false,
}

export async function loadDappDisclosureGrants(
  supabase: SupabaseClient,
  input: {
    dappId: number | string
    dappUserUuid: string
  }
): Promise<DappDisclosureGrantSet> {
  const { data: appScopedSubject, error: subjectError } = await supabase
    .from("app_scoped_subjects")
    .select("id,app_scoped_subject")
    .eq("dapp_id", input.dappId)
    .eq("dapp_user_uuid", input.dappUserUuid)
    .eq("status", "active")
    .maybeSingle()

  if (subjectError) {
    throw subjectError
  }

  if (!appScopedSubject) {
    return EMPTY_DAPP_DISCLOSURE_GRANTS
  }

  const subject = appScopedSubject as AppScopedSubjectRow
  const { data: grants, error: grantsError } = await supabase
    .from("selective_disclosure_grants")
    .select("granted_scopes,granted_claims")
    .eq("app_scoped_subject_id", subject.id)
    .eq("dapp_id", input.dappId)
    .eq("status", "active")

  if (grantsError) {
    throw grantsError
  }

  const grantedStampTypes = new Set<string>()
  let hasStampScope = false

  for (const grant of (grants ?? []) as SelectiveDisclosureGrantRow[]) {
    if ((grant.granted_scopes ?? []).includes("cubid:stamps")) {
      hasStampScope = true
    }

    for (const claim of grant.granted_claims ?? []) {
      if (typeof claim.claim !== "string") {
        continue
      }
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
    appScopedSubject: subject.app_scoped_subject,
    grantedStampTypes,
    hasStampScope,
  }
}

export function isStampTypeDisclosed(
  grants: DappDisclosureGrantSet,
  stampTypeName: string
): boolean {
  return (
    grants.hasStampScope &&
    (grants.grantedStampTypes.has("*") ||
      grants.grantedStampTypes.has(stampTypeName))
  )
}

export function isStampDisclosed(
  grants: DappDisclosureGrantSet,
  stamp: StampLike
): boolean {
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
