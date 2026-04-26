import assert from "node:assert/strict";
import test from "node:test";

import { ApiSecurityError } from "@cubid/auth/server";

import {
  createOidcCorsHeaders,
  jsonResponse,
  oidcErrorResponse,
  redirectResponse,
  resolveOidcCorsPolicy,
} from "./app";

process.env.OIDC_ISSUER_URL ??= "https://id.cubid.me";
process.env.OIDC_PUBLIC_ORIGIN ??= "https://id.cubid.me";
process.env.OIDC_CORS_ALLOWED_ORIGINS ??=
  "https://passport.cubid.me,https://passport-preview.cubid.me";
process.env.OIDC_PAIRWISE_SUBJECT_MASTER_SECRET ??= "secret";
process.env.PASSPORT_LOGIN_URL ??= "https://passport.cubid.me/login";
process.env.PASSPORT_CONSENT_URL ??= "https://passport.cubid.me/allow";
process.env.OIDC_JWKS_JSON ??= '{"keys":[]}';
process.env.SUPABASE_URL ??= "https://supabase.example.com";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";

test("jsonResponse includes the OIDC request id header", async () => {
  const response = jsonResponse("oidc_test_1", 200, { ok: true });

  assert.equal(response.headers.get("x-request-id"), "oidc_test_1");
  assert.deepEqual(await response.json(), { ok: true });
});

test("redirectResponse includes the OIDC request id header", () => {
  const response = redirectResponse("oidc_test_2", "https://passport.cubid.me/login");

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("x-request-id"), "oidc_test_2");
  assert.equal(
    response.headers.get("location"),
    "https://passport.cubid.me/login"
  );
});

test("oidcErrorResponse preserves the RFC-style error body", async () => {
  const response = oidcErrorResponse(
    "oidc_test_3",
    new ApiSecurityError(400, "invalid_request", "Bad request payload.")
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("x-request-id"), "oidc_test_3");
  assert.deepEqual(await response.json(), {
    error: "invalid_request",
    error_description: "Bad request payload.",
  });
});

test("resolveOidcCorsPolicy only exposes browser-callable routes", () => {
  assert.deepEqual(resolveOidcCorsPolicy("/interaction/login/challenge"), {
    allowedMethods: ["GET", "OPTIONS"],
  });
  assert.deepEqual(
    resolveOidcCorsPolicy(
      "/sessions/session_123/passkeys/registration/options"
    ),
    {
      allowedMethods: ["POST", "OPTIONS"],
    }
  );
  assert.equal(resolveOidcCorsPolicy("/token"), null);
  assert.equal(resolveOidcCorsPolicy("/userinfo"), null);
});

test("createOidcCorsHeaders allows configured browser origins", () => {
  const headers = createOidcCorsHeaders(
    new Request("https://id.cubid.me/interaction/login/challenge", {
      headers: {
        origin: "https://passport.cubid.me",
      },
    }),
    ["POST", "OPTIONS"]
  );

  assert.equal(
    headers["access-control-allow-origin"],
    "https://passport.cubid.me"
  );
  assert.equal(
    headers["access-control-allow-methods"],
    "POST, OPTIONS"
  );
});

test("createOidcCorsHeaders rejects disallowed browser origins", () => {
  assert.throws(
    () =>
      createOidcCorsHeaders(
        new Request("https://id.cubid.me/interaction/login/challenge", {
          headers: {
            origin: "https://evil.example.com",
          },
        }),
        ["POST", "OPTIONS"]
      ),
    /Origin is not allowed/
  );
});
