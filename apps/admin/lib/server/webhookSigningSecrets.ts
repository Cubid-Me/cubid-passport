import {
  decodeAes256GcmEnvelopeKey,
  decryptAes256GcmEnvelope,
  encryptAes256GcmEnvelope,
  type Aes256GcmEnvelopePayload,
} from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export const WEBHOOK_SIGNING_SECRET_ALGORITHM = "aes-256-gcm-envelope" as const
export const WEBHOOK_SIGNING_SECRET_KEY_ID =
  "passport_webhook_signing_secret_wrapping_key_v1" as const
export const WEBHOOK_SIGNING_SECRET_KEY_VERSION = 1
export const WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL =
  "__cubid_encrypted_webhook_signing_secret__" as const
export const WEBHOOK_SIGNING_SECRET_PURPOSE = "webhook_signing_secret" as const

export type WebhookSigningSecretContext = {
  dappId: number | string
  secretReferenceId: string
  webhook: string
}

export type EncryptedWebhookSigningSecret = {
  secret_algorithm: typeof WEBHOOK_SIGNING_SECRET_ALGORITHM
  secret_auth_tag: string
  secret_ciphertext: string
  secret_context: WebhookSigningSecretContext
  secret_iv: string
  secret_key_id: typeof WEBHOOK_SIGNING_SECRET_KEY_ID
  secret_key_version: typeof WEBHOOK_SIGNING_SECRET_KEY_VERSION
  secret_purpose: typeof WEBHOOK_SIGNING_SECRET_PURPOSE
  wrapped_data_key: string
  wrapped_data_key_auth_tag: string
  wrapped_data_key_iv: string
}

export const buildWebhookSigningSecretContext = (
  context: WebhookSigningSecretContext
): WebhookSigningSecretContext => ({
  dappId: String(context.dappId),
  secretReferenceId: context.secretReferenceId,
  webhook: context.webhook,
})

export async function getWebhookSigningSecretWrappingKey(
  supabase: Pick<SupabaseClient, "rpc">
) {
  const { data, error } = await supabase.rpc(
    "get_webhook_signing_secret_wrapping_key_v1"
  )

  if (error) {
    throw error
  }

  if (typeof data !== "string") {
    throw new Error("Webhook signing secret wrapping key is not configured.")
  }

  return decodeAes256GcmEnvelopeKey(
    data,
    "Webhook signing secret wrapping key"
  )
}

export function encryptWebhookSigningSecretWithKey(
  plaintext: string,
  wrappingKey: Buffer,
  context: WebhookSigningSecretContext
): EncryptedWebhookSigningSecret {
  const normalizedContext = buildWebhookSigningSecretContext(context)
  const encrypted = encryptAes256GcmEnvelope(plaintext, wrappingKey, {
    context: normalizedContext,
    keyId: WEBHOOK_SIGNING_SECRET_KEY_ID,
    keyVersion: WEBHOOK_SIGNING_SECRET_KEY_VERSION,
    purpose: WEBHOOK_SIGNING_SECRET_PURPOSE,
  })

  return {
    secret_algorithm: encrypted.algorithm,
    secret_auth_tag: encrypted.authTag,
    secret_ciphertext: encrypted.ciphertext,
    secret_context: normalizedContext,
    secret_iv: encrypted.iv,
    secret_key_id: WEBHOOK_SIGNING_SECRET_KEY_ID,
    secret_key_version: WEBHOOK_SIGNING_SECRET_KEY_VERSION,
    secret_purpose: WEBHOOK_SIGNING_SECRET_PURPOSE,
    wrapped_data_key: encrypted.wrappedDataKey,
    wrapped_data_key_auth_tag: encrypted.wrappedDataKeyAuthTag,
    wrapped_data_key_iv: encrypted.wrappedDataKeyIv,
  }
}

export async function encryptWebhookSigningSecret(
  supabase: Pick<SupabaseClient, "rpc">,
  plaintext: string,
  context: WebhookSigningSecretContext
) {
  const wrappingKey = await getWebhookSigningSecretWrappingKey(supabase)
  return encryptWebhookSigningSecretWithKey(plaintext, wrappingKey, context)
}

export function decryptWebhookSigningSecretWithKey(
  row: Record<string, unknown>,
  wrappingKey: Buffer,
  context: WebhookSigningSecretContext
) {
  const envelope: Aes256GcmEnvelopePayload = {
    algorithm: WEBHOOK_SIGNING_SECRET_ALGORITHM,
    authTag: String(row.secret_auth_tag),
    ciphertext: String(row.secret_ciphertext),
    iv: String(row.secret_iv),
    keyId: String(row.secret_key_id),
    keyVersion: Number(row.secret_key_version),
    purpose: WEBHOOK_SIGNING_SECRET_PURPOSE,
    wrappedDataKey: String(row.wrapped_data_key),
    wrappedDataKeyAuthTag: String(row.wrapped_data_key_auth_tag),
    wrappedDataKeyIv: String(row.wrapped_data_key_iv),
  }

  return decryptAes256GcmEnvelope(
    envelope,
    wrappingKey,
    buildWebhookSigningSecretContext(context)
  )
}

export async function decryptWebhookSigningSecret(
  supabase: Pick<SupabaseClient, "rpc">,
  row: Record<string, unknown>,
  context: WebhookSigningSecretContext
) {
  const wrappingKey = await getWebhookSigningSecretWrappingKey(supabase)
  return decryptWebhookSigningSecretWithKey(row, wrappingKey, context)
}

export async function resolveWebhookSigningSecret(
  supabase: Pick<SupabaseClient, "rpc">,
  row: Record<string, unknown>
) {
  if (typeof row.secret_ciphertext === "string" && row.secret_ciphertext) {
    return decryptWebhookSigningSecret(supabase, row, {
      dappId: String(row.dapp),
      secretReferenceId: String(row.secret_reference_id),
      webhook: String(row.webhook),
    })
  }

  if (typeof row.secret === "string" && row.secret) {
    return row.secret
  }

  return null
}
