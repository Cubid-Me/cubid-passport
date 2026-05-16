import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

import {
  ApiSecurityError,
  decodeAes256GcmEnvelopeKey,
  decryptAes256GcmEnvelope,
  encryptAes256GcmEnvelope,
  type Aes256GcmEnvelopePayload,
} from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { sendOtpEmail } from "./emailOtp"
import type { PassportUserContext } from "./passportApi"

const CHANNEL_DESTINATION_ALGORITHM = "aes-256-gcm-envelope" as const
const CHANNEL_DESTINATION_KEY_ID =
  "passport_notification_channel_wrapping_key_v1" as const
const CHANNEL_DESTINATION_KEY_VERSION = 1
const CHANNEL_DESTINATION_PURPOSE = "notification_channel_destination" as const
const CHALLENGE_PURPOSE = "notification_channel_verification" as const
const CHALLENGE_HASH_ALGORITHM = "hmac-sha256" as const
const CHALLENGE_HASH_VERSION = 1
const CHALLENGE_EXPIRY_MS = 10 * 60 * 1000
const CHALLENGE_MAX_ATTEMPTS = 3

type ChannelType = "email" | "telegram"
type ChannelStatus = "active" | "muted" | "paused" | "revoked" | "archived"
type PriorityFloor = "LOW" | "NORMAL" | "HIGH" | "CRITICAL"

type UserRow = {
  id: number | string
}

type ChannelRow = {
  channel_type: ChannelType
  created_at: string
  display_hint: string | null
  id: string
  is_default: boolean
  label: string | null
  metadata: Record<string, unknown> | null
  muted_until: string | null
  paused_until: string | null
  provider_key: string
  revoked_at: string | null
  status: ChannelStatus
  updated_at: string
  user_id: number | string
  verification_status: "pending" | "verified" | "failed" | "revoked"
  verified_at: string | null
}

type ChallengeRow = {
  attempt_count: number
  challenge_hash: string
  channel_id: string
  channel_type: ChannelType
  consumed_at: string | null
  expires_at: string
  id: string
  max_attempts: number
  provider_key: string
  status: "pending" | "consumed" | "expired" | "failed" | "revoked"
  user_id: number | string
}

type PreferenceRow = {
  category_key: string
  channel_id: string | null
  created_at: string
  dapp_id: number | string | null
  id: string
  metadata: Record<string, unknown> | null
  muted_until: string | null
  paused_until: string | null
  priority_floor: PriorityFloor
  status: "active" | "muted" | "paused" | "revoked"
  updated_at: string
  user_id: number | string
}

export type NotificationChannelSummary = {
  channelId: string
  channelType: ChannelType
  createdAt: string
  displayHint: string | null
  isDefault: boolean
  label: string | null
  mutedUntil: string | null
  pausedUntil: string | null
  providerKey: string
  revokedAt: string | null
  status: ChannelStatus
  updatedAt: string
  verificationStatus: string
  verifiedAt: string | null
}

export type NotificationPreferenceSummary = {
  categoryKey: string
  channelId: string | null
  createdAt: string
  dappId: string | null
  mutedUntil: string | null
  pausedUntil: string | null
  preferenceId: string
  priorityFloor: PriorityFloor
  status: string
  updatedAt: string
}

export type StartChannelVerificationInput = {
  channelType: ChannelType
  destination: string
  isDefault?: boolean
  label?: string
}

export type CompleteChannelVerificationInput = {
  challengeId: string
  code: string
}

export type UpdateChannelInput = {
  channelId: string
  isDefault?: boolean
  label?: string | null
  mutedUntil?: string | null
  pausedUntil?: string | null
  status?: Extract<ChannelStatus, "active" | "muted" | "paused" | "revoked">
}

export type UpdatePreferenceInput = {
  categoryKey: "SECURITY" | "TRANSACTIONAL" | "WORKFLOW"
  channelId?: string | null
  dappId?: number | string | null
  mutedUntil?: string | null
  pausedUntil?: string | null
  priorityFloor?: PriorityFloor
  status?: "active" | "muted" | "paused" | "revoked"
}

type EncryptedChannelDestination = {
  destination_auth_tag: string
  destination_ciphertext: string
  destination_iv: string
  encrypted_at: string
  encryption_algorithm: typeof CHANNEL_DESTINATION_ALGORITHM
  encryption_context: Record<string, string | number | boolean | null>
  encryption_key_id: typeof CHANNEL_DESTINATION_KEY_ID
  encryption_key_version: typeof CHANNEL_DESTINATION_KEY_VERSION
  encryption_purpose: typeof CHANNEL_DESTINATION_PURPOSE
  wrapped_data_key: string
  wrapped_data_key_auth_tag: string
  wrapped_data_key_iv: string
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const normalizeTelegramDestination = (destination: string) =>
  destination.trim().replace(/^@/, "")

const normalizeDestination = (channelType: ChannelType, destination: string) =>
  channelType === "email"
    ? normalizeEmail(destination)
    : normalizeTelegramDestination(destination)

const getProviderKey = (channelType: ChannelType) =>
  channelType === "email" ? "email_smtp" : "telegram_bot"

const createVerificationCode = () =>
  String(randomInt(1000, 10000)).padStart(4, "0")

const createExpiry = () =>
  new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString()

const toHex = (value: Buffer) => value.toString("hex")

const maskEmail = (email: string) => {
  const [local = "", domain = ""] = email.split("@")
  const first = local.slice(0, 1)
  return `${first || "*"}***@${domain || "unknown"}`
}

const maskTelegram = (destination: string) => {
  const normalized = normalizeTelegramDestination(destination)
  if (normalized.length <= 4) {
    return "Telegram destination"
  }
  return `Telegram ending ${normalized.slice(-4)}`
}

const maskDestination = (channelType: ChannelType, destination: string) =>
  channelType === "email" ? maskEmail(destination) : maskTelegram(destination)

const assertNonEmptyDestination = (
  channelType: ChannelType,
  destination: string
) => {
  const normalized = normalizeDestination(channelType, destination)

  if (!normalized) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Notification channel destination is required."
    )
  }

  if (channelType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Email notification channel destination must be a valid email address."
    )
  }

  return normalized
}

export const buildNotificationChannelEncryptionContext = (input: {
  channelId: string
  channelType: ChannelType
  userId: number | string
}) => ({
  algorithm: CHANNEL_DESTINATION_ALGORITHM,
  channelId: input.channelId,
  channelType: input.channelType,
  keyId: CHANNEL_DESTINATION_KEY_ID,
  keyVersion: CHANNEL_DESTINATION_KEY_VERSION,
  purpose: CHANNEL_DESTINATION_PURPOSE,
  userId: String(input.userId),
})

async function getNotificationChannelWrappingKey(
  supabase: Pick<SupabaseClient, "rpc">
) {
  const { data, error } = await supabase.rpc(
    "get_notification_channel_wrapping_key_v1"
  )

  if (error) {
    throw error
  }

  if (typeof data !== "string") {
    throw new Error("Notification channel wrapping key is not configured.")
  }

  return decodeAes256GcmEnvelopeKey(
    data,
    "Notification channel wrapping key"
  )
}

async function getNotificationChallengeHashSecret(
  supabase: Pick<SupabaseClient, "rpc">
) {
  const { data, error } = await supabase.rpc(
    "get_notification_challenge_hash_secret_v1"
  )

  if (error) {
    throw error
  }

  if (typeof data !== "string" || !data.trim()) {
    throw new Error("Notification challenge hash secret is not configured.")
  }

  return data.trim()
}

export function encryptNotificationChannelDestinationWithKey(
  plaintext: string,
  wrappingKey: Buffer,
  input: {
    channelId: string
    channelType: ChannelType
    userId: number | string
  }
): EncryptedChannelDestination {
  const context = buildNotificationChannelEncryptionContext(input)
  const encrypted = encryptAes256GcmEnvelope(plaintext, wrappingKey, {
    context,
    keyId: CHANNEL_DESTINATION_KEY_ID,
    keyVersion: CHANNEL_DESTINATION_KEY_VERSION,
    purpose: CHANNEL_DESTINATION_PURPOSE,
  })

  return {
    destination_auth_tag: encrypted.authTag,
    destination_ciphertext: encrypted.ciphertext,
    destination_iv: encrypted.iv,
    encrypted_at: new Date().toISOString(),
    encryption_algorithm: encrypted.algorithm,
    encryption_context: context,
    encryption_key_id: CHANNEL_DESTINATION_KEY_ID,
    encryption_key_version: CHANNEL_DESTINATION_KEY_VERSION,
    encryption_purpose: CHANNEL_DESTINATION_PURPOSE,
    wrapped_data_key: encrypted.wrappedDataKey,
    wrapped_data_key_auth_tag: encrypted.wrappedDataKeyAuthTag,
    wrapped_data_key_iv: encrypted.wrappedDataKeyIv,
  }
}

export async function encryptNotificationChannelDestination(
  supabase: Pick<SupabaseClient, "rpc">,
  plaintext: string,
  input: {
    channelId: string
    channelType: ChannelType
    userId: number | string
  }
) {
  const wrappingKey = await getNotificationChannelWrappingKey(supabase)
  return encryptNotificationChannelDestinationWithKey(
    plaintext,
    wrappingKey,
    input
  )
}

export async function decryptNotificationChannelDestination(
  supabase: Pick<SupabaseClient, "rpc">,
  row: Record<string, unknown>,
  input: {
    channelId: string
    channelType: ChannelType
    userId: number | string
  }
) {
  const wrappingKey = await getNotificationChannelWrappingKey(supabase)
  const envelope: Aes256GcmEnvelopePayload = {
    algorithm: CHANNEL_DESTINATION_ALGORITHM,
    authTag: String(row.destination_auth_tag),
    ciphertext: String(row.destination_ciphertext),
    iv: String(row.destination_iv),
    keyId: String(row.encryption_key_id),
    keyVersion: Number(row.encryption_key_version),
    purpose: CHANNEL_DESTINATION_PURPOSE,
    wrappedDataKey: String(row.wrapped_data_key),
    wrappedDataKeyAuthTag: String(row.wrapped_data_key_auth_tag),
    wrappedDataKeyIv: String(row.wrapped_data_key_iv),
  }
  return decryptAes256GcmEnvelope(
    envelope,
    wrappingKey,
    buildNotificationChannelEncryptionContext(input)
  )
}

export async function hashNotificationVerificationChallenge(
  supabase: Pick<SupabaseClient, "rpc">,
  input: {
    channelType: ChannelType
    code: string
    destination: string
    providerKey: string
  }
) {
  const secret = await getNotificationChallengeHashSecret(supabase)
  return createHmac("sha256", secret)
    .update(
      [
        input.channelType,
        input.providerKey,
        normalizeDestination(input.channelType, input.destination),
        input.code.trim(),
        CHALLENGE_PURPOSE,
        `v${CHALLENGE_HASH_VERSION}`,
      ].join(":")
    )
    .digest("hex")
}

async function verifyNotificationVerificationChallenge(
  supabase: Pick<SupabaseClient, "rpc">,
  input: {
    channelType: ChannelType
    code: string
    destination: string
    expectedHash: string
    providerKey: string
  }
) {
  const actual = Buffer.from(
    await hashNotificationVerificationChallenge(supabase, input),
    "hex"
  )
  const expected = Buffer.from(input.expectedHash, "hex")

  if (actual.length !== expected.length) {
    return false
  }

  return timingSafeEqual(actual, expected)
}

async function resolvePassportUserId(context: PassportUserContext) {
  const identities = [
    context.firebaseToken.email
      ? { column: "email", value: normalizeEmail(context.firebaseToken.email) }
      : null,
    context.firebaseToken.phone_number
      ? { column: "phone", value: context.firebaseToken.phone_number }
      : null,
  ].filter(Boolean) as Array<{ column: string; value: string }>

  for (const identity of identities) {
    const { data, error } = await context.supabase
      .from("users")
      .select("id")
      .eq(identity.column, identity.value)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data?.id !== undefined && data?.id !== null) {
      return String((data as UserRow).id)
    }
  }

  return null
}

const assertPassportUserId = async (context: PassportUserContext) => {
  const userId = await resolvePassportUserId(context)

  if (!userId) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "No Cubid user profile was found for this Passport session."
    )
  }

  return userId
}

const mapChannel = (row: ChannelRow): NotificationChannelSummary => ({
  channelId: String(row.id),
  channelType: row.channel_type,
  createdAt: String(row.created_at),
  displayHint: row.display_hint ?? null,
  isDefault: Boolean(row.is_default),
  label: row.label ?? null,
  mutedUntil: row.muted_until ?? null,
  pausedUntil: row.paused_until ?? null,
  providerKey: String(row.provider_key),
  revokedAt: row.revoked_at ?? null,
  status: row.status,
  updatedAt: String(row.updated_at),
  verificationStatus: String(row.verification_status),
  verifiedAt: row.verified_at ?? null,
})

const mapPreference = (row: PreferenceRow): NotificationPreferenceSummary => ({
  categoryKey: String(row.category_key),
  channelId: row.channel_id ? String(row.channel_id) : null,
  createdAt: String(row.created_at),
  dappId: row.dapp_id === null || row.dapp_id === undefined ? null : String(row.dapp_id),
  mutedUntil: row.muted_until ?? null,
  pausedUntil: row.paused_until ?? null,
  preferenceId: String(row.id),
  priorityFloor: row.priority_floor,
  status: String(row.status),
  updatedAt: String(row.updated_at),
})

export async function listNotificationChannels(context: PassportUserContext) {
  const userId = await resolvePassportUserId(context)

  if (!userId) {
    return []
  }

  const { data, error } = await context.supabase
    .from("user_notification_channels")
    .select(
      "id,user_id,channel_type,provider_key,label,display_hint,verification_status,status,is_default,muted_until,paused_until,verified_at,revoked_at,metadata,created_at,updated_at"
    )
    .eq("user_id", userId)

  if (error) {
    throw error
  }

  return ((data ?? []) as ChannelRow[])
    .filter((row) => row.status !== "archived")
    .map(mapChannel)
}

export async function startNotificationChannelVerification(
  context: PassportUserContext,
  input: StartChannelVerificationInput
) {
  const userId = await assertPassportUserId(context)
  const destination = assertNonEmptyDestination(
    input.channelType,
    input.destination
  )
  const providerKey = getProviderKey(input.channelType)
  const displayHint = maskDestination(input.channelType, destination)
  const now = new Date().toISOString()

  if (input.isDefault) {
    const { error: unsetError } = await context.supabase
      .from("user_notification_channels")
      .update({ is_default: false, updated_at: now })
      .eq("user_id", userId)
      .eq("channel_type", input.channelType)

    if (unsetError) {
      throw unsetError
    }
  }

  const { data: channelRow, error: channelError } = await context.supabase
    .from("user_notification_channels")
    .insert({
      channel_type: input.channelType,
      display_hint: displayHint,
      is_default: Boolean(input.isDefault),
      label: input.label?.trim() || null,
      provider_key: providerKey,
      status: "active",
      updated_at: now,
      user_id: userId,
      verification_status: "pending",
    })
    .select()
    .single()

  if (channelError) {
    throw channelError
  }

  const channel = channelRow as ChannelRow
  const encryptedDestination = await encryptNotificationChannelDestination(
    context.supabase,
    destination,
    {
      channelId: String(channel.id),
      channelType: input.channelType,
      userId,
    }
  )

  const { error: destinationError } = await context.supabase
    .schema("private")
    .from("notification_channel_destinations")
    .insert({
      ...encryptedDestination,
      channel_id: channel.id,
      channel_type: input.channelType,
      metadata: {},
      status: "active",
      updated_at: now,
      user_id: userId,
    })

  if (destinationError) {
    throw destinationError
  }

  const code = createVerificationCode()
  const challengeHash = await hashNotificationVerificationChallenge(
    context.supabase,
    {
      channelType: input.channelType,
      code,
      destination,
      providerKey,
    }
  )

  const { data: challengeRow, error: challengeError } = await context.supabase
    .from("notification_verification_challenges")
    .insert({
      attempt_count: 0,
      challenge_hash: challengeHash,
      channel_id: channel.id,
      channel_type: input.channelType,
      expires_at: createExpiry(),
      hash_algorithm: CHALLENGE_HASH_ALGORITHM,
      hash_version: CHALLENGE_HASH_VERSION,
      max_attempts: CHALLENGE_MAX_ATTEMPTS,
      metadata:
        input.channelType === "telegram"
          ? { setup_hint: "Send this one-time code to the Cubid Telegram bot." }
          : {},
      provider_key: providerKey,
      purpose: CHALLENGE_PURPOSE,
      request_id: context.requestId,
      status: "pending",
      updated_at: now,
      user_id: userId,
    })
    .select()
    .single()

  if (challengeError) {
    throw challengeError
  }

  if (input.channelType === "email") {
    await sendOtpEmail(destination, Number(code))
  }

  return {
    channel: mapChannel(channel),
    challenge: {
      challengeId: String((challengeRow as ChallengeRow).id),
      expiresAt: String((challengeRow as ChallengeRow).expires_at),
      maxAttempts: CHALLENGE_MAX_ATTEMPTS,
      providerKey,
      setupCode: input.channelType === "telegram" ? code : undefined,
      setupInstructions:
        input.channelType === "telegram"
          ? "Send this one-time code to the Cubid Telegram bot to finish connecting Telegram."
          : undefined,
    },
  }
}

export async function completeNotificationChannelVerification(
  context: PassportUserContext,
  input: CompleteChannelVerificationInput
) {
  const userId = await assertPassportUserId(context)
  const { data: challengeData, error: challengeError } = await context.supabase
    .from("notification_verification_challenges")
    .select("*")
    .eq("id", input.challengeId)
    .eq("user_id", userId)
    .maybeSingle()

  if (challengeError) {
    throw challengeError
  }

  const challenge = challengeData as ChallengeRow | null

  if (!challenge || challenge.status !== "pending" || challenge.consumed_at) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Notification channel verification challenge is not active."
    )
  }

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await context.supabase
      .from("notification_verification_challenges")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", challenge.id)
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Notification channel verification challenge has expired."
    )
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    throw new ApiSecurityError(
      429,
      "rate_limited",
      "Notification channel verification challenge has too many attempts."
    )
  }

  const { data: destinationData, error: destinationError } =
    await context.supabase
      .schema("private")
      .from("notification_channel_destinations")
      .select("*")
      .eq("channel_id", challenge.channel_id)
      .eq("user_id", userId)
      .maybeSingle()

  if (destinationError) {
    throw destinationError
  }

  if (!destinationData) {
    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Notification channel destination is missing."
    )
  }

  const destination = await decryptNotificationChannelDestination(
    context.supabase,
    destinationData,
    {
      channelId: challenge.channel_id,
      channelType: challenge.channel_type,
      userId,
    }
  )

  const verified = await verifyNotificationVerificationChallenge(
    context.supabase,
    {
      channelType: challenge.channel_type,
      code: input.code,
      destination,
      expectedHash: challenge.challenge_hash,
      providerKey: challenge.provider_key,
    }
  )
  const now = new Date().toISOString()

  if (!verified) {
    const attemptCount = challenge.attempt_count + 1
    await context.supabase
      .from("notification_verification_challenges")
      .update({
        attempt_count: attemptCount,
        status: attemptCount >= challenge.max_attempts ? "failed" : "pending",
        updated_at: now,
      })
      .eq("id", challenge.id)

    throw new ApiSecurityError(
      400,
      "invalid_request",
      "Notification channel verification code is invalid."
    )
  }

  await context.supabase
    .from("notification_verification_challenges")
    .update({
      consumed_at: now,
      status: "consumed",
      updated_at: now,
    })
    .eq("id", challenge.id)

  const { data: updatedChannel, error: updateError } = await context.supabase
    .from("user_notification_channels")
    .update({
      status: "active",
      updated_at: now,
      verification_status: "verified",
      verified_at: now,
    })
    .eq("id", challenge.channel_id)
    .eq("user_id", userId)
    .select()
    .single()

  if (updateError) {
    throw updateError
  }

  return mapChannel(updatedChannel as ChannelRow)
}

export async function updateNotificationChannel(
  context: PassportUserContext,
  input: UpdateChannelInput
) {
  const userId = await assertPassportUserId(context)
  const { data: existing, error: existingError } = await context.supabase
    .from("user_notification_channels")
    .select("*")
    .eq("id", input.channelId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (!existing) {
    throw new ApiSecurityError(
      404,
      "not_found",
      "Notification channel was not found."
    )
  }

  const now = new Date().toISOString()
  const existingChannel = existing as ChannelRow

  if (input.isDefault) {
    const { error: unsetError } = await context.supabase
      .from("user_notification_channels")
      .update({ is_default: false, updated_at: now })
      .eq("user_id", userId)
      .eq("channel_type", existingChannel.channel_type)

    if (unsetError) {
      throw unsetError
    }
  }

  const status = input.status
  const patch: Record<string, unknown> = {
    updated_at: now,
  }

  if (input.label !== undefined) {
    patch.label = input.label?.trim() || null
  }

  if (input.isDefault !== undefined) {
    patch.is_default = Boolean(input.isDefault)
  }

  if (input.mutedUntil !== undefined) {
    patch.muted_until = input.mutedUntil
  }

  if (input.pausedUntil !== undefined) {
    patch.paused_until = input.pausedUntil
  }

  if (status) {
    patch.status = status
    if (status === "revoked") {
      patch.revoked_at = now
      patch.verification_status = "revoked"
      patch.is_default = false
    }
  }

  const { data: updatedChannel, error: updateError } = await context.supabase
    .from("user_notification_channels")
    .update(patch)
    .eq("id", input.channelId)
    .eq("user_id", userId)
    .select()
    .single()

  if (updateError) {
    throw updateError
  }

  if (status === "revoked") {
    const { error: destinationError } = await context.supabase
      .schema("private")
      .from("notification_channel_destinations")
      .update({ status: "revoked", updated_at: now })
      .eq("channel_id", input.channelId)
      .eq("user_id", userId)

    if (destinationError) {
      throw destinationError
    }
  }

  return mapChannel(updatedChannel as ChannelRow)
}

export async function listNotificationPreferences(
  context: PassportUserContext
) {
  const userId = await resolvePassportUserId(context)

  if (!userId) {
    return []
  }

  const { data, error } = await context.supabase
    .from("notification_preferences")
    .select(
      "id,user_id,dapp_id,category_key,channel_id,status,muted_until,paused_until,priority_floor,metadata,created_at,updated_at"
    )
    .eq("user_id", userId)

  if (error) {
    throw error
  }

  return ((data ?? []) as PreferenceRow[]).map(mapPreference)
}

export async function updateNotificationPreference(
  context: PassportUserContext,
  input: UpdatePreferenceInput
) {
  const userId = await assertPassportUserId(context)
  const now = new Date().toISOString()

  if (input.channelId) {
    const { data: channel, error: channelError } = await context.supabase
      .from("user_notification_channels")
      .select("id")
      .eq("id", input.channelId)
      .eq("user_id", userId)
      .maybeSingle()

    if (channelError) {
      throw channelError
    }

    if (!channel) {
      throw new ApiSecurityError(
        404,
        "not_found",
        "Notification channel was not found."
      )
    }
  }

  const existingQuery = context.supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("category_key", input.categoryKey)

  const { data: existing, error: existingError } =
    input.dappId === undefined || input.dappId === null
      ? await existingQuery.is("dapp_id", null).maybeSingle()
      : await existingQuery.eq("dapp_id", input.dappId).maybeSingle()

  if (existingError) {
    throw existingError
  }

  const existingPreference = existing as PreferenceRow | null
  const payload = {
    category_key: input.categoryKey,
    channel_id:
      input.channelId !== undefined
        ? input.channelId
        : existingPreference?.channel_id ?? null,
    dapp_id: input.dappId ?? null,
    muted_until:
      input.mutedUntil !== undefined
        ? input.mutedUntil
        : existingPreference?.muted_until ?? null,
    paused_until:
      input.pausedUntil !== undefined
        ? input.pausedUntil
        : existingPreference?.paused_until ?? null,
    priority_floor:
      input.priorityFloor ?? existingPreference?.priority_floor ?? "LOW",
    status: input.status ?? existingPreference?.status ?? "active",
    updated_at: now,
    user_id: userId,
  }

  const query = existing
    ? context.supabase
        .from("notification_preferences")
        .update(payload)
        .eq("id", (existing as PreferenceRow).id)
    : context.supabase.from("notification_preferences").insert({
        ...payload,
        created_at: now,
      })

  const { data: row, error } = await query.select().single()

  if (error) {
    throw error
  }

  return mapPreference(row as PreferenceRow)
}
