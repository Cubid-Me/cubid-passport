import assert from "node:assert/strict";
import test from "node:test";

import {
  canStampContributeToHumanityScore,
  computeConsentFingerprint,
  createMcpTrustResponse,
  derivePairwiseSubject,
  getActorValidationPolicy,
  normalizeActorSelfIdentification,
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

test("normalizeActorSelfIdentification defaults organization kind and trims display names", () => {
  const organization = normalizeActorSelfIdentification({
    actorType: "organization",
    declaredAt: "2026-04-29T00:00:00Z",
    displayName: "  Cubid Network  ",
  });
  const human = normalizeActorSelfIdentification({
    actorType: "human",
    declaredAt: "2026-04-29T00:00:00Z",
    displayName: "Person",
  });

  assert.equal(organization.displayName, "Cubid Network");
  assert.equal(organization.organizationKind, "other");
  assert.equal(human.organizationKind, null);
});

test("normalizeActorSelfIdentification defaults agents to standalone affiliation", () => {
  const agent = normalizeActorSelfIdentification({
    actorType: "agent",
    declaredAt: "2026-04-29T00:00:00Z",
    displayName: "Helper",
  });

  assert.deepEqual(agent.agentAffiliation, {
    affiliationType: "standalone",
  });
});

test("normalizeActorSelfIdentification rejects contradictory actor metadata", () => {
  assert.throws(() =>
    normalizeActorSelfIdentification({
      actorType: "human",
      organizationKind: "team",
    }),
  );
  assert.throws(() =>
    normalizeActorSelfIdentification({
      actorType: "organization",
      agentAffiliation: {
        affiliationType: "standalone",
      },
    }),
  );
});

test("actor validation policy keeps deep validation focused on humans", () => {
  assert.equal(getActorValidationPolicy("human").validationIntensity, "deep_human");
  assert.equal(getActorValidationPolicy("human").personhoodScoreEligible, true);
  assert.equal(getActorValidationPolicy("agent").personhoodScoreEligible, false);
  assert.equal(getActorValidationPolicy("organization").customValidationRequired, false);
  assert.equal(canStampContributeToHumanityScore("human"), true);
  assert.equal(canStampContributeToHumanityScore("agent"), false);
});

test("createMcpTrustResponse redacts cross-app identifiers and suppresses non-human score contribution", () => {
  const selfIdentification = normalizeActorSelfIdentification({
    actorType: "agent",
    agentAffiliation: {
      affiliationType: "human_supported",
      supportedHumanSubjectKey: "human_subject_123",
    },
    declaredAt: "2026-04-29T00:00:00Z",
    displayName: "Research agent",
  });
  const response = createMcpTrustResponse({
    generatedAt: "2026-04-29T00:01:00Z",
    score: 90,
    selfIdentification,
    stampClaims: [
      {
        claimStatus: "verified",
        contributesToHumanityScore: true,
        stampType: "github",
      },
    ],
    subjectId: "app_scoped_agent_123",
  });

  assert.equal(response.protocolVersion, "cubid-mcp-trust:v1");
  assert.equal(response.subject.actorType, "agent");
  assert.equal(response.trustSummary.personhoodScoreEligible, false);
  assert.equal(response.trustSummary.score, null);
  assert.equal(response.stampClaims[0]?.contributesToHumanityScore, false);
  assert.equal(response.disclosure.rawCrossAppIdentifiersExposed, false);
});
