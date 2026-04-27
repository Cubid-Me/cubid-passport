import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiRateLimitError,
  ApiSecurityError,
  assertAllowedMethod,
  assertAllowedOrigin,
  buildAppErrorEnvelope,
  buildOidcErrorEnvelope,
  createCorsHeaders,
  createRequestId,
  generateDappApiKey,
  getBearerToken,
  getRequestIdFromFetchRequest,
  hashDappApiKey,
  hashLegacyDappApiKey,
  parseDappApiKeyPrefix,
  validateWithSchema,
  verifyDappApiKey,
  z,
} from "./server";

test("createRequestId reuses incoming request ids", () => {
  assert.equal(createRequestId("admin", " request_123 "), "request_123");
});

test("getRequestIdFromFetchRequest generates prefixed ids when missing", () => {
  const requestId = getRequestIdFromFetchRequest(
    new Request("https://example.com/test"),
    "oidc"
  );

  assert.equal(requestId.startsWith("oidc_"), true);
});

test("assertAllowedOrigin allows missing origins by default and accepts allowlisted origins", () => {
  assert.equal(assertAllowedOrigin(null, ["https://admin.cubid.me"]), null);
  assert.equal(
    assertAllowedOrigin("https://admin.cubid.me", ["https://admin.cubid.me"]),
    "https://admin.cubid.me"
  );
});

test("assertAllowedOrigin rejects disallowed explicit origins", () => {
  assert.throws(
    () =>
      assertAllowedOrigin("https://evil.example", [
        "https://admin.cubid.me",
      ]),
    (error) =>
      error instanceof ApiSecurityError &&
      error.statusCode === 403 &&
      error.code === "origin_not_allowed"
  );
});

test("createCorsHeaders emits allowlist response headers only when an origin is present", () => {
  assert.deepEqual(createCorsHeaders(null, ["POST"]), {});
  assert.deepEqual(createCorsHeaders("https://admin.cubid.me", ["POST"]), {
    "access-control-allow-headers":
      "authorization, content-type, x-request-id",
    "access-control-allow-methods": "POST",
    "access-control-allow-origin": "https://admin.cubid.me",
    "access-control-max-age": "600",
    vary: "Origin",
  });
});

test("assertAllowedMethod throws method_not_allowed with allow header details", () => {
  assert.throws(
    () => assertAllowedMethod("GET", ["POST"]),
    (error) =>
      error instanceof ApiSecurityError &&
      error.statusCode === 405 &&
      error.code === "method_not_allowed" &&
      error.headers?.Allow === "POST"
  );
});

test("validateWithSchema returns parsed values and surfaces zod issue details", () => {
  const schema = z.object({
    dappId: z.coerce.number().int().positive(),
  });

  assert.deepEqual(validateWithSchema({ dappId: "42" }, schema), {
    dappId: 42,
  });

  assert.throws(
    () => validateWithSchema({ dappId: "nope" }, schema),
    (error) =>
      error instanceof ApiSecurityError &&
      error.code === "invalid_request" &&
      Array.isArray(error.details?.issues)
  );
});

test("buildAppErrorEnvelope serializes structured Admin-style errors", () => {
  const envelope = buildAppErrorEnvelope(
    "admin_request_1",
    new ApiSecurityError(401, "unauthorized", "Missing Firebase bearer token")
  );

  assert.deepEqual(envelope, {
    body: {
      error: {
        code: "unauthorized",
        message: "Missing Firebase bearer token",
        requestId: "admin_request_1",
      },
    },
    headers: {},
    statusCode: 401,
  });
});

test("buildOidcErrorEnvelope preserves OIDC-compatible error fields and request ids", () => {
  const envelope = buildOidcErrorEnvelope(
    "oidc_request_1",
    new ApiRateLimitError(15)
  );

  assert.deepEqual(envelope, {
    body: {
      error: "rate_limit_exceeded",
      error_description: "Too many requests.",
    },
    headers: {
      "retry-after": "15",
      "x-request-id": "oidc_request_1",
    },
    statusCode: 429,
  });
});

test("getBearerToken returns null for non-bearer authorization headers", () => {
  assert.equal(getBearerToken("Basic abc123"), null);
  assert.equal(getBearerToken("Bearer token_123"), "token_123");
});

test("generateDappApiKey returns show-once keys with lookup prefixes", () => {
  const material = generateDappApiKey();

  assert.match(material.apiKey, /^cubid_live_[0-9a-f]{16}_[A-Za-z0-9_-]+$/);
  assert.equal(parseDappApiKeyPrefix(material.apiKey), material.keyPrefix);
  assert.equal(verifyDappApiKey(material.apiKey, material.keyHash), true);
});

test("verifyDappApiKey rejects invalid scrypt API key material", () => {
  const hash = hashDappApiKey("cubid_live_prefix_secret");

  assert.equal(verifyDappApiKey("cubid_live_prefix_secret", hash), true);
  assert.equal(verifyDappApiKey("cubid_live_prefix_wrong", hash), false);
});

test("verifyDappApiKey supports legacy one-way migrated hashes", () => {
  const legacyKey = "22222222-2222-2222-2222-222222222222";
  const hash = hashLegacyDappApiKey(legacyKey);

  assert.equal(parseDappApiKeyPrefix(legacyKey), "22222222-222");
  assert.equal(verifyDappApiKey(legacyKey, hash), true);
  assert.equal(verifyDappApiKey("22222222-2222-wrong", hash), false);
});
