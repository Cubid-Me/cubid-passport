import assert from "node:assert/strict"
import test from "node:test"

import {
  getNearIssuerPrivateKey,
  getPassportInternalApiToken,
  getTwilioAccountSid,
  getTwilioAuthToken,
} from "../lib/server/operationalSecrets"

const ORIGINAL_ENV = { ...process.env }

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

test("Passport operational secrets prefer canonical names over legacy aliases", () => {
  process.env.NEAR_ISSUER_PRIVATE_KEY = "canonical-near-key"
  process.env.private_key_near = "legacy-near-key"
  process.env.TWILIO_ACCOUNT_SID = "canonical-twilio-sid"
  process.env.twilio_sid = "legacy-twilio-sid"
  process.env.TWILIO_AUTH_TOKEN = "canonical-twilio-token"
  process.env.authToken = "legacy-twilio-token"

  assert.equal(getNearIssuerPrivateKey(), "canonical-near-key")
  assert.equal(getTwilioAccountSid(), "canonical-twilio-sid")
  assert.equal(getTwilioAuthToken(), "canonical-twilio-token")
})

test("Passport operational secrets still support legacy aliases during migration", () => {
  delete process.env.NEAR_ISSUER_PRIVATE_KEY
  delete process.env.TWILIO_ACCOUNT_SID
  delete process.env.TWILIO_AUTH_TOKEN
  process.env.private_key_near = "legacy-near-key"
  process.env.twilio_sid = "legacy-twilio-sid"
  process.env.authToken = "legacy-twilio-token"

  assert.equal(getNearIssuerPrivateKey(), "legacy-near-key")
  assert.equal(getTwilioAccountSid(), "legacy-twilio-sid")
  assert.equal(getTwilioAuthToken(), "legacy-twilio-token")
})

test("Passport internal bearer token enforces a minimum length", () => {
  process.env.PASSPORT_INTERNAL_API_TOKEN = "short"

  assert.throws(
    () => getPassportInternalApiToken(),
    /PASSPORT_INTERNAL_API_TOKEN must be at least 16 characters/
  )
})
