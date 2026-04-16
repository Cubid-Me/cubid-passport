import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeededClaimRegistryRecord,
  getClaimDefinition,
  getClaimRegistryRecord,
  getClaimsForScopes,
  isSupportedScope,
  isThresholdPolicySatisfied,
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

test("createSeededClaimRegistryRecord overlays seeded claim metadata", () => {
  const seeded = createSeededClaimRegistryRecord({
    name: "custom_claim",
    scopes: ["cubid:claims"],
    classification: "json",
    description: "Custom claim",
    tokenEligible: false,
    userinfoEligible: true,
  }, {
    availabilityMode: "client_bound",
    boundClientIds: ["client-a"],
  });

  assert.equal(seeded.claimId, "seed:custom_claim");
  assert.equal(seeded.availabilityMode, "client_bound");
  assert.deepEqual(seeded.boundClientIds, ["client-a"]);
  assert.equal(seeded.requiresExplicitConsent, true);
});

test("getClaimRegistryRecord returns seeded registry overlays", () => {
  const seeded = getClaimRegistryRecord("sub");

  assert.equal(seeded?.claimId, "seed:sub");
  assert.equal(seeded?.source, "seed");
  assert.equal(seeded?.requiresExplicitConsent, false);
});

test("isThresholdPolicySatisfied requires listed verification claims and stamps", () => {
  const satisfied = isThresholdPolicySatisfied({
    requiredVerificationClaims: ["email_verified"],
    requiredStampKeys: ["phone"],
  }, {
    verificationClaims: ["email_verified", "cubid_verification_summary"],
    stampKeys: ["phone", "worldcoin"],
  });
  const unsatisfied = isThresholdPolicySatisfied({
    requiredVerificationClaims: ["email_verified"],
    requiredStampKeys: ["phone"],
  }, {
    verificationClaims: ["cubid_verification_summary"],
    stampKeys: ["phone"],
  });

  assert.equal(satisfied, true);
  assert.equal(unsatisfied, false);
});