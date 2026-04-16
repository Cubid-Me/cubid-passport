import assert from "node:assert/strict";
import test from "node:test";

import {
  getClaimDefinition,
  getClaimsForScopes,
  isSupportedScope,
} from "./index";

test("isSupportedScope recognizes Cubid and standard scopes", () => {
  assert.equal(isSupportedScope("openid"), true);
  assert.equal(isSupportedScope("cubid:claims"), true);
  assert.equal(isSupportedScope("unknown:scope"), false);
});

test("getClaimsForScopes deduplicates claims across scopes", () => {
  const claims = getClaimsForScopes(["openid", "email", "email"]);

  assert.deepEqual(claims, ["sub", "email", "email_verified"]);
});

test("getClaimDefinition returns metadata for known claims", () => {
  const definition = getClaimDefinition("cubid_score");

  assert.equal(definition?.classification, "score");
  assert.equal(definition?.tokenEligible, true);
});