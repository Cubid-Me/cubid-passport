import { randomUUID } from "node:crypto"

import {
  ApiSecurityError,
  decodeAes256GcmEnvelopeKey,
  decryptAes256GcmEnvelope,
  encryptAes256GcmEnvelope,
  type Aes256GcmEnvelopePayload,
} from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { DecodedIdToken } from "firebase-admin/auth"

import { RECOVERABLE_WALLET_ERROR_CODES } from "./recoverableWalletErrors"

export const RECOVERABLE_WALLET_RELEASE_SESSION_TTL_MS = 15 * 60 * 1000

export const RECOVERABLE_WALLET_BUNDLE_ALGORITHM =
  "aes-256-gcm-envelope" as const
export const RECOVERABLE_WALLET_BUNDLE_KEY_ID =
  "passport_recoverable_wallet_recovery_bundle_wrapping_key_v1" as const
export const RECOVERABLE_WALLET_BUNDLE_KEY_VERSION = 1
export const RECOVERABLE_WALLET_BUNDLE_PURPOSE =
  "recoverable_wallet_recovery_bundle" as const

export type RecoverableWalletBundleContext = {
  bundleVersion: number
  dappId: number | string
  dappUserUuid: string
  providerKey: string
  recoveryBundleId: string
  userId: number | string
}

export type EncryptedRecoverableWalletBundle = {
  bundle_auth_tag: string
  bundle_ciphertext: string
  bundle_iv: string
  encrypted_at: string
  encryption_algorithm: typeof RECOVERABLE_WALLET_BUNDLE_ALGORITHM
  encryption_context: RecoverableWalletBundleContext
  encryption_key_id: typeof RECOVERABLE_WALLET_BUNDLE_KEY_ID
  encryption_key_version: typeof RECOVERABLE_WALLET_BUNDLE_KEY_VERSION
  encryption_purpose: typeof RECOVERABLE_WALLET_BUNDLE_PURPOSE
  wrapped_data_key: string
  wrapped_data_key_auth_tag: string
  wrapped_data_key_iv: string
}

export type RecoverableWalletBundleSafeStatus = {
  bundleVersion: number | null
  createdAt: string | null
  dappUserUuid: string
  expiresAt: string | null
  lastReleasedAt: string | null
  providerKey: string | null
  recoveryBundleId: string | null
  recoveryReference: string | null
  revokedAt: string | null
  rotatedAt: string | null
  staleAt: string | null
  status: string
  updatedAt: string | null
}

export type RecoverableWalletRecoveryReleaseSession = {
  createdAt: string
  dappUserUuid: string
  expiresAt: string
  providerKey: string
  recoveryBundleId: string
  recoverySessionId: string
  recoveryUrl: string
  status: string
}

export const buildRecoverableWalletBundleContext = (
  context: RecoverableWalletBundleContext
): RecoverableWalletBundleContext => ({
  bundleVersion: Number(context.bundleVersion),
  dappId: String(context.dappId),
  dappUserUuid: context.dappUserUuid,
  providerKey: context.providerKey,
  recoveryBundleId: context.recoveryBundleId,
  userId: String(context.userId),
})

export async function getRecoverableWalletBundleWrappingKey(
  supabase: Pick<SupabaseClient, "rpc">
) {
  const { data, error } = await supabase.rpc(
    "get_recoverable_wallet_recovery_bundle_wrapping_key_v1"
  )

  if (error) {
    throw error
  }

  if (typeof data !== "string") {
    throw new Error("Recoverable wallet bundle wrapping key is not configured.")
  }

  return decodeAes256GcmEnvelopeKey(
    data,
    "Recoverable wallet bundle wrapping key"
  )
}

export function encryptRecoverableWalletBundleWithKey(
  plaintext: string,
  wrappingKey: Buffer,
  context: RecoverableWalletBundleContext
): EncryptedRecoverableWalletBundle {
  const normalizedContext = buildRecoverableWalletBundleContext(context)
  const encrypted = encryptAes256GcmEnvelope(plaintext, wrappingKey, {
    context: normalizedContext,
    keyId: RECOVERABLE_WALLET_BUNDLE_KEY_ID,
    keyVersion: RECOVERABLE_WALLET_BUNDLE_KEY_VERSION,
    purpose: RECOVERABLE_WALLET_BUNDLE_PURPOSE,
  })

  return {
    bundle_auth_tag: encrypted.authTag,
    bundle_ciphertext: encrypted.ciphertext,
    bundle_iv: encrypted.iv,
    encrypted_at: new Date().toISOString(),
    encryption_algorithm: encrypted.algorithm,
    encryption_context: normalizedContext,
    encryption_key_id: RECOVERABLE_WALLET_BUNDLE_KEY_ID,
    encryption_key_version: RECOVERABLE_WALLET_BUNDLE_KEY_VERSION,
    encryption_purpose: RECOVERABLE_WALLET_BUNDLE_PURPOSE,
    wrapped_data_key: encrypted.wrappedDataKey,
    wrapped_data_key_auth_tag: encrypted.wrappedDataKeyAuthTag,
    wrapped_data_key_iv: encrypted.wrappedDataKeyIv,
  }
}

export async function encryptRecoverableWalletBundle(
  supabase: Pick<SupabaseClient, "rpc">,
  plaintext: string,
  context: RecoverableWalletBundleContext
) {
  const wrappingKey = await getRecoverableWalletBundleWrappingKey(supabase)
  return encryptRecoverableWalletBundleWithKey(plaintext, wrappingKey, context)
}

export function decryptRecoverableWalletBundleWithKey(
  row: Record<string, unknown>,
  wrappingKey: Buffer,
  context: RecoverableWalletBundleContext
) {
  const envelope: Aes256GcmEnvelopePayload = {
    algorithm: RECOVERABLE_WALLET_BUNDLE_ALGORITHM,
    authTag: String(row.bundle_auth_tag),
    ciphertext: String(row.bundle_ciphertext),
    iv: String(row.bundle_iv),
    keyId: String(row.encryption_key_id),
    keyVersion: Number(row.encryption_key_version),
    purpose: RECOVERABLE_WALLET_BUNDLE_PURPOSE,
    wrappedDataKey: String(row.wrapped_data_key),
    wrappedDataKeyAuthTag: String(row.wrapped_data_key_auth_tag),
    wrappedDataKeyIv: String(row.wrapped_data_key_iv),
  }

  return decryptAes256GcmEnvelope(
    envelope,
    wrappingKey,
    buildRecoverableWalletBundleContext(context)
  )
}

const generateRecoveryBundleId = () =>
  `rw_bundle_${randomUUID().replace(/-/g, "")}`

const generateRecoverySessionId = () =>
  `rw_release_${randomUUID().replace(/-/g, "")}`

const normalizeProviderKey = (value: string | null | undefined) =>
  (value ?? "cubid").trim().toLowerCase()

const toIsoOrNull = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null

export const mapRecoverableWalletBundleStatus = (
  row: Record<string, unknown> | null,
  dappUserUuid: string
): RecoverableWalletBundleSafeStatus => {
  if (!row) {
    return {
      bundleVersion: null,
      createdAt: null,
      dappUserUuid,
      expiresAt: null,
      lastReleasedAt: null,
      providerKey: null,
      recoveryBundleId: null,
      recoveryReference: null,
      revokedAt: null,
      rotatedAt: null,
      staleAt: null,
      status: "not_enrolled",
      updatedAt: null,
    }
  }

  return {
    bundleVersion:
      row.bundle_version == null ? null : Number(row.bundle_version),
    createdAt: toIsoOrNull(row.created_at),
    dappUserUuid: String(row.dapp_user_uuid ?? dappUserUuid),
    expiresAt: toIsoOrNull(row.expires_at),
    lastReleasedAt: toIsoOrNull(row.last_released_at),
    providerKey: String(row.provider_key ?? "cubid"),
    recoveryBundleId: String(row.recovery_bundle_id),
    recoveryReference:
      row.recovery_reference == null ? null : String(row.recovery_reference),
    revokedAt: toIsoOrNull(row.revoked_at),
    rotatedAt: toIsoOrNull(row.rotated_at),
    staleAt: toIsoOrNull(row.stale_at),
    status: String(row.status ?? "active"),
    updatedAt: toIsoOrNull(row.updated_at),
  }
}

export async function assertDappUserForRecoverableWalletBundle(input: {
  dappId: number | string
  dappUserUuid: string
  supabase: SupabaseClient
}) {
  const { data, error } = await input.supabase
    .from("dapp_users")
    .select("uuid,dapp_id,user_id")
    .eq("uuid", input.dappUserUuid)
    .eq("dapp_id", input.dappId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.user_id == null) {
    throw new ApiSecurityError(
      404,
      RECOVERABLE_WALLET_ERROR_CODES.unsupportedAppContext,
      "Dapp user was not found for the authenticated app."
    )
  }

  return data as {
    dapp_id: number | string
    user_id: number | string
    uuid: string
  }
}

async function writeRecoverableWalletSecurityEvent(input: {
  actorIdentifier?: string | null
  actorType: "dapp" | "user"
  dappId?: number | string | null
  dappUserUuid?: string | null
  eventType: string
  outcome: "failure" | "success"
  recoveryBundleId?: string | null
  recoverySessionId?: string | null
  requestId: string
  route: string
  supabase: SupabaseClient
}) {
  const { error } = await input.supabase.from("api_security_events").insert({
    actor_identifier: input.actorIdentifier ?? null,
    actor_type: input.actorType,
    details: {
      dappId: input.dappId == null ? null : String(input.dappId),
      dappUserUuid: input.dappUserUuid ?? null,
      recoveryBundleId: input.recoveryBundleId ?? null,
      recoverySessionId: input.recoverySessionId ?? null,
    },
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

export async function enrollRecoverableWalletRecoveryBundle(input: {
  actorIdentifier?: string | null
  bundleMaterial: string
  bundleVersion?: number | null
  dappId: number | string
  dappUserUuid: string
  expiresAt?: string | null
  metadata?: Record<string, unknown> | null
  providerKey?: string | null
  recoveryBundleId?: string | null
  recoveryReference?: string | null
  requestId: string
  supabase: SupabaseClient
}): Promise<RecoverableWalletBundleSafeStatus> {
  const dappUser = await assertDappUserForRecoverableWalletBundle({
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    supabase: input.supabase,
  })
  const providerKey = normalizeProviderKey(input.providerKey)
  const bundleVersion = Number(input.bundleVersion ?? 1)
  const recoveryBundleId =
    input.recoveryBundleId?.trim() || generateRecoveryBundleId()
  const encryptedBundle = await encryptRecoverableWalletBundle(
    input.supabase,
    input.bundleMaterial,
    {
      bundleVersion,
      dappId: input.dappId,
      dappUserUuid: input.dappUserUuid,
      providerKey,
      recoveryBundleId,
      userId: dappUser.user_id,
    }
  )

  const row = {
    ...encryptedBundle,
    bundle_version: bundleVersion,
    dapp_id: input.dappId,
    dapp_user_uuid: input.dappUserUuid,
    expires_at: input.expiresAt ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      createdBy: "api_v3.recovery_bundles.enroll",
      requestId: input.requestId,
    },
    provider_key: providerKey,
    recovery_bundle_id: recoveryBundleId,
    recovery_reference: input.recoveryReference ?? null,
    status: "active",
    user_id: dappUser.user_id,
  }

  const { data: existingRow, error: existingError } = await input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .select("*")
    .eq("recovery_bundle_id", recoveryBundleId)
    .eq("dapp_id", input.dappId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  const query = existingRow
    ? input.supabase
        .schema("private")
        .from("recoverable_wallet_recovery_bundles")
        .update({
          ...row,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRow.id)
        .select("*")
    : input.supabase
        .schema("private")
        .from("recoverable_wallet_recovery_bundles")
        .insert(row)
        .select("*")

  const { data: storedRow, error: storeError } = await query.maybeSingle()

  if (storeError) {
    throw storeError
  }

  await writeRecoverableWalletSecurityEvent({
    actorIdentifier: input.actorIdentifier ?? null,
    actorType: "dapp",
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    eventType: existingRow
      ? "recoverable_wallet.bundle.updated"
      : "recoverable_wallet.bundle.enrolled",
    outcome: "success",
    recoveryBundleId,
    requestId: input.requestId,
    route: "v3.recovery_bundles.enroll",
    supabase: input.supabase,
  })

  return mapRecoverableWalletBundleStatus(
    storedRow as Record<string, unknown> | null,
    input.dappUserUuid
  )
}

export async function getRecoverableWalletRecoveryBundleStatus(input: {
  dappId: number | string
  dappUserUuid: string
  providerKey?: string | null
  recoveryBundleId?: string | null
  supabase: SupabaseClient
}): Promise<RecoverableWalletBundleSafeStatus> {
  await assertDappUserForRecoverableWalletBundle({
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    supabase: input.supabase,
  })

  let query = input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .select("*")
    .eq("dapp_id", input.dappId)
    .eq("dapp_user_uuid", input.dappUserUuid)

  if (input.recoveryBundleId) {
    query = query.eq("recovery_bundle_id", input.recoveryBundleId)
  }

  if (input.providerKey) {
    query = query.eq("provider_key", normalizeProviderKey(input.providerKey))
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return mapRecoverableWalletBundleStatus(
    data as Record<string, unknown> | null,
    input.dappUserUuid
  )
}

const mapRecoveryReleaseSession = (
  row: Record<string, unknown>
): RecoverableWalletRecoveryReleaseSession => {
  const recoverySessionId = String(row.recovery_session_id)
  return {
    createdAt: String(row.created_at),
    dappUserUuid: String(row.dapp_user_uuid),
    expiresAt: String(row.expires_at),
    providerKey: String(row.provider_key ?? "cubid"),
    recoveryBundleId: String(row.recovery_bundle_id),
    recoverySessionId,
    recoveryUrl: `/recovery/wallet?recovery_session_id=${encodeURIComponent(
      recoverySessionId
    )}`,
    status: String(row.status ?? "pending"),
  }
}

export async function createRecoverableWalletRecoveryReleaseSession(input: {
  actorIdentifier: string
  dappId: number | string
  dappUserUuid: string
  providerKey?: string | null
  recoveryBundleId?: string | null
  requestId: string
  supabase: SupabaseClient
}): Promise<RecoverableWalletRecoveryReleaseSession> {
  const dappUser = await assertDappUserForRecoverableWalletBundle({
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    supabase: input.supabase,
  })
  const providerKey = normalizeProviderKey(input.providerKey)
  let bundleQuery = input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .select("*")
    .eq("dapp_id", input.dappId)
    .eq("dapp_user_uuid", input.dappUserUuid)
    .eq("user_id", dappUser.user_id)
    .eq("provider_key", providerKey)
    .eq("status", "active")

  if (input.recoveryBundleId) {
    bundleQuery = bundleQuery.eq("recovery_bundle_id", input.recoveryBundleId)
  }

  const { data: bundle, error: bundleError } = await bundleQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (bundleError) {
    throw bundleError
  }

  if (!bundle) {
    if (input.recoveryBundleId) {
      const { data: unavailableBundle, error: unavailableError } =
        await input.supabase
          .schema("private")
          .from("recoverable_wallet_recovery_bundles")
          .select("status")
          .eq("recovery_bundle_id", input.recoveryBundleId)
          .maybeSingle()

      if (unavailableError) {
        throw unavailableError
      }

      if (unavailableBundle?.status === "revoked") {
        throw new ApiSecurityError(
          409,
          RECOVERABLE_WALLET_ERROR_CODES.bundleRevoked,
          "Recovery bundle has been revoked."
        )
      }
    }

    throw new ApiSecurityError(
      404,
      RECOVERABLE_WALLET_ERROR_CODES.bundleNotFound,
      "Recovery bundle was not found for the authenticated app."
    )
  }

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + RECOVERABLE_WALLET_RELEASE_SESSION_TTL_MS
  ).toISOString()
  const { data: session, error: sessionError } = await input.supabase
    .from("recoverable_wallet_recovery_sessions")
    .insert({
      created_by_actor_identifier: input.actorIdentifier,
      dapp_id: input.dappId,
      dapp_user_uuid: input.dappUserUuid,
      expires_at: expiresAt,
      metadata: {
        createdBy: "api_v3.recovery_bundles.release.start",
        requestId: input.requestId,
      },
      provider_key: providerKey,
      recovery_bundle_id: String(bundle.recovery_bundle_id),
      recovery_session_id: generateRecoverySessionId(),
      request_id: input.requestId,
      status: "pending",
      user_id: dappUser.user_id,
    })
    .select("*")
    .maybeSingle()

  if (sessionError) {
    throw sessionError
  }

  return mapRecoveryReleaseSession(session as Record<string, unknown>)
}

async function resolveUserIdsFromFirebaseToken(
  supabase: SupabaseClient,
  token: DecodedIdToken
) {
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

    if (data?.id != null) {
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

    if (data?.id != null) {
      userIds.add(String(data.id))
    }
  }

  return userIds
}

export async function releaseRecoverableWalletRecoveryBundle(input: {
  firebaseToken: DecodedIdToken
  recoverySessionId: string
  requestId: string
  supabase: SupabaseClient
}) {
  const { data: session, error: sessionError } = await input.supabase
    .from("recoverable_wallet_recovery_sessions")
    .select("*")
    .eq("recovery_session_id", input.recoverySessionId)
    .maybeSingle()

  if (sessionError) {
    throw sessionError
  }

  if (!session) {
    throw new ApiSecurityError(
      404,
      RECOVERABLE_WALLET_ERROR_CODES.bundleNotFound,
      "Recovery session was not found."
    )
  }

  if (session.status !== "pending" || session.consumed_at) {
    throw new ApiSecurityError(
      409,
      RECOVERABLE_WALLET_ERROR_CODES.consumed,
      "Recovery session has already been consumed."
    )
  }

  if (new Date(String(session.expires_at)).getTime() <= Date.now()) {
    await input.supabase
      .from("recoverable_wallet_recovery_sessions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)

    throw new ApiSecurityError(
      410,
      RECOVERABLE_WALLET_ERROR_CODES.expired,
      "Recovery session has expired."
    )
  }

  const userIds = await resolveUserIdsFromFirebaseToken(
    input.supabase,
    input.firebaseToken
  )

  if (!userIds.has(String(session.user_id))) {
    throw new ApiSecurityError(
      403,
      RECOVERABLE_WALLET_ERROR_CODES.wrongUser,
      "Signed-in Passport user does not match this recovery session."
    )
  }

  const { data: bundle, error: bundleError } = await input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .select("*")
    .eq("recovery_bundle_id", session.recovery_bundle_id)
    .eq("dapp_id", session.dapp_id)
    .eq("dapp_user_uuid", session.dapp_user_uuid)
    .eq("user_id", session.user_id)
    .eq("provider_key", session.provider_key)
    .eq("status", "active")
    .maybeSingle()

  if (bundleError) {
    throw bundleError
  }

  if (!bundle) {
    throw new ApiSecurityError(
      409,
      RECOVERABLE_WALLET_ERROR_CODES.bundleRevoked,
      "Recovery bundle is no longer active for this session."
    )
  }

  const wrappingKey = await getRecoverableWalletBundleWrappingKey(input.supabase)
  const bundleMaterial = decryptRecoverableWalletBundleWithKey(
    bundle as Record<string, unknown>,
    wrappingKey,
    {
      bundleVersion: Number(bundle.bundle_version ?? 1),
      dappId: String(bundle.dapp_id),
      dappUserUuid: String(bundle.dapp_user_uuid),
      providerKey: String(bundle.provider_key ?? "cubid"),
      recoveryBundleId: String(bundle.recovery_bundle_id),
      userId: String(bundle.user_id),
    }
  )
  const releasedAt = new Date().toISOString()
  const { data: updatedSession, error: updateSessionError } =
    await input.supabase
      .from("recoverable_wallet_recovery_sessions")
      .update({
        consumed_at: releasedAt,
        released_at: releasedAt,
        status: "released",
        updated_at: releasedAt,
      })
      .eq("id", session.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle()

  if (updateSessionError) {
    throw updateSessionError
  }

  if (!updatedSession) {
    throw new ApiSecurityError(
      409,
      RECOVERABLE_WALLET_ERROR_CODES.consumed,
      "Recovery session has already been consumed."
    )
  }

  const { error: updateBundleError } = await input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .update({
      last_released_at: releasedAt,
      updated_at: releasedAt,
    })
    .eq("id", bundle.id)

  if (updateBundleError) {
    throw updateBundleError
  }

  await writeRecoverableWalletSecurityEvent({
    actorIdentifier: input.firebaseToken.uid,
    actorType: "user",
    dappId: session.dapp_id,
    dappUserUuid: String(session.dapp_user_uuid),
    eventType: "recoverable_wallet.bundle.released",
    outcome: "success",
    recoveryBundleId: String(session.recovery_bundle_id),
    recoverySessionId: String(session.recovery_session_id),
    requestId: input.requestId,
    route: "passport.recovery_bundles.release.complete",
    supabase: input.supabase,
  })

  return {
    bundleMaterial,
    dappUserUuid: String(session.dapp_user_uuid),
    providerKey: String(session.provider_key ?? "cubid"),
    recoveryBundleId: String(session.recovery_bundle_id),
    recoverySessionId: String(session.recovery_session_id),
    releasedAt,
    status: "released",
  }
}

export async function rotateRecoverableWalletRecoveryBundle(input: {
  actorIdentifier: string
  bundleMaterial: string
  dappId: number | string
  dappUserUuid: string
  expiresAt?: string | null
  metadata?: Record<string, unknown> | null
  newRecoveryBundleId?: string | null
  providerKey?: string | null
  recoveryBundleId: string
  recoveryReference?: string | null
  requestId: string
  supabase: SupabaseClient
}) {
  const dappUser = await assertDappUserForRecoverableWalletBundle({
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    supabase: input.supabase,
  })
  const providerKey = normalizeProviderKey(input.providerKey)
  const { data: existingBundle, error: existingError } = await input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .select("*")
    .eq("dapp_id", input.dappId)
    .eq("dapp_user_uuid", input.dappUserUuid)
    .eq("user_id", dappUser.user_id)
    .eq("provider_key", providerKey)
    .eq("recovery_bundle_id", input.recoveryBundleId)
    .eq("status", "active")
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (!existingBundle) {
    throw new ApiSecurityError(
      404,
      RECOVERABLE_WALLET_ERROR_CODES.bundleNotFound,
      "Active recovery bundle was not found for rotation."
    )
  }

  const rotatedAt = new Date().toISOString()
  const { error: rotateError } = await input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .update({
      rotated_at: rotatedAt,
      status: "rotated",
      updated_at: rotatedAt,
    })
    .eq("id", existingBundle.id)

  if (rotateError) {
    throw rotateError
  }

  const nextVersion = Number(existingBundle.bundle_version ?? 1) + 1
  const rotated = await enrollRecoverableWalletRecoveryBundle({
    actorIdentifier: input.actorIdentifier,
    bundleMaterial: input.bundleMaterial,
    bundleVersion: nextVersion,
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    expiresAt: input.expiresAt ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      rotatedFromRecoveryBundleId: input.recoveryBundleId,
    },
    providerKey,
    recoveryBundleId: input.newRecoveryBundleId ?? null,
    recoveryReference: input.recoveryReference ?? null,
    requestId: input.requestId,
    supabase: input.supabase,
  })

  await writeRecoverableWalletSecurityEvent({
    actorIdentifier: input.actorIdentifier,
    actorType: "dapp",
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    eventType: "recoverable_wallet.bundle.rotated",
    outcome: "success",
    recoveryBundleId: input.recoveryBundleId,
    requestId: input.requestId,
    route: "v3.recovery_bundles.rotate",
    supabase: input.supabase,
  })

  return rotated
}

export async function revokeRecoverableWalletRecoveryBundle(input: {
  actorIdentifier: string
  dappId: number | string
  dappUserUuid: string
  providerKey?: string | null
  recoveryBundleId: string
  requestId: string
  supabase: SupabaseClient
}) {
  const dappUser = await assertDappUserForRecoverableWalletBundle({
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    supabase: input.supabase,
  })
  const revokedAt = new Date().toISOString()
  const query = input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .update({
      revoked_at: revokedAt,
      status: "revoked",
      updated_at: revokedAt,
    })
    .eq("dapp_id", input.dappId)
    .eq("dapp_user_uuid", input.dappUserUuid)
    .eq("user_id", dappUser.user_id)
    .eq("recovery_bundle_id", input.recoveryBundleId)
    .eq("provider_key", normalizeProviderKey(input.providerKey))
    .select("*")

  const { data: revokedBundle, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  if (!revokedBundle) {
    throw new ApiSecurityError(
      404,
      RECOVERABLE_WALLET_ERROR_CODES.bundleNotFound,
      "Recovery bundle was not found for revocation."
    )
  }

  await writeRecoverableWalletSecurityEvent({
    actorIdentifier: input.actorIdentifier,
    actorType: "dapp",
    dappId: input.dappId,
    dappUserUuid: input.dappUserUuid,
    eventType: "recoverable_wallet.bundle.revoked",
    outcome: "success",
    recoveryBundleId: input.recoveryBundleId,
    requestId: input.requestId,
    route: "v3.recovery_bundles.revoke",
    supabase: input.supabase,
  })

  return mapRecoverableWalletBundleStatus(
    revokedBundle as Record<string, unknown>,
    input.dappUserUuid
  )
}

export async function listRecoverableWalletRecoveryBundlesForUser(input: {
  firebaseToken: DecodedIdToken
  supabase: SupabaseClient
}): Promise<RecoverableWalletBundleSafeStatus[]> {
  const userIds = await resolveUserIdsFromFirebaseToken(
    input.supabase,
    input.firebaseToken
  )

  if (userIds.size === 0) {
    return []
  }

  const { data, error } = await input.supabase
    .schema("private")
    .from("recoverable_wallet_recovery_bundles")
    .select("*")
    .in("user_id", [...userIds])
    .order("updated_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) =>
    mapRecoverableWalletBundleStatus(
      row as Record<string, unknown>,
      String(row.dapp_user_uuid)
    )
  )
}
