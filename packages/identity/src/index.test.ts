import assert from "node:assert/strict";
import test from "node:test";

import {
  computeConsentFingerprint,
  derivePairwiseSubject,
} from "./index";

const secret = "cubid-identity-secret";

test("derivePairwiseSubject is stable for the same issuer, client, and subject", () => {
  const first = derivePairwiseSubject({
    derivationVersion: "v1",
    issuer: "https://id.cubid.me",
    clientId: "client-a",
    humanSubjectKey: "subject-1",
  }, secret);
  const second = derivePairwiseSubject({
    derivationVersion: "v1",
    issuer: "https://id.cubid.me",
    clientId: "client-a",
    humanSubjectKey: "subject-1",
  }, secret);

  assert.equal(first.sub, second.sub);
});

test("derivePairwiseSubject changes across clients", () => {
  const first = derivePairwiseSubject({
    derivationVersion: "v1",
    issuer: "https://id.cubid.me",
    clientId: "client-a",
    humanSubjectKey: "subject-1",
  }, secret);
  const second = derivePairwiseSubject({
    derivationVersion: "v1",
    issuer: "https://id.cubid.me",
    clientId: "client-b",
    humanSubjectKey: "subject-1",
  }, secret);

  assert.notEqual(first.sub, second.sub);
});

test("computeConsentFingerprint ignores ordering", () => {
  const first = computeConsentFingerprint(["openid", "email"], ["sub", "email"]);
  const second = computeConsentFingerprint(["email", "openid"], ["email", "sub"]);

  assert.equal(first, second);
});