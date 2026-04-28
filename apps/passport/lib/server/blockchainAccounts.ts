import { randomUUID } from "node:crypto"

import {
  decodeAes256GcmEnvelopeKey,
  decryptAes256GcmEnvelope,
  encryptAes256GcmEnvelope,
  type Aes256GcmEnvelopePayload,
} from "@cubid/auth/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ethers } from "ethers"
import { KeyPair } from "near-api-js"
import { Keypair } from "@solana/web3.js"

export const BLOCKCHAIN_PRIVATE_KEY_ALGORITHM =
  "aes-256-gcm-envelope" as const
export const BLOCKCHAIN_PRIVATE_KEY_ID =
  "passport_blockchain_private_key_wrapping_key_v1" as const
export const BLOCKCHAIN_PRIVATE_KEY_VERSION = 1
export const BLOCKCHAIN_PRIVATE_KEY_PURPOSE = "blockchain_private_key" as const

export const SUPPORTED_GENERATED_CHAINS = ["evm", "near", "solana"] as const

export type SupportedGeneratedChain = (typeof SUPPORTED_GENERATED_CHAINS)[number]

export type BlockchainPrivateKeyContext = {
  chainKey: SupportedGeneratedChain
  publicAddressNormalized: string
  userAccountId: string
  userId: number | string
}

export type EncryptedBlockchainPrivateKey = {
  encrypted_at: string
  encryption_algorithm: typeof BLOCKCHAIN_PRIVATE_KEY_ALGORITHM
  encryption_context: BlockchainPrivateKeyContext
  encryption_key_id: typeof BLOCKCHAIN_PRIVATE_KEY_ID
  encryption_key_version: typeof BLOCKCHAIN_PRIVATE_KEY_VERSION
  encryption_purpose: typeof BLOCKCHAIN_PRIVATE_KEY_PURPOSE
  private_key_auth_tag: string
  private_key_ciphertext: string
  private_key_iv: string
  wrapped_data_key: string
  wrapped_data_key_auth_tag: string
  wrapped_data_key_iv: string
}

type GeneratedAccount = {
  chainKey: SupportedGeneratedChain
  privateKey: string
  publicAddress: string
}

export const isSupportedGeneratedChain = (
  value: string
): value is SupportedGeneratedChain => {
  return SUPPORTED_GENERATED_CHAINS.includes(value as SupportedGeneratedChain)
}

export const normalizeChainKey = (value: string) => value.trim().toLowerCase()

export const normalizePublicAddress = (
  chainKey: SupportedGeneratedChain,
  publicAddress: string
) => {
  const trimmed = publicAddress.trim()

  if (chainKey === "evm" || chainKey === "near") {
    return trimmed.toLowerCase()
  }

  return trimmed
}

export const generateBlockchainAccount = (
  chainKey: SupportedGeneratedChain
): GeneratedAccount => {
  if (chainKey === "evm") {
    const wallet = ethers.Wallet.createRandom()
    return {
      chainKey,
      privateKey: wallet.privateKey,
      publicAddress: wallet.address,
    }
  }

  if (chainKey === "near") {
    const keyPair = KeyPair.fromRandom("ed25519")
    return {
      chainKey,
      privateKey: keyPair.toString(),
      publicAddress: keyPair.getPublicKey().toString(),
    }
  }

  const keypair = Keypair.generate()
  return {
    chainKey,
    privateKey: Buffer.from(keypair.secretKey).toString("base64"),
    publicAddress: keypair.publicKey.toBase58(),
  }
}

export const buildBlockchainPrivateKeyContext = (
  context: BlockchainPrivateKeyContext
): BlockchainPrivateKeyContext => ({
  chainKey: context.chainKey,
  publicAddressNormalized: context.publicAddressNormalized,
  userAccountId: context.userAccountId,
  userId: String(context.userId),
})

export async function getBlockchainPrivateKeyWrappingKey(
  supabase: Pick<SupabaseClient, "rpc">
) {
  const { data, error } = await supabase.rpc(
    "get_blockchain_private_key_wrapping_key_v1"
  )

  if (error) {
    throw error
  }

  if (typeof data !== "string") {
    throw new Error("Blockchain private-key wrapping key is not configured.")
  }

  return decodeAes256GcmEnvelopeKey(
    data,
    "Blockchain private-key wrapping key"
  )
}

export function encryptBlockchainPrivateKeyWithKey(
  plaintext: string,
  wrappingKey: Buffer,
  context: BlockchainPrivateKeyContext
): EncryptedBlockchainPrivateKey {
  const normalizedContext = buildBlockchainPrivateKeyContext(context)
  const encrypted = encryptAes256GcmEnvelope(plaintext, wrappingKey, {
    context: normalizedContext,
    keyId: BLOCKCHAIN_PRIVATE_KEY_ID,
    keyVersion: BLOCKCHAIN_PRIVATE_KEY_VERSION,
    purpose: BLOCKCHAIN_PRIVATE_KEY_PURPOSE,
  })

  return {
    encrypted_at: new Date().toISOString(),
    encryption_algorithm: encrypted.algorithm,
    encryption_context: normalizedContext,
    encryption_key_id: BLOCKCHAIN_PRIVATE_KEY_ID,
    encryption_key_version: BLOCKCHAIN_PRIVATE_KEY_VERSION,
    encryption_purpose: BLOCKCHAIN_PRIVATE_KEY_PURPOSE,
    private_key_auth_tag: encrypted.authTag,
    private_key_ciphertext: encrypted.ciphertext,
    private_key_iv: encrypted.iv,
    wrapped_data_key: encrypted.wrappedDataKey,
    wrapped_data_key_auth_tag: encrypted.wrappedDataKeyAuthTag,
    wrapped_data_key_iv: encrypted.wrappedDataKeyIv,
  }
}

export async function encryptBlockchainPrivateKey(
  supabase: Pick<SupabaseClient, "rpc">,
  plaintext: string,
  context: BlockchainPrivateKeyContext
) {
  const wrappingKey = await getBlockchainPrivateKeyWrappingKey(supabase)
  return encryptBlockchainPrivateKeyWithKey(plaintext, wrappingKey, context)
}

export function decryptBlockchainPrivateKeyWithKey(
  row: Record<string, unknown>,
  wrappingKey: Buffer,
  context: BlockchainPrivateKeyContext
) {
  const envelope: Aes256GcmEnvelopePayload = {
    algorithm: BLOCKCHAIN_PRIVATE_KEY_ALGORITHM,
    authTag: String(row.private_key_auth_tag),
    ciphertext: String(row.private_key_ciphertext),
    iv: String(row.private_key_iv),
    keyId: String(row.encryption_key_id),
    keyVersion: Number(row.encryption_key_version),
    purpose: BLOCKCHAIN_PRIVATE_KEY_PURPOSE,
    wrappedDataKey: String(row.wrapped_data_key),
    wrappedDataKeyAuthTag: String(row.wrapped_data_key_auth_tag),
    wrappedDataKeyIv: String(row.wrapped_data_key_iv),
  }

  return decryptAes256GcmEnvelope(
    envelope,
    wrappingKey,
    buildBlockchainPrivateKeyContext(context)
  )
}

export async function assertDappUserForBlockchainAccount(
  supabase: SupabaseClient,
  dappUserUuid: string,
  dappId: number | string
) {
  const { data, error } = await supabase
    .from("dapp_users")
    .select("uuid,dapp_id,user_id")
    .eq("uuid", dappUserUuid)
    .eq("dapp_id", dappId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.user_id == null) {
    return null
  }

  return data as {
    dapp_id: number | string
    user_id: number | string
    uuid: string
  }
}

export async function createGeneratedBlockchainAccount(input: {
  chain: string
  dappId: number | string
  dappUserUuid: string
  label?: string | null
  requestId: string
  supabase: SupabaseClient
}) {
  const chainKey = normalizeChainKey(input.chain)

  if (!isSupportedGeneratedChain(chainKey)) {
    throw new Error(`Unsupported generated blockchain chain: ${chainKey}`)
  }

  const dappUser = await assertDappUserForBlockchainAccount(
    input.supabase,
    input.dappUserUuid,
    input.dappId
  )

  if (!dappUser) {
    return null
  }

  const generatedAccount = generateBlockchainAccount(chainKey)
  const publicAddressNormalized = normalizePublicAddress(
    chainKey,
    generatedAccount.publicAddress
  )
  const { data: userAccount, error: userAccountError } = await input.supabase
    .from("user_accounts")
    .insert({
      account_kind: "generated",
      account_label: input.label || null,
      chain_key: chainKey,
      custody_status: "cubid_custodied",
      metadata: {
        createdBy: "api_v3.accounts.generate",
        requestId: input.requestId,
      },
      public_address: generatedAccount.publicAddress,
      public_address_normalized: publicAddressNormalized,
      status: "active",
      user_id: dappUser.user_id,
    })
    .select("*")
    .single()

  if (userAccountError) {
    throw userAccountError
  }

  const userAccountId = String(userAccount.id)
  let privateKeyStored = false
  let dappUserAccountLinked = false

  try {
    const encryptedPrivateKey = await encryptBlockchainPrivateKey(
      input.supabase,
      generatedAccount.privateKey,
      {
        chainKey,
        publicAddressNormalized,
        userAccountId,
        userId: dappUser.user_id,
      }
    )

    const { error: privateKeyError } = await input.supabase
      .schema("private")
      .from("private_keys")
      .insert({
        ...encryptedPrivateKey,
        chain_key: chainKey,
        metadata: {
          createdBy: "api_v3.accounts.generate",
          requestId: input.requestId,
        },
        status: "active",
        user_account_id: userAccountId,
      })

    if (privateKeyError) {
      throw privateKeyError
    }

    privateKeyStored = true

    const { data: link, error: linkError } = await input.supabase
      .from("dapp_user_accounts")
      .insert({
        dapp_id: input.dappId,
        dapp_user_uuid: input.dappUserUuid,
        metadata: {
          createdBy: "api_v3.accounts.generate",
          requestId: input.requestId,
        },
        status: "active",
        user_account_id: userAccountId,
      })
      .select("*")
      .single()

    if (linkError) {
      throw linkError
    }

    dappUserAccountLinked = true

    await input.supabase.from("api_security_events").insert({
      actor_identifier: String(input.dappId),
      actor_type: "dapp",
      details: {
        chainKey,
        dappId: String(input.dappId),
        dappUserUuid: input.dappUserUuid,
        userAccountId,
      },
      event_id: `api_event_${randomUUID().replace(/-/g, "")}`,
      event_type: "blockchain_account.generated",
      outcome: "success",
      request_id: input.requestId,
      route: "v3.accounts.generate",
    })

    return {
      accountId: userAccountId,
      chain: chainKey,
      createdAt: String(userAccount.created_at),
      custodyStatus: String(userAccount.custody_status),
      dappUserAccountId: String(link.id),
      dappUserUuid: input.dappUserUuid,
      label: userAccount.account_label
        ? String(userAccount.account_label)
        : null,
      publicAddress: String(userAccount.public_address),
    }
  } catch (error) {
    if (dappUserAccountLinked) {
      await input.supabase
        .from("dapp_user_accounts")
        .delete()
        .eq("user_account_id", userAccountId)
    }

    if (privateKeyStored) {
      await input.supabase
        .schema("private")
        .from("private_keys")
        .delete()
        .eq("user_account_id", userAccountId)
    }

    await input.supabase
      .from("user_accounts")
      .delete()
      .eq("id", userAccountId)

    throw error
  }
}

export async function listDappUserBlockchainAccounts(input: {
  chain?: string | null
  dappId: number | string
  dappUserUuid: string
  supabase: SupabaseClient
}) {
  const dappUser = await assertDappUserForBlockchainAccount(
    input.supabase,
    input.dappUserUuid,
    input.dappId
  )

  if (!dappUser) {
    return null
  }

  const { data: links, error: linksError } = await input.supabase
    .from("dapp_user_accounts")
    .select("id,user_account_id,status,created_at")
    .eq("dapp_user_uuid", input.dappUserUuid)
    .eq("dapp_id", input.dappId)
    .eq("status", "active")

  if (linksError) {
    throw linksError
  }

  const accountIds = (links ?? []).map((link) => String(link.user_account_id))

  if (accountIds.length === 0) {
    return []
  }

  let accountsQuery = input.supabase
    .from("user_accounts")
    .select(
      "id,chain_key,public_address,account_label,custody_status,status,created_at,updated_at"
    )
    .in("id", accountIds)
    .eq("status", "active")

  if (input.chain) {
    accountsQuery = accountsQuery.eq("chain_key", normalizeChainKey(input.chain))
  }

  const { data: accounts, error: accountsError } = await accountsQuery

  if (accountsError) {
    throw accountsError
  }

  const linkByAccountId = new Map(
    (links ?? []).map((link) => [String(link.user_account_id), link])
  )

  return (accounts ?? []).map((account) => {
    const link = linkByAccountId.get(String(account.id))
    return {
      accountId: String(account.id),
      chain: String(account.chain_key),
      createdAt: String(account.created_at),
      custodyStatus: String(account.custody_status),
      dappUserAccountId: link ? String(link.id) : null,
      dappUserUuid: input.dappUserUuid,
      label: account.account_label ? String(account.account_label) : null,
      linkStatus: link ? String(link.status) : null,
      publicAddress: String(account.public_address),
      updatedAt: String(account.updated_at),
    }
  })
}
