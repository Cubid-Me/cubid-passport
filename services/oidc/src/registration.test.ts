import assert from "node:assert/strict";
import test from "node:test";

import { normalizePostLogoutRedirectUris } from "./registration";

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
