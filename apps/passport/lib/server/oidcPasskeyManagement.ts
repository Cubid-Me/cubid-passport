import { randomUUID } from "node:crypto"
import type { NextApiRequest } from "next"

import {
  PassportApiError,
  getPassportSupabase,
  normalizeStringArray,
  requirePassportFirebaseUser,
  resolveHumanSubjectKeys,
} from "./oidcConsentManagement"

export { sendPassportApiError } from "./oidcConsentManagement"

type PasskeyDeviceRow = {
  authenticator_attachment: string | null
  backup_eligible: boolean
  backup_state: boolean
  credential_id: string
  credential_label: string | null
  created_at: string
  device_id: string
  human_subject_key: string
  last_authenticated_at: string | null
  revoked_at: string | null
  revoked_by: "user" | "operator" | "system" | null
  sign_count: number
  transports: unknown
  updated_at: string
}

export type PassportPasskeyDeviceSummary = {
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

const mapPasskeyDevice = (
  row: PasskeyDeviceRow
): PassportPasskeyDeviceSummary => ({
  authenticatorAttachment: row.authenticator_attachment,
  backupEligible: row.backup_eligible,
  backupState: row.backup_state,
  createdAt: row.created_at,
  deviceId: row.device_id,
  label: row.credential_label ?? "Passkey",
  lastAuthenticatedAt: row.last_authenticated_at,
  revokedAt: row.revoked_at,
  revokedBy: row.revoked_by,
  signCount: Number(row.sign_count ?? 0),
  transports: normalizeStringArray(row.transports),
  updatedAt: row.updated_at,
})

const getOwnedPasskeyDevice = async (
  deviceId: string,
  subjectKeys: string[]
) => {
  const { data, error } = await getPassportSupabase()
    .from("oidc_webauthn_credentials")
    .select(
      "credential_id,device_id,human_subject_key,credential_label,authenticator_attachment,transports,backup_eligible,backup_state,sign_count,created_at,updated_at,last_authenticated_at,revoked_at,revoked_by"
    )
    .eq("device_id", deviceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const row = data as PasskeyDeviceRow | null
  if (!row || !subjectKeys.includes(row.human_subject_key)) {
    throw new PassportApiError(404, "Passkey device not found")
  }

  return row
}

export const listPassportPasskeyDevices = async (req: NextApiRequest) => {
  const token = await requirePassportFirebaseUser(req)
  const subjectKeys = await resolveHumanSubjectKeys(
    getPassportSupabase(),
    token
  )

  if (subjectKeys.length === 0) {
    return []
  }

  const { data, error } = await getPassportSupabase()
    .from("oidc_webauthn_credentials")
    .select(
      "credential_id,device_id,human_subject_key,credential_label,authenticator_attachment,transports,backup_eligible,backup_state,sign_count,created_at,updated_at,last_authenticated_at,revoked_at,revoked_by"
    )
    .in("human_subject_key", subjectKeys)
    .order("updated_at", { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as PasskeyDeviceRow[]).map(mapPasskeyDevice)
}

export const renamePassportPasskeyDevice = async (
  req: NextApiRequest,
  input: { deviceId: string; label: string },
  requestId: string
) => {
  const deviceId = input.deviceId?.trim()
  const label = input.label?.trim()

  if (!deviceId) {
    throw new PassportApiError(400, "deviceId is required")
  }

  if (!label || label.length > 80) {
    throw new PassportApiError(
      400,
      "label is required and must be 80 characters or fewer"
    )
  }

  const token = await requirePassportFirebaseUser(req)
  const subjectKeys = await resolveHumanSubjectKeys(
    getPassportSupabase(),
    token
  )
  const row = await getOwnedPasskeyDevice(deviceId, subjectKeys)

  if (row.revoked_at) {
    throw new PassportApiError(409, "Revoked passkeys cannot be renamed")
  }

  const now = new Date().toISOString()
  const { data, error } = await getPassportSupabase()
    .from("oidc_webauthn_credentials")
    .update({
      credential_label: label,
      updated_at: now,
    })
    .eq("device_id", deviceId)
    .select(
      "credential_id,device_id,human_subject_key,credential_label,authenticator_attachment,transports,backup_eligible,backup_state,sign_count,created_at,updated_at,last_authenticated_at,revoked_at,revoked_by"
    )
    .single()

  if (error) {
    throw error
  }

  const { error: auditError } = await getPassportSupabase()
    .from("oidc_audit_logs")
    .insert({
      log_id: `audit_${randomUUID()}`,
      event_type: "passkey.device.renamed",
      actor_type: "user",
      actor_identifier: row.human_subject_key,
      request_id: requestId,
      outcome: "success",
      details: {
        device_id: deviceId,
      },
    })

  if (auditError) {
    throw auditError
  }

  return mapPasskeyDevice(data as PasskeyDeviceRow)
}

export const revokePassportPasskeyDevice = async (
  req: NextApiRequest,
  deviceIdInput: string,
  requestId: string
) => {
  const deviceId = deviceIdInput?.trim()

  if (!deviceId) {
    throw new PassportApiError(400, "deviceId is required")
  }

  const supabase = getPassportSupabase()
  const token = await requirePassportFirebaseUser(req)
  const subjectKeys = await resolveHumanSubjectKeys(supabase, token)
  const row = await getOwnedPasskeyDevice(deviceId, subjectKeys)

  if (row.revoked_at) {
    return {
      deviceId,
      revokedAt: row.revoked_at,
    }
  }

  const revokedAt = new Date().toISOString()
  const { error: revokeError } = await supabase
    .from("oidc_webauthn_credentials")
    .update({
      revoked_at: revokedAt,
      revoked_by: "user",
      revoked_reason: "user_requested",
      updated_at: revokedAt,
    })
    .eq("device_id", deviceId)
    .is("revoked_at", null)

  if (revokeError) {
    throw revokeError
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("oidc_sessions")
    .select("session_id")
    .eq("webauthn_credential_id", row.credential_id)
    .is("revoked_at", null)

  if (sessionsError) {
    throw sessionsError
  }

  const sessionIds = ((sessions ?? []) as Array<{ session_id: string }>).map(
    (session) => session.session_id
  )

  if (sessionIds.length > 0) {
    const [sessionResponse, accessTokenResponse, refreshTokenResponse] =
      await Promise.all([
        supabase
          .from("oidc_sessions")
          .update({ revoked_at: revokedAt, updated_at: revokedAt })
          .in("session_id", sessionIds),
        supabase
          .from("oidc_access_tokens")
          .update({ revoked_at: revokedAt })
          .in("session_id", sessionIds)
          .is("revoked_at", null),
        supabase
          .from("oidc_refresh_tokens")
          .update({ revoked_at: revokedAt })
          .in("session_id", sessionIds)
          .is("revoked_at", null),
      ])

    if (sessionResponse.error) {
      throw sessionResponse.error
    }
    if (accessTokenResponse.error) {
      throw accessTokenResponse.error
    }
    if (refreshTokenResponse.error) {
      throw refreshTokenResponse.error
    }
  }

  const { error: auditError } = await supabase.from("oidc_audit_logs").insert({
    log_id: `audit_${randomUUID()}`,
    event_type: "passkey.device.revoked",
    actor_type: "user",
    actor_identifier: row.human_subject_key,
    request_id: requestId,
    outcome: "success",
    details: {
      device_id: deviceId,
      revoked_sessions: sessionIds.length,
    },
  })

  if (auditError) {
    throw auditError
  }

  return {
    deviceId,
    revokedAt,
  }
}
