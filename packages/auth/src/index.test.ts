import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePkceChallenge,
  generatePkceVerifier,
  verifyPkceChallenge,
} from "./index";

test("generatePkceVerifier creates the requested length", () => {
  const verifier = generatePkceVerifier(72);

  assert.equal(verifier.length, 72);
});

test("derivePkceChallenge is deterministic for the same verifier", () => {
  const verifier = "cubid-test-verifier";

  assert.equal(derivePkceChallenge(verifier), derivePkceChallenge(verifier));
});

test("verifyPkceChallenge matches only the correct verifier", () => {
  const verifier = generatePkceVerifier();
  const challenge = derivePkceChallenge(verifier);

  assert.equal(verifyPkceChallenge(verifier, challenge), true);
  assert.equal(verifyPkceChallenge(`${verifier}-wrong`, challenge), false);
});