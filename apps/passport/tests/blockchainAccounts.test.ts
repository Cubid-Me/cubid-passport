import assert from "node:assert/strict"
import test from "node:test"

import {
  decryptBlockchainPrivateKeyWithKey,
  encryptBlockchainPrivateKeyWithKey,
  generateBlockchainAccount,
  normalizePublicAddress,
} from "../lib/server/blockchainAccounts"

const wrappingKey = Buffer.from("fedcba9876543210fedcba9876543210")

test("blockchain private-key envelope encryption round-trips with bound context", () => {
  const context = {
    chainKey: "evm" as const,
    publicAddressNormalized: "0xabc123",
    userAccountId: "account_1",
    userId: 123,
  }
  const encrypted = encryptBlockchainPrivateKeyWithKey(
    "raw blockchain private key",
    wrappingKey,
    context
  )

  assert.equal(encrypted.encryption_algorithm, "aes-256-gcm-envelope")
  assert.equal(
    encrypted.encryption_key_id,
    "passport_blockchain_private_key_wrapping_key_v1"
  )
  assert.equal(
    String(encrypted.private_key_ciphertext).includes(
      "raw blockchain private key"
    ),
    false
  )
  assert.equal(
    decryptBlockchainPrivateKeyWithKey(encrypted, wrappingKey, context),
    "raw blockchain private key"
  )
})

test("blockchain private-key envelope rejects the wrong authenticated context", () => {
  const encrypted = encryptBlockchainPrivateKeyWithKey(
    "raw blockchain private key",
    wrappingKey,
    {
      chainKey: "solana",
      publicAddressNormalized: "solana-public-key",
      userAccountId: "account_1",
      userId: 123,
    }
  )

  assert.throws(() =>
    decryptBlockchainPrivateKeyWithKey(encrypted, wrappingKey, {
      chainKey: "solana",
      publicAddressNormalized: "different-public-key",
      userAccountId: "account_1",
      userId: 123,
    })
  )
})

test("blockchain private-key envelope rejects the wrong wrapping key", () => {
  const encrypted = encryptBlockchainPrivateKeyWithKey(
    "raw blockchain private key",
    wrappingKey,
    {
      chainKey: "near",
      publicAddressNormalized: "ed25519:abc",
      userAccountId: "account_1",
      userId: 123,
    }
  )

  assert.throws(() =>
    decryptBlockchainPrivateKeyWithKey(
      encrypted,
      Buffer.from("0123456789abcdef0123456789abcdef"),
      {
        chainKey: "near",
        publicAddressNormalized: "ed25519:abc",
        userAccountId: "account_1",
        userId: 123,
      }
    )
  )
})

test("generated blockchain accounts support evm near and solana without exposing empty keys", () => {
  for (const chain of ["evm", "near", "solana"] as const) {
    const account = generateBlockchainAccount(chain)

    assert.equal(account.chainKey, chain)
    assert.ok(account.publicAddress.length > 10)
    assert.ok(account.privateKey.length > 10)
  }
})

test("public address normalization preserves case-sensitive Solana addresses", () => {
  assert.equal(normalizePublicAddress("evm", "0xABC"), "0xabc")
  assert.equal(normalizePublicAddress("near", "ED25519:ABC"), "ed25519:abc")
  assert.equal(normalizePublicAddress("solana", "SoLaNaAbC"), "SoLaNaAbC")
})
