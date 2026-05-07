import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

export const DAPP_USER_SECRET_ENCRYPTION_ALGORITHM =
  "aes-256-gcm-envelope" as const
export const DAPP_USER_SECRET_KEY_ID =
  "passport_dapp_user_secret_wrapping_key_v1" as const
export const DAPP_USER_SECRET_KEY_VERSION = 1
export const DAPP_USER_SECRET_LEGACY_SENTINEL =
  "__cubid_encrypted_dapp_user_secret__" as const
export const DAPP_USER_SECRET_PURPOSE = "dapp_user_secret" as const

export type DappUserSecretContext = {
  dappId: number | string
  dappUserUuid: string
  purpose?: string
}

export type EncryptedDappUserSecret = {
  encrypted_at: string
  encryption_algorithm: typeof DAPP_USER_SECRET_ENCRYPTION_ALGORITHM
  encryption_context: Record<string, unknown>
  encryption_key_id: typeof DAPP_USER_SECRET_KEY_ID
  encryption_key_version: typeof DAPP_USER_SECRET_KEY_VERSION
  encryption_purpose: string
  secret_auth_tag: string
  secret_ciphertext: string
  secret_iv: string
  wrapped_data_key: string
  wrapped_data_key_auth_tag: string
  wrapped_data_key_iv: string
}

const toBase64 = (value: Buffer) => value.toString("base64")

const fromBase64 = (value: string) => Buffer.from(value, "base64")

export const decodeDappUserSecretWrappingKey = (value: string) => {
  const normalized = value.trim()
  const key = Buffer.from(normalized, "base64")

  if (key.length === 32) {
    return key
  }

  const base64urlKey = Buffer.from(normalized, "base64url")

  if (base64urlKey.length === 32) {
    return base64urlKey
  }

  throw new Error(
    "Dapp user secret wrapping key must decode to exactly 32 bytes."
  )
}

const stableJson = (value: Record<string, unknown>) => {
  const sortedKeys = Object.keys(value).sort()
  return JSON.stringify(
    sortedKeys.reduce<Record<string, unknown>>((memo, key) => {
      memo[key] = value[key]
      return memo
    }, {})
  )
}

export const buildDappUserSecretAad = (context: DappUserSecretContext) => {
  return stableJson({
    algorithm: DAPP_USER_SECRET_ENCRYPTION_ALGORITHM,
    dappId: String(context.dappId),
    dappUserUuid: context.dappUserUuid,
    keyId: DAPP_USER_SECRET_KEY_ID,
    keyVersion: DAPP_USER_SECRET_KEY_VERSION,
    purpose: context.purpose ?? DAPP_USER_SECRET_PURPOSE,
  })
}

export const getDappUserSecretWrappingKey = async (
  supabase: SupabaseClient
) => {
  const { data, error } = await supabase.rpc(
    "get_dapp_user_secret_wrapping_key_v1"
  )

  if (error) {
    throw error
  }

  if (typeof data !== "string" || !data.trim()) {
    throw new Error("Dapp user secret wrapping key is not configured.")
  }

  return decodeDappUserSecretWrappingKey(data)
}

export const encryptDappUserSecretWithKey = (
  plaintext: string,
  wrappingKey: Buffer,
  context: DappUserSecretContext
): EncryptedDappUserSecret => {
  const dataKey = randomBytes(32)
  const secretIv = randomBytes(12)
  const wrappingIv = randomBytes(12)
  const aad = Buffer.from(buildDappUserSecretAad(context))

  const secretCipher = createCipheriv("aes-256-gcm", dataKey, secretIv)
  secretCipher.setAAD(aad)
  const ciphertext = Buffer.concat([
    secretCipher.update(plaintext, "utf8"),
    secretCipher.final(),
  ])
  const secretAuthTag = secretCipher.getAuthTag()

  const wrappingCipher = createCipheriv("aes-256-gcm", wrappingKey, wrappingIv)
  wrappingCipher.setAAD(aad)
  const wrappedDataKey = Buffer.concat([
    wrappingCipher.update(dataKey),
    wrappingCipher.final(),
  ])
  const wrappedDataKeyAuthTag = wrappingCipher.getAuthTag()

  return {
    encrypted_at: new Date().toISOString(),
    encryption_algorithm: DAPP_USER_SECRET_ENCRYPTION_ALGORITHM,
    encryption_context: {
      dappId: String(context.dappId),
      dappUserUuid: context.dappUserUuid,
      purpose: context.purpose ?? DAPP_USER_SECRET_PURPOSE,
    },
    encryption_key_id: DAPP_USER_SECRET_KEY_ID,
    encryption_key_version: DAPP_USER_SECRET_KEY_VERSION,
    encryption_purpose: context.purpose ?? DAPP_USER_SECRET_PURPOSE,
    secret_auth_tag: toBase64(secretAuthTag),
    secret_ciphertext: toBase64(ciphertext),
    secret_iv: toBase64(secretIv),
    wrapped_data_key: toBase64(wrappedDataKey),
    wrapped_data_key_auth_tag: toBase64(wrappedDataKeyAuthTag),
    wrapped_data_key_iv: toBase64(wrappingIv),
  }
}

export const encryptDappUserSecret = async (
  supabase: SupabaseClient,
  plaintext: string,
  context: DappUserSecretContext
) => {
  const wrappingKey = await getDappUserSecretWrappingKey(supabase)
  return encryptDappUserSecretWithKey(plaintext, wrappingKey, context)
}

export const decryptDappUserSecretWithKey = (
  encrypted: EncryptedDappUserSecret,
  wrappingKey: Buffer,
  context: DappUserSecretContext
) => {
  const aad = Buffer.from(buildDappUserSecretAad(context))
  const wrappingDecipher = createDecipheriv(
    "aes-256-gcm",
    wrappingKey,
    fromBase64(encrypted.wrapped_data_key_iv)
  )
  wrappingDecipher.setAAD(aad)
  wrappingDecipher.setAuthTag(fromBase64(encrypted.wrapped_data_key_auth_tag))
  const dataKey = Buffer.concat([
    wrappingDecipher.update(fromBase64(encrypted.wrapped_data_key)),
    wrappingDecipher.final(),
  ])

  const secretDecipher = createDecipheriv(
    "aes-256-gcm",
    dataKey,
    fromBase64(encrypted.secret_iv)
  )
  secretDecipher.setAAD(aad)
  secretDecipher.setAuthTag(fromBase64(encrypted.secret_auth_tag))

  return Buffer.concat([
    secretDecipher.update(fromBase64(encrypted.secret_ciphertext)),
    secretDecipher.final(),
  ]).toString("utf8")
}
