import assert from "node:assert/strict";
import test from "node:test";

import {
  base64UrlDecode,
  base64UrlEncode,
  createCubidWebAuthnUserHandle,
  derivePkceChallenge,
  generatePkceVerifier,
  parseCubidWebAuthnUserHandle,
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

test("base64UrlDecode reverses base64UrlEncode", () => {
  const original = Buffer.from("cubid-passkey-test", "utf8");

  assert.equal(Buffer.from(base64UrlDecode(base64UrlEncode(original))).toString("utf8"), "cubid-passkey-test");
});

test("createCubidWebAuthnUserHandle round-trips the subject payload", () => {
  const userHandle = createCubidWebAuthnUserHandle({
    humanSubjectKey: "subject_123",
    cubidUserId: 42,
  });

  assert.deepEqual(parseCubidWebAuthnUserHandle(userHandle), {
    humanSubjectKey: "subject_123",
    cubidUserId: 42,
  });
});

test("parseCubidWebAuthnUserHandle rejects malformed handles", () => {
  assert.throws(() => parseCubidWebAuthnUserHandle("not-a-valid-handle"), /Invalid Cubid WebAuthn user handle/);
});