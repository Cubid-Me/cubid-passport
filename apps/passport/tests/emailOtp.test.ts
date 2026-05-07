import assert from "node:assert/strict"
import test from "node:test"

import {
  hashEmailOtp,
  normalizeOtpEmail,
  verifyEmailOtpHash,
} from "../lib/server/emailOtp"

import { MockPassportSupabase } from "./helpers"

test("email OTP hashing is deterministic through the Supabase Vault RPC", async () => {
  const supabase = new MockPassportSupabase()
  const first = await hashEmailOtp(supabase as never, "Alice@Example.COM", "1234")
  const second = await hashEmailOtp(supabase as never, "alice@example.com", 1234)

  assert.equal(first, second)
  assert.equal(first.length, 64)
})

test("email OTP verification accepts only matching OTP hashes", async () => {
  const supabase = new MockPassportSupabase()
  const expectedHash = await hashEmailOtp(
    supabase as never,
    "alice@example.com",
    "1234"
  )

  assert.equal(
    await verifyEmailOtpHash(
      supabase as never,
      "alice@example.com",
      "1234",
      expectedHash
    ),
    true
  )
  assert.equal(
    await verifyEmailOtpHash(
      supabase as never,
      "alice@example.com",
      "9999",
      expectedHash
    ),
    false
  )
})

test("normalizeOtpEmail lowercases and trims email identifiers", () => {
  assert.equal(normalizeOtpEmail(" Alice@Example.COM "), "alice@example.com")
})
