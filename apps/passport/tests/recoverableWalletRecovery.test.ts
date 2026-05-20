import assert from "node:assert/strict"
import test from "node:test"

import {
  decryptRecoverableWalletBundleWithKey,
  encryptRecoverableWalletBundleWithKey,
} from "../lib/server/recoverableWalletRecovery"

const wrappingKey = Buffer.from("rwallet0123456789abcdef012345678")
const context = {
  bundleVersion: 1,
  dappId: 42,
  dappUserUuid: "00000000-0000-4000-8000-000000000042",
  providerKey: "cubid",
  recoveryBundleId: "rw_bundle_123",
  userId: 1234,
}

test("recoverable wallet bundle envelope round-trips with bound context", () => {
  const encrypted = encryptRecoverableWalletBundleWithKey(
    "user-side-share-recovery-material",
    wrappingKey,
    context
  )

  assert.equal(encrypted.encryption_algorithm, "aes-256-gcm-envelope")
  assert.equal(
    encrypted.encryption_key_id,
    "passport_recoverable_wallet_recovery_bundle_wrapping_key_v1"
  )
  assert.equal(
    encrypted.bundle_ciphertext.includes("user-side-share"),
    false
  )
  assert.equal(
    decryptRecoverableWalletBundleWithKey(encrypted, wrappingKey, context),
    "user-side-share-recovery-material"
  )
})

test("recoverable wallet bundle envelope rejects swapped authenticated context", () => {
  const encrypted = encryptRecoverableWalletBundleWithKey(
    "user-side-share-recovery-material",
    wrappingKey,
    context
  )

  assert.throws(() =>
    decryptRecoverableWalletBundleWithKey(encrypted, wrappingKey, {
      ...context,
      recoveryBundleId: "rw_bundle_other",
    })
  )
})

test("recoverable wallet bundle envelope rejects the wrong wrapping key", () => {
  const encrypted = encryptRecoverableWalletBundleWithKey(
    "user-side-share-recovery-material",
    wrappingKey,
    context
  )

  assert.throws(() =>
    decryptRecoverableWalletBundleWithKey(
      encrypted,
      Buffer.from("otherkey0123456789abcdef01234567"),
      context
    )
  )
})

