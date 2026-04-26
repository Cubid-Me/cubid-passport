import assert from "node:assert/strict";
import test from "node:test";

import { buildOidcRuntimeConfig } from "./config";

function createTestEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...values,
  };
}

test("buildOidcRuntimeConfig derives passkey rp settings from passport origin", () => {
  const config = buildOidcRuntimeConfig(createTestEnv({
    OIDC_ISSUER_URL: "https://id.cubid.me",
    OIDC_PUBLIC_ORIGIN: "https://id.cubid.me",
    OIDC_PORT: "4280",
    OIDC_PAIRWISE_SUBJECT_MASTER_SECRET: "secret",
    PASSPORT_LOGIN_URL: "https://passport.cubid.me/login",
    PASSPORT_CONSENT_URL: "https://passport.cubid.me/allow",
    OIDC_JWKS_JSON: '{"keys":[]}',
    SUPABASE_URL: "https://supabase.example.com",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  }));

  assert.equal(config.passkeyRpId, "passport.cubid.me");
  assert.deepEqual(config.passkeyExpectedOrigins, ["https://passport.cubid.me"]);
  assert.equal(config.passkeyRpName, "Cubid Passport");
});

test("buildOidcRuntimeConfig respects explicit passkey overrides", () => {
  const config = buildOidcRuntimeConfig(createTestEnv({
    OIDC_ISSUER_URL: "https://id.cubid.me",
    OIDC_PUBLIC_ORIGIN: "https://id.cubid.me",
    OIDC_PORT: "4280",
    OIDC_PAIRWISE_SUBJECT_MASTER_SECRET: "secret",
    PASSPORT_LOGIN_URL: "https://passport.cubid.me/login",
    PASSPORT_CONSENT_URL: "https://passport.cubid.me/allow",
    PASSPORT_PUBLIC_ORIGIN: "https://passport.cubid.me",
    OIDC_PASSKEY_RP_ID: "auth.cubid.me",
    OIDC_PASSKEY_EXPECTED_ORIGINS:
      "https://passport.cubid.me, https://passport-preview.cubid.me",
    OIDC_PASSKEY_RP_NAME: "Cubid ID",
    OIDC_JWKS_JSON: '{"keys":[]}',
    SUPABASE_URL: "https://supabase.example.com",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  }));

  assert.equal(config.passkeyRpId, "auth.cubid.me");
  assert.deepEqual(config.passkeyExpectedOrigins, [
    "https://passport.cubid.me",
    "https://passport-preview.cubid.me",
  ]);
  assert.equal(config.passkeyRpName, "Cubid ID");
});

test("buildOidcRuntimeConfig parses allowed browser origins for OIDC interaction routes", () => {
  const config = buildOidcRuntimeConfig(createTestEnv({
    OIDC_ISSUER_URL: "https://id.cubid.me",
    OIDC_PUBLIC_ORIGIN: "https://id.cubid.me",
    OIDC_CORS_ALLOWED_ORIGINS:
      "https://passport.cubid.me, https://passport-preview.cubid.me",
    OIDC_PAIRWISE_SUBJECT_MASTER_SECRET: "secret",
    PASSPORT_LOGIN_URL: "https://passport.cubid.me/login",
    PASSPORT_CONSENT_URL: "https://passport.cubid.me/allow",
    OIDC_JWKS_JSON: '{"keys":[]}',
    SUPABASE_URL: "https://supabase.example.com",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  }));

  assert.deepEqual(config.corsAllowedOrigins, [
    "https://passport.cubid.me",
    "https://passport-preview.cubid.me",
  ]);
});
