import { ApiSecurityError } from "@cubid/auth/server"
import {
  getActorValidationPolicy,
  normalizeActorSelfIdentification,
  type CubidActorSelfIdentification,
  type CubidActorSelfIdentificationInput,
} from "@cubid/identity"

import type { PassportUserContext } from "./passportApi"

type ActorProfileRow = {
  actor_type: string
  affiliation_description?: string | null
  created_at?: string | null
  display_name?: string | null
  organization_kind?: string | null
  organization_subject_key?: string | null
  supported_human_subject_key?: string | null
  updated_at?: string | null
  agent_affiliation_type?: string | null
}

export type PassportActorProfileResponse = {
  actorType: CubidActorSelfIdentification["actorType"]
  agentAffiliation: CubidActorSelfIdentification["agentAffiliation"]
  createdAt: string | null
  displayName: string | null
  organizationKind: CubidActorSelfIdentification["organizationKind"]
  updatedAt: string | null
  validationPolicy: ReturnType<typeof getActorValidationPolicy>
}

const toApiSecurityError = (error: unknown) => {
  if (error instanceof ApiSecurityError) {
    return error
  }

  if (error instanceof Error) {
    return new ApiSecurityError(400, "invalid_request", error.message)
  }

  return new ApiSecurityError(
    400,
    "invalid_request",
    "Actor self-identification is invalid."
  )
}

const toResponse = (
  selfIdentification: CubidActorSelfIdentification,
  row?: Pick<ActorProfileRow, "created_at" | "updated_at"> | null
): PassportActorProfileResponse => ({
  actorType: selfIdentification.actorType,
  agentAffiliation: selfIdentification.agentAffiliation,
  createdAt: row?.created_at ?? null,
  displayName: selfIdentification.displayName,
  organizationKind: selfIdentification.organizationKind,
  updatedAt: row?.updated_at ?? null,
  validationPolicy: getActorValidationPolicy(selfIdentification.actorType),
})

const rowToInput = (row: ActorProfileRow): CubidActorSelfIdentificationInput => ({
  actorType: row.actor_type as CubidActorSelfIdentificationInput["actorType"],
  agentAffiliation: row.agent_affiliation_type
    ? {
        affiliationType:
          row.agent_affiliation_type as NonNullable<
            CubidActorSelfIdentificationInput["agentAffiliation"]
          >["affiliationType"],
        description: row.affiliation_description ?? null,
        organizationSubjectKey: row.organization_subject_key ?? null,
        supportedHumanSubjectKey: row.supported_human_subject_key ?? null,
      }
    : null,
  displayName: row.display_name ?? null,
  organizationKind:
    row.organization_kind as CubidActorSelfIdentificationInput["organizationKind"],
})

export const getPassportActorProfile = async (
  context: PassportUserContext
): Promise<PassportActorProfileResponse> => {
  const { data, error } = await context.supabase
    .from("actor_profiles")
    .select("*")
    .eq("firebase_uid", context.firebaseToken.uid)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const fallback = normalizeActorSelfIdentification({
      actorType: "human",
      displayName:
        (typeof context.firebaseToken.name === "string"
          ? context.firebaseToken.name
          : null) ??
        (typeof context.firebaseToken.email === "string"
          ? context.firebaseToken.email
          : null),
    })
    return toResponse(fallback, null)
  }

  try {
    return toResponse(
      normalizeActorSelfIdentification(rowToInput(data as ActorProfileRow)),
      data as ActorProfileRow
    )
  } catch (error) {
    throw toApiSecurityError(error)
  }
}

export const upsertPassportActorProfile = async (
  context: PassportUserContext,
  input: CubidActorSelfIdentificationInput
): Promise<PassportActorProfileResponse> => {
  let normalized: CubidActorSelfIdentification

  try {
    normalized = normalizeActorSelfIdentification(input)
  } catch (error) {
    throw toApiSecurityError(error)
  }

  const now = new Date().toISOString()
  const row = {
    actor_type: normalized.actorType,
    affiliation_description:
      normalized.agentAffiliation?.description?.trim() || null,
    display_name: normalized.displayName,
    firebase_uid: context.firebaseToken.uid,
    organization_kind: normalized.organizationKind,
    organization_subject_key:
      normalized.agentAffiliation?.organizationSubjectKey?.trim() || null,
    supported_human_subject_key:
      normalized.agentAffiliation?.supportedHumanSubjectKey?.trim() || null,
    agent_affiliation_type:
      normalized.agentAffiliation?.affiliationType ?? null,
    updated_at: now,
  }

  const { data, error } = await context.supabase
    .from("actor_profiles")
    .upsert(row, { onConflict: "firebase_uid" })
    .select("*")
    .maybeSingle()

  if (error) {
    throw error
  }

  return toResponse(normalized, (data as ActorProfileRow | null) ?? {
    created_at: now,
    updated_at: now,
  })
}

