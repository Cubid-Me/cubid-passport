import assert from "node:assert/strict";
import test from "node:test";

import {
  getFirebaseAdminCredentialsFrom,
  getRequiredJsonSecretObjectFrom,
  getRequiredSecretFrom,
  getRequiredSecretFromAliases,
  getSupabaseServiceRoleConfigFrom,
  normalizeFirebasePrivateKey,
  parseJsonSecretObject,
  redactSecret,
} from "./index";

test("getRequiredSecretFrom returns present secrets and names missing variables safely", () => {
  assert.equal(getRequiredSecretFrom({ API_SECRET: "  value  " }, "API_SECRET"), "value");
  assert.throws(
    () => getRequiredSecretFrom({}, "API_SECRET"),
    /Missing required secret: API_SECRET/
  );
});

test("getRequiredSecretFrom enforces minimum lengths without leaking values", () => {
  assert.throws(
    () => getRequiredSecretFrom({ MASTER_SECRET: "short" }, "MASTER_SECRET", { minLength: 12 }),
    /Secret MASTER_SECRET must be at least 12 characters/
  );
});

test("getRequiredSecretFromAliases prefers canonical names and supports legacy aliases", () => {
  assert.equal(
    getRequiredSecretFromAliases(
      { LEGACY_TOKEN: "legacy", NEW_TOKEN: "canonical" },
      ["NEW_TOKEN", "LEGACY_TOKEN"]
    ),
    "canonical"
  );
  assert.equal(
    getRequiredSecretFromAliases({ LEGACY_TOKEN: "legacy" }, ["NEW_TOKEN", "LEGACY_TOKEN"]),
    "legacy"
  );
});

test("redactSecret hides secret material", () => {
  assert.equal(redactSecret(null), "[missing]");
  assert.equal(redactSecret("short"), "[redacted]");
  assert.equal(redactSecret("abcdefghijklmnopqrstuvwxyz"), "abcd...[redacted]...wxyz");
});

test("parseJsonSecretObject accepts objects and rejects invalid JSON", () => {
  assert.deepEqual(parseJsonSecretObject('{"kid":"key-1"}', "OIDC_SIGNING_PRIVATE_JWK_JSON"), {
    kid: "key-1",
  });
  assert.throws(
    () => parseJsonSecretObject("[1,2,3]", "OIDC_SIGNING_PRIVATE_JWK_JSON"),
    /must be a JSON object/
  );
  assert.throws(
    () => parseJsonSecretObject("{not json", "OIDC_SIGNING_PRIVATE_JWK_JSON"),
    /must be valid JSON/
  );
});

test("getRequiredJsonSecretObjectFrom requires a JSON object secret", () => {
  assert.deepEqual(
    getRequiredJsonSecretObjectFrom({ FIREBASE_JSON: '{"project_id":"cubid"}' }, "FIREBASE_JSON"),
    { project_id: "cubid" }
  );
});

test("normalizeFirebasePrivateKey converts escaped newlines", () => {
  assert.equal(
    normalizeFirebasePrivateKey("-----BEGIN-----\\nabc\\n-----END-----"),
    "-----BEGIN-----\nabc\n-----END-----"
  );
});

test("getFirebaseAdminCredentialsFrom parses server-only Firebase credentials", () => {
  assert.deepEqual(
    getFirebaseAdminCredentialsFrom({
      FIREBASE_CLIENT_EMAIL: "firebase@example.com",
      FIREBASE_PRIVATE_KEY: "line1\\nline2",
      FIREBASE_PROJECT_ID: "cubid",
    }),
    {
      clientEmail: "firebase@example.com",
      privateKey: "line1\nline2",
      projectId: "cubid",
    }
  );
});

test("getSupabaseServiceRoleConfigFrom loads service-role credentials", () => {
  assert.deepEqual(
    getSupabaseServiceRoleConfigFrom({
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      SUPABASE_URL: "https://supabase.example.com",
    }),
    {
      serviceRoleKey: "service-role-key",
      url: "https://supabase.example.com",
    }
  );
});
