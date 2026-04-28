import assert from "node:assert/strict"
import test from "node:test"

import {
  decryptWebhookSigningSecretWithKey,
  encryptWebhookSigningSecretWithKey,
  WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
} from "../lib/server/webhookSigningSecrets"

test("webhook signing secret envelope encryption round-trips with bound context", () => {
  const wrappingKey = Buffer.from("0123456789abcdef0123456789abcdef")
  const context = {
    dappId: 42,
    secretReferenceId: "11111111-1111-4111-8111-111111111111",
    webhook: "credential_added",
  }
  const encrypted = encryptWebhookSigningSecretWithKey(
    "webhook-signing-secret",
    wrappingKey,
    context
  )

  assert.notEqual(encrypted.secret_ciphertext, "webhook-signing-secret")
  assert.equal(encrypted.secret_ciphertext.includes("webhook-signing-secret"), false)
  assert.equal(
    encrypted.secret_key_id,
    "passport_webhook_signing_secret_wrapping_key_v1"
  )
  assert.equal(
    decryptWebhookSigningSecretWithKey(encrypted, wrappingKey, context),
    "webhook-signing-secret"
  )
})

test("webhook signing secret decryption rejects swapped subscription context", () => {
  const wrappingKey = Buffer.from("0123456789abcdef0123456789abcdef")
  const encrypted = encryptWebhookSigningSecretWithKey(
    "webhook-signing-secret",
    wrappingKey,
    {
      dappId: 42,
      secretReferenceId: "11111111-1111-4111-8111-111111111111",
      webhook: "credential_added",
    }
  )

  assert.throws(() =>
    decryptWebhookSigningSecretWithKey(encrypted, wrappingKey, {
      dappId: 42,
      secretReferenceId: "22222222-2222-4222-8222-222222222222",
      webhook: "credential_added",
    })
  )
})

test("webhook signing secret sentinel is not raw secret material", () => {
  assert.equal(
    WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL,
    "__cubid_encrypted_webhook_signing_secret__"
  )
  assert.equal(WEBHOOK_SIGNING_SECRET_LEGACY_SENTINEL.includes("secret-value"), false)
})
