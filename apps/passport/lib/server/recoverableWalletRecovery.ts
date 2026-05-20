import {
  decodeAes256GcmEnvelopeKey,
  decryptAes256GcmEnvelope,
  encryptAes256GcmEnvelope,
  type Aes256GcmEnvelopePayload,
} from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"

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

