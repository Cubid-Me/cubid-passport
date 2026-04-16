import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthorizationErrorRedirect,
  buildAuthorizationSuccessRedirect,
  parsePromptSet,
  parseScopeSet,
} from "./authorize";

test("parseScopeSet deduplicates supported scopes", () => {
  assert.deepEqual(parseScopeSet("openid email email cubid:score"), ["openid", "email", "cubid:score"]);
});

test("parsePromptSet rejects invalid prompt combinations", () => {
  assert.throws(() => parsePromptSet("none login"));
});

test("buildAuthorizationSuccessRedirect appends code and state", () => {
  const redirectTo = buildAuthorizationSuccessRedirect("https://rp.example.com/callback?foo=bar", "code_123", "abc");
  const url = new URL(redirectTo);

  assert.equal(url.searchParams.get("foo"), "bar");
  assert.equal(url.searchParams.get("code"), "code_123");
  assert.equal(url.searchParams.get("state"), "abc");
});

test("buildAuthorizationErrorRedirect appends standard error fields", () => {
  const redirectTo = buildAuthorizationErrorRedirect(
    "https://rp.example.com/callback",
    "login_required",
    "session missing",
    "state_456",
  );
  const url = new URL(redirectTo);

  assert.equal(url.searchParams.get("error"), "login_required");
  assert.equal(url.searchParams.get("error_description"), "session missing");
  assert.equal(url.searchParams.get("state"), "state_456");
});