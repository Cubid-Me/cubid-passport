import { createHash, createHmac, randomBytes } from "node:crypto";

const DERIVATION_CONTEXT = "cubid-sub:v1";
const APP_SCOPED_DERIVATION_CONTEXT = "cubid-app-sub:v1";

const RAW_IDENTIFIER_CLAIMS = new Set([
  "cubid_user_id",
  "dapp_user_uuid",
  "firebase_uid",
  "human_subject_key",
  "internal_user_id",
  "session_id",
  "token_hash",
]);

export const CUBID_ACTOR_TYPES = ["human", "agent", "organization"] as const;

export const CUBID_ORGANIZATION_KINDS = [
  "formal_organization",
  "team",
  "group",
  "network",
  "community",
  "collective",
  "other",
] as const;

export const CUBID_AGENT_AFFILIATION_TYPES = [
  "standalone",
  "human_supported",
  "organization_supported",
] as const;

export type CubidActorType = (typeof CUBID_ACTOR_TYPES)[number];
export type CubidOrganizationKind = (typeof CUBID_ORGANIZATION_KINDS)[number];
export type CubidAgentAffiliationType = (typeof CUBID_AGENT_AFFILIATION_TYPES)[number];

export type ConsentClassification = "identity" | "hashed" | "boolean" | "score" | "json";
export type AppScopedSubjectType = CubidActorType;
export type DisclosureGrantStatus = "active" | "revoked";
export type DisclosureGrantSource = "allow_page" | "oidc" | "api" | "webhook";
export type DisclosureDecision = "grant" | "deny";

export interface CubidAgentAffiliation {
  affiliationType: CubidAgentAffiliationType;
  supportedHumanSubjectKey?: string | null;
  organizationSubjectKey?: string | null;
  description?: string | null;
}

export interface CubidActorSelfIdentificationInput {
  actorType: CubidActorType;
  displayName?: string | null;
  organizationKind?: CubidOrganizationKind | null;
  agentAffiliation?: CubidAgentAffiliation | null;
  declaredAt?: string;
}

export interface CubidActorSelfIdentification {
  actorType: CubidActorType;
  displayName: string | null;
  organizationKind: CubidOrganizationKind | null;
  agentAffiliation: CubidAgentAffiliation | null;
  declaredAt: string;
}

export type CubidValidationIntensity = "deep_human" | "limited_generic" | "none";

export interface CubidActorValidationPolicy {
  actorType: CubidActorType;
  validationIntensity: CubidValidationIntensity;
  personhoodScoreEligible: boolean;
  stampClaimEligible: boolean;
  socialStampConflictPrevention: boolean;
  customValidationRequired: boolean;
  description: string;
}

export interface CubidMcpTrustSubject {
  subjectId: string;
  actorType: CubidActorType;
  displayName: string | null;
  organizationKind: CubidOrganizationKind | null;
  agentAffiliation: CubidAgentAffiliation | null;
}

export interface CubidMcpTrustResponse {
  protocolVersion: "cubid-mcp-trust:v1";
  subject: CubidMcpTrustSubject;
  trustSummary: {
    personhoodScoreEligible: boolean;
    humanValidationFocus: boolean;
    validationIntensity: CubidValidationIntensity;
    score?: number | null;
    scoreUpdatedAt?: string | null;
  };
  stampClaims: Array<{
    stampType: string;
    claimStatus: "claimed" | "verified" | "revoked" | "conflict";
    contributesToHumanityScore: boolean;
  }>;
  disclosure: {
    appScoped: boolean;
    consentRequired: boolean;
    rawCrossAppIdentifiersExposed: false;
  };
  generatedAt: string;
}

export interface HumanSubjectSeed {
  humanSubjectKey: string;
  cubidUserId: number | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  createdAt: string;
}

export interface PairwiseSubjectDerivationInput {
  derivationVersion: "v1";
  issuer: string;
  clientId: string;
  humanSubjectKey: string;
}

export interface PairwiseSubjectDerivationOutput {
  derivationVersion: "v1";
  sub: string;
  subjectType: "pairwise_human";
}

export interface AppScopedSubjectDerivationInput {
  derivationVersion: "v1";
  appIdentifier: string;
  actorType: AppScopedSubjectType;
  subjectKey: string;
}

export interface AppScopedSubjectDerivationOutput {
  derivationVersion: "v1";
  appScopedSubject: string;
  subjectType: AppScopedSubjectType;
}

export interface DisclosureClaimDescriptor {
  claim: string;
  dataClass: ConsentClassification;
  required: boolean;
  purpose: string | null;
}

export interface SelectiveDisclosureRequest {
  appIdentifier: string;
  appScopedSubject: string;
  requestedScopes: string[];
  requestedClaims: DisclosureClaimDescriptor[];
  policyVersion: string;
  source: DisclosureGrantSource;
}

export interface SelectiveDisclosureGrant {
  grantFingerprint: string;
  appIdentifier: string;
  appScopedSubject: string;
  grantedScopes: string[];
  grantedClaims: DisclosureClaimDescriptor[];
  status: DisclosureGrantStatus;
  policyVersion: string;
  source: DisclosureGrantSource;
  grantedAt: string;
  revokedAt: string | null;
  revokedBy: "user" | "operator" | "system" | null;
}

export interface CubidConsentRecord {
  consentId: string;
  humanSubjectKey: string;
  clientId: string;
  pairwiseSub: string;
  grantedScopes: string[];
  grantedClaims: string[];
  claimClassificationSummary: Array<{
    claim: string;
    dataClass: ConsentClassification;
  }>;
  consentVersion: number;
  policyVersion: string;
  grantedAt: string;
  revokedAt: string | null;
  revokedBy: "user" | "operator" | null;
  source: "passport";
}

function normalizeUniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function normalizeAppIdentifier(appIdentifier: string): string {
  const normalized = appIdentifier.trim();
  if (!normalized) {
    throw new Error("App identifier is required.");
  }
  return normalized;
}

function normalizeSubjectKey(subjectKey: string): string {
  const normalized = subjectKey.trim();
  if (!normalized) {
    throw new Error("Subject key is required.");
  }
  return normalized;
}

function base64UrlEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createHumanSubjectKey(): string {
  return base64UrlEncode(randomBytes(32));
}

export function normalizeActorSelfIdentification(
  input: CubidActorSelfIdentificationInput,
): CubidActorSelfIdentification {
  if (!CUBID_ACTOR_TYPES.includes(input.actorType)) {
    throw new Error("Unsupported Cubid actor type.");
  }

  if (input.actorType !== "organization" && input.organizationKind) {
    throw new Error("organizationKind is only valid for organization actors.");
  }

  if (input.actorType !== "agent" && input.agentAffiliation) {
    throw new Error("agentAffiliation is only valid for agent actors.");
  }

  if (input.organizationKind && !CUBID_ORGANIZATION_KINDS.includes(input.organizationKind)) {
    throw new Error("Unsupported Cubid organization kind.");
  }

  if (
    input.agentAffiliation
    && !CUBID_AGENT_AFFILIATION_TYPES.includes(input.agentAffiliation.affiliationType)
  ) {
    throw new Error("Unsupported Cubid agent affiliation type.");
  }

  return {
    actorType: input.actorType,
    agentAffiliation:
      input.actorType === "agent"
        ? input.agentAffiliation ?? { affiliationType: "standalone" }
        : null,
    declaredAt: input.declaredAt ?? new Date().toISOString(),
    displayName: input.displayName?.trim() || null,
    organizationKind: input.actorType === "organization" ? input.organizationKind ?? "other" : null,
  };
}

export function getActorValidationPolicy(actorType: CubidActorType): CubidActorValidationPolicy {
  switch (actorType) {
    case "human":
      return {
        actorType,
        customValidationRequired: true,
        description: "Humans are the primary proof-of-personhood subject and receive deep validation and scoring.",
        personhoodScoreEligible: true,
        socialStampConflictPrevention: true,
        stampClaimEligible: true,
        validationIntensity: "deep_human",
      };
    case "agent":
      return {
        actorType,
        customValidationRequired: false,
        description: "Agents self-identify and may claim stamps, but do not receive bespoke personhood validation by default.",
        personhoodScoreEligible: false,
        socialStampConflictPrevention: true,
        stampClaimEligible: true,
        validationIntensity: "limited_generic",
      };
    case "organization":
      return {
        actorType,
        customValidationRequired: false,
        description: "Organizations include teams, groups, networks, communities, collectives, and formal entities; validation is generic by default.",
        personhoodScoreEligible: false,
        socialStampConflictPrevention: true,
        stampClaimEligible: true,
        validationIntensity: "limited_generic",
      };
  }
}

export function canStampContributeToHumanityScore(actorType: CubidActorType): boolean {
  return getActorValidationPolicy(actorType).personhoodScoreEligible;
}

export function createMcpTrustResponse(input: {
  subjectId: string;
  selfIdentification: CubidActorSelfIdentification;
  stampClaims?: CubidMcpTrustResponse["stampClaims"];
  score?: number | null;
  scoreUpdatedAt?: string | null;
  generatedAt?: string;
}): CubidMcpTrustResponse {
  const policy = getActorValidationPolicy(input.selfIdentification.actorType);

  return {
    disclosure: {
      appScoped: true,
      consentRequired: true,
      rawCrossAppIdentifiersExposed: false,
    },
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    protocolVersion: "cubid-mcp-trust:v1",
    stampClaims: (input.stampClaims ?? []).map((stamp) => ({
      ...stamp,
      contributesToHumanityScore:
        stamp.contributesToHumanityScore && policy.personhoodScoreEligible,
    })),
    subject: {
      actorType: input.selfIdentification.actorType,
      agentAffiliation: input.selfIdentification.agentAffiliation,
      displayName: input.selfIdentification.displayName,
      organizationKind: input.selfIdentification.organizationKind,
      subjectId: input.subjectId,
    },
    trustSummary: {
      humanValidationFocus: input.selfIdentification.actorType === "human",
      personhoodScoreEligible: policy.personhoodScoreEligible,
      score: policy.personhoodScoreEligible ? input.score ?? null : null,
      scoreUpdatedAt: policy.personhoodScoreEligible ? input.scoreUpdatedAt ?? null : null,
      validationIntensity: policy.validationIntensity,
    },
  };
}

export function derivePairwiseSubject(
  input: PairwiseSubjectDerivationInput,
  masterSecret: string,
): PairwiseSubjectDerivationOutput {
  if (!masterSecret.trim()) {
    throw new Error("Pairwise subject master secret is required.");
  }

  const payload = [DERIVATION_CONTEXT, input.issuer, input.clientId, input.humanSubjectKey].join("|");
  const digest = createHmac("sha256", masterSecret).update(payload).digest();

  return {
    derivationVersion: "v1",
    sub: base64UrlEncode(digest),
    subjectType: "pairwise_human",
  };
}

export function deriveAppScopedSubject(
  input: AppScopedSubjectDerivationInput,
  masterSecret: string,
): AppScopedSubjectDerivationOutput {
  if (!masterSecret.trim()) {
    throw new Error("App-scoped subject master secret is required.");
  }

  const appIdentifier = normalizeAppIdentifier(input.appIdentifier);
  const subjectKey = normalizeSubjectKey(input.subjectKey);
  const payload = [
    APP_SCOPED_DERIVATION_CONTEXT,
    appIdentifier,
    input.actorType,
    subjectKey,
  ].join("|");
  const digest = createHmac("sha256", masterSecret).update(payload).digest();

  return {
    appScopedSubject: base64UrlEncode(digest),
    derivationVersion: "v1",
    subjectType: input.actorType,
  };
}

export function computeConsentFingerprint(grantedScopes: readonly string[], grantedClaims: readonly string[]): string {
  const normalizedScopes = [...new Set(grantedScopes)].sort().join(" ");
  const normalizedClaims = [...new Set(grantedClaims)].sort().join(" ");
  const payload = `${normalizedScopes}|${normalizedClaims}`;

  return base64UrlEncode(createHash("sha256").update(payload).digest());
}

export function normalizeDisclosureClaimDescriptors(
  claims: readonly DisclosureClaimDescriptor[],
): DisclosureClaimDescriptor[] {
  const byClaim = new Map<string, DisclosureClaimDescriptor>();

  for (const claim of claims) {
    const claimName = claim.claim.trim();
    if (!claimName) {
      throw new Error("Disclosure claim name is required.");
    }
    if (RAW_IDENTIFIER_CLAIMS.has(claimName)) {
      throw new Error(`Raw cross-app identifier claim is not disclosable: ${claimName}`);
    }

    byClaim.set(claimName, {
      claim: claimName,
      dataClass: claim.dataClass,
      purpose: claim.purpose?.trim() || null,
      required: claim.required,
    });
  }

  return [...byClaim.values()].sort((left, right) => left.claim.localeCompare(right.claim));
}

export function createSelectiveDisclosureGrant(
  input: SelectiveDisclosureRequest & {
    decision: DisclosureDecision;
    grantedAt?: string;
  },
): SelectiveDisclosureGrant {
  const requestedClaims = normalizeDisclosureClaimDescriptors(input.requestedClaims);
  const grantedClaims = input.decision === "grant" ? requestedClaims : [];
  const grantedScopes = input.decision === "grant"
    ? normalizeUniqueStrings(input.requestedScopes)
    : [];
  const claimNames = grantedClaims.map((claim) => claim.claim);

  return {
    appIdentifier: normalizeAppIdentifier(input.appIdentifier),
    appScopedSubject: normalizeSubjectKey(input.appScopedSubject),
    grantedAt: input.grantedAt ?? new Date().toISOString(),
    grantedClaims,
    grantedScopes,
    grantFingerprint: computeConsentFingerprint(grantedScopes, claimNames),
    policyVersion: input.policyVersion.trim() || "unversioned",
    revokedAt: null,
    revokedBy: null,
    source: input.source,
    status: input.decision === "grant" ? "active" : "revoked",
  };
}

export function filterDisclosedClaimValues(
  grant: Pick<SelectiveDisclosureGrant, "grantedClaims" | "status">,
  availableClaims: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  if (grant.status !== "active") {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const claim of grant.grantedClaims) {
    if (RAW_IDENTIFIER_CLAIMS.has(claim.claim)) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(availableClaims, claim.claim)) {
      result[claim.claim] = availableClaims[claim.claim];
    }
  }
  return result;
}

export function isRawIdentifierClaim(claimName: string): boolean {
  return RAW_IDENTIFIER_CLAIMS.has(claimName.trim());
}
