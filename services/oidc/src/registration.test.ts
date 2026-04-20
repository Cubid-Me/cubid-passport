import assert from "node:assert/strict";
import test from "node:test";

import { normalizePostLogoutRedirectUris, normalizeRegisteredGrantTypes } from "./registration";

test("normalizePostLogoutRedirectUris allows omitted logout redirects for interactive clients", () => {
  assert.deepEqual(normalizePostLogoutRedirectUris("public_web", undefined), []);
  assert.deepEqual(normalizePostLogoutRedirectUris("confidential_web", []), []);
  assert.deepEqual(normalizePostLogoutRedirectUris("native", null), []);
});

test("normalizePostLogoutRedirectUris still validates supplied logout redirects", () => {
  assert.deepEqual(
    normalizePostLogoutRedirectUris("public_web", ["https://rp.example.com/logout", "https://rp.example.com/logout"]),
    ["https://rp.example.com/logout"],
  );

  assert.throws(
    () => normalizePostLogoutRedirectUris("public_web", ["http://rp.example.com/logout"]),
    /HTTPS or localhost/,
  );
});

test("normalizeRegisteredGrantTypes defaults interactive clients to implemented grants only", () => {
  assert.deepEqual(normalizeRegisteredGrantTypes("confidential_web", undefined), ["authorization_code"]);
  assert.deepEqual(normalizeRegisteredGrantTypes("native", undefined), ["authorization_code"]);
});

test("normalizeRegisteredGrantTypes rejects currently unsupported grants", () => {
  assert.throws(
    () => normalizeRegisteredGrantTypes("confidential_web", ["authorization_code", "refresh_token"]),
    /not implemented/,
  );
});
