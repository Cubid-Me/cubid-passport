import assert from "node:assert/strict"
import test from "node:test"

import {
  decodeDappUserSecretWrappingKey,
  decryptDappUserSecretWithKey,
  encryptDappUserSecretWithKey,
} from "../lib/server/dappUserSecrets"

const context = {
  dappId: 42,
  dappUserUuid: "00000000-0000-4000-8000-000000000042",
}

test("dapp user secret envelope encryption round-trips with bound context", () => {
  const wrappingKey = Buffer.from("0123456789abcdef0123456789abcdef")
  const encrypted = encryptDappUserSecretWithKey(
    "server-retrievable-secret",
    wrappingKey,
    context
  )

  assert.notEqual(encrypted.secret_ciphertext, "server-retrievable-secret")
  assert.equal(encrypted.secret_ciphertext.includes("server-retrievable"), false)
  assert.equal(encrypted.encryption_algorithm, "aes-256-gcm-envelope")

  const decrypted = decryptDappUserSecretWithKey(
    encrypted,
    wrappingKey,
    context
  )
  assert.equal(decrypted, "server-retrievable-secret")
})

test("dapp user secret decryption rejects swapped authenticated context", () => {
  const wrappingKey = Buffer.from("0123456789abcdef0123456789abcdef")
  const encrypted = encryptDappUserSecretWithKey(
    "server-retrievable-secret",
    wrappingKey,
    context
  )

  assert.throws(() =>
    decryptDappUserSecretWithKey(encrypted, wrappingKey, {
      ...context,
      dappId: 43,
    })
  )
})

test("dapp user secret wrapping key must decode to 32 bytes", () => {
  assert.equal(
    decodeDappUserSecretWrappingKey(
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64url")
    ).length,
    32
  )

  assert.throws(() => decodeDappUserSecretWrappingKey("too-short"))
})
