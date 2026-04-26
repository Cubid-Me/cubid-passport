import assert from "node:assert/strict";
import test from "node:test";

import { exportJWK, generateKeyPair } from "jose";

import { createOidcJwks, signOidcJwt, verifyOidcJwt } from "./signing";
import { buildSessionAuthenticationClaims, buildUserInfo, logout, OidcEndpointError, parseRevocationEndpointInput, parseTokenEndpointInput } from "./tokens";

test("parseTokenEndpointInput accepts form fields and HTTP Basic client auth", async () => {
  const credentials = Buffer.from("client%201:secret%202").toString("base64");
  const request = new Request("https://id.cubid.me/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: "code_123",
      redirect_uri: "https://rp.example.com/callback",
      code_verifier: "verifier",
    }),
  });

  const input = await parseTokenEndpointInput(request);

  assert.equal(input.grantType, "authorization_code");
  assert.equal(input.code, "code_123");
  assert.equal(input.basicClientId, "client 1");
  assert.equal(input.basicClientSecret, "secret 2");
});

test("parseRevocationEndpointInput requires client identity alongside token", async () => {
  const credentials = Buffer.from("client%201:secret%202").toString("base64");
  const request = new Request("https://id.cubid.me/revoke", {
    method: "POST",
    headers: {
      authorization: `Basic ${credentials}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: "token_123",
      token_type_hint: "access_token",
    }),
  });

  const input = await parseRevocationEndpointInput(request);

  assert.equal(input.token, "token_123");
  assert.equal(input.tokenTypeHint, "access_token");
  assert.equal(input.basicClientId, "client 1");
  assert.equal(input.basicClientSecret, "secret 2");
});

test("logout returns invalid_request for malformed id_token_hint", async () => {
  await assert.rejects(
    () => logout({} as never, new Request("https://id.cubid.me/logout?id_token_hint=not-a-jwt"), "request_1"),
    (error) => error instanceof OidcEndpointError && error.statusCode === 400 && error.error === "invalid_request",
  );
});

test("signing exposes a public JWKS and verifies issued JWTs", async () => {
  const { privateKey } = await generateKeyPair("RS256");
  const privateJwk = await exportJWK(privateKey);
  process.env.OIDC_ISSUER_URL = "https://id.cubid.me";
  process.env.OIDC_PUBLIC_ORIGIN = "https://id.cubid.me";
  process.env.OIDC_PAIRWISE_SUBJECT_MASTER_SECRET = "test-subject-secret";
  process.env.OIDC_ACTIVE_SIGNING_KID = "test-key-1";
  process.env.OIDC_SIGNING_PRIVATE_JWK_JSON = JSON.stringify(privateJwk);
  process.env.SUPABASE_URL = "https://supabase.example.com";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const jwks = await createOidcJwks();
  assert.equal(jwks.keys.length, 1);
  assert.equal(jwks.keys[0].kid, "test-key-1");
  assert.equal(jwks.keys[0].d, undefined);

  const token = await signOidcJwt(
    { token_use: "userinfo" },
    {
      audience: "https://id.cubid.me/userinfo",
      expiresInSeconds: 60,
      jwtId: "at_test",
      subject: "pairwise-sub",
    },
  );
  const verified = await verifyOidcJwt(token, "https://id.cubid.me/userinfo");

  assert.equal(verified.payload.sub, "pairwise-sub");
  assert.equal(verified.payload.jti, "at_test");
});

test("buildUserInfo releases only consented email and profile claims", () => {
  const userinfo = buildUserInfo(
    {
      access_token_jti: "at_1",
      client_id: "client_1",
      session_id: "session_1",
      consent_id: "consent_1",
      consent_version: 1,
      human_subject_key: "internal-subject-key",
      pairwise_sub: "pairwise-sub",
      scope: "openid email profile",
      audience: "https://id.cubid.me/userinfo",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null,
    },
    {
      session_id: "session_1",
      client_id: "client_1",
      cubid_user_id: 123,
      human_subject_key: "internal-subject-key",
      authentication_methods: ["email_otp"],
      verified_email: "alice@example.com",
      verified_phone: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null,
      created_at: "2026-04-19T12:00:00.000Z",
      metadata: {},
    },
    {
      consent_id: "consent_1",
      human_subject_key: "internal-subject-key",
      client_id: "client_1",
      pairwise_sub: "pairwise-sub",
      granted_scopes: ["openid", "email", "profile"],
      granted_claims: ["sub", "email", "email_verified", "preferred_username"],
      consent_version: 1,
      revoked_at: null,
    },
  );

  assert.deepEqual(userinfo, {
    sub: "pairwise-sub",
    email: "alice@example.com",
    email_verified: true,
    preferred_username: "alice",
  });
});

test("buildSessionAuthenticationClaims maps AMR and passkey ACR from session metadata", () => {
  const claims = buildSessionAuthenticationClaims({
    session_id: "session_1",
    client_id: "client_1",
    cubid_user_id: 123,
    human_subject_key: "internal-subject-key",
    authentication_methods: ["passkey"],
    verified_email: "alice@example.com",
    verified_phone: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    revoked_at: null,
    created_at: "2026-04-19T12:00:00.000Z",
    metadata: {
      acr: "urn:cubid:acr:passkey",
    },
  });

  assert.deepEqual(claims, {
    acr: "urn:cubid:acr:passkey",
    amr: ["passkey"],
  });
});

test("buildSessionAuthenticationClaims omits amr when no authentication methods are stored", () => {
  const claims = buildSessionAuthenticationClaims({
    session_id: "session_2",
    client_id: "client_1",
    cubid_user_id: 123,
    human_subject_key: "internal-subject-key",
    authentication_methods: [],
    verified_email: "alice@example.com",
    verified_phone: null,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    revoked_at: null,
    created_at: "2026-04-19T12:00:00.000Z",
    metadata: {},
  });

  assert.deepEqual(claims, {});
});
