export const STANDARD_OIDC_SCOPES = ["openid", "profile", "email"] as const;
export const CUBID_SCOPES = ["cubid:score", "cubid:stamps", "cubid:claims", "cubid:verification"] as const;

export const ALL_OIDC_SCOPES = [...STANDARD_OIDC_SCOPES, ...CUBID_SCOPES] as const;

export type OidcScope = typeof ALL_OIDC_SCOPES[number];
export type CubidClaimClassification = "identity" | "hashed" | "boolean" | "score" | "json";
export type ClaimRegistryStatus = "active" | "archived";
export type ClaimAvailabilityMode = "global" | "client_bound";
export type ClaimRegistrySource = "seed" | "admin";
export type ClaimComputationMethod =
  | "seeded"
  | "derived_score"
  | "derived_verification"
  | "derived_stamps"
  | "custom_json"
  | "custom_boolean"
  | "custom_identity";
export type IdentityDepthPolicyStatus = "active" | "archived";

const EMPTY_STRING_ARRAY: readonly string[] = [];

export interface OidcClaimDefinition {
  name: string;
  scopes: readonly OidcScope[];
  classification: CubidClaimClassification;
  description: string;
  tokenEligible: boolean;
  userinfoEligible: boolean;
}

export interface ClientScopePolicyBinding {
  clientId: string;
  allowedScopes: readonly OidcScope[];
  allowedClaims: readonly string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClaimRegistryRecord extends OidcClaimDefinition {
  claimId: string;
  displayName: string;
  source: ClaimRegistrySource;
  status: ClaimRegistryStatus;
  computationMethod: ClaimComputationMethod;
  requiresExplicitConsent: boolean;
  availabilityMode: ClaimAvailabilityMode;
  boundClientIds: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface IdentityDepthThresholdPolicy {
  policyId: string;
  name: string;
  description: string;
  status: IdentityDepthPolicyStatus;
  targetClaims: readonly string[];
  targetScopes: readonly OidcScope[];
  minimumScoreBand: string | null;
  requiredVerificationClaims: readonly string[];
  requiredStampKeys: readonly string[];
  policyVersion: number;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ClientClaimPolicyBinding {
  bindingId: string;
  clientId: string;
  claimName: string;
  policyId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export const CLAIM_DEFINITIONS: readonly OidcClaimDefinition[] = [
  {
    name: "sub",
    scopes: ["openid"],
    classification: "identity",
    description: "Pairwise Cubid subject identifier.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "name",
    scopes: ["profile"],
    classification: "identity",
    description: "Display name shared through the OIDC profile scope.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "preferred_username",
    scopes: ["profile"],
    classification: "identity",
    description: "Preferred handle or username.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "picture",
    scopes: ["profile"],
    classification: "identity",
    description: "Profile image URL.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "locale",
    scopes: ["profile"],
    classification: "identity",
    description: "Preferred locale.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "updated_at",
    scopes: ["profile"],
    classification: "identity",
    description: "Timestamp for profile updates.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "email",
    scopes: ["email"],
    classification: "identity",
    description: "Verified email address when consented.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "email_verified",
    scopes: ["email"],
    classification: "boolean",
    description: "Whether the email address has been verified.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_score",
    scopes: ["cubid:score"],
    classification: "score",
    description: "Derived Cubid score value.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_score_band",
    scopes: ["cubid:score"],
    classification: "score",
    description: "Derived score band for the current subject.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_personhood_level",
    scopes: ["cubid:score"],
    classification: "score",
    description: "Human-readable personhood level derived from the score.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_score_updated_at",
    scopes: ["cubid:score"],
    classification: "score",
    description: "Timestamp for the latest score update.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_verifications",
    scopes: ["cubid:verification"],
    classification: "json",
    description: "Detailed verification outcomes for the current subject.",
    tokenEligible: false,
    userinfoEligible: true,
  },
  {
    name: "cubid_verification_summary",
    scopes: ["cubid:verification"],
    classification: "boolean",
    description: "Compressed verification summary flags.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_stamps",
    scopes: ["cubid:stamps"],
    classification: "json",
    description: "Policy-approved stamp and registry output.",
    tokenEligible: false,
    userinfoEligible: true,
  },
  {
    name: "cubid_claims",
    scopes: ["cubid:claims"],
    classification: "json",
    description: "Custom Cubid claims resolved for the client.",
    tokenEligible: false,
    userinfoEligible: true,
  },
  {
    name: "cubid_actor_type",
    scopes: ["cubid:claims"],
    classification: "identity",
    description: "Self-identified Cubid actor type: human, agent, or organization.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_actor_self_identification",
    scopes: ["cubid:claims"],
    classification: "json",
    description: "Structured self-identification details for agent and organization actors.",
    tokenEligible: false,
    userinfoEligible: true,
  },
  {
    name: "cubid_agent_supports_human",
    scopes: ["cubid:claims"],
    classification: "boolean",
    description: "Whether an agent self-identifies as supporting a single human actor.",
    tokenEligible: true,
    userinfoEligible: true,
  },
  {
    name: "cubid_organization_kind",
    scopes: ["cubid:claims"],
    classification: "identity",
    description: "Organization self-identification kind such as team, group, network, or formal organization.",
    tokenEligible: true,
    userinfoEligible: true,
  },
] as const;

function createDisplayName(claimName: string): string {
  return claimName
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function inferComputationMethod(classification: CubidClaimClassification): ClaimComputationMethod {
  switch (classification) {
    case "score":
      return "derived_score";
    case "boolean":
      return "derived_verification";
    case "json":
      return "derived_stamps";
    case "identity":
    case "hashed":
    default:
      return "seeded";
  }
}

export function createSeededClaimRegistryRecord(
  definition: OidcClaimDefinition,
  overrides: Partial<ClaimRegistryRecord> = {},
): ClaimRegistryRecord {
  const claimId = overrides.claimId ?? `seed:${definition.name}`;
  const createdAt = overrides.createdAt ?? "seed";
  const updatedAt = overrides.updatedAt ?? createdAt;

  return {
    claimId,
    name: definition.name,
    displayName: overrides.displayName ?? createDisplayName(definition.name),
    scopes: overrides.scopes ?? definition.scopes,
    classification: overrides.classification ?? definition.classification,
    description: overrides.description ?? definition.description,
    tokenEligible: overrides.tokenEligible ?? definition.tokenEligible,
    userinfoEligible: overrides.userinfoEligible ?? definition.userinfoEligible,
    source: overrides.source ?? "seed",
    status: overrides.status ?? "active",
    computationMethod: overrides.computationMethod ?? inferComputationMethod(definition.classification),
    requiresExplicitConsent: overrides.requiresExplicitConsent ?? definition.name !== "sub",
    availabilityMode: overrides.availabilityMode ?? "global",
    boundClientIds: overrides.boundClientIds ?? EMPTY_STRING_ARRAY,
    metadata: overrides.metadata ?? {},
    createdAt,
    updatedAt,
    archivedAt: overrides.archivedAt ?? null,
  };
}

export const SEEDED_CLAIM_REGISTRY: readonly ClaimRegistryRecord[] = CLAIM_DEFINITIONS.map((definition) =>
  createSeededClaimRegistryRecord(definition),
);

export function isSupportedScope(scope: string): scope is OidcScope {
  return (ALL_OIDC_SCOPES as readonly string[]).includes(scope);
}

export function getClaimDefinition(name: string): OidcClaimDefinition | null {
  return CLAIM_DEFINITIONS.find((definition) => definition.name === name) ?? null;
}

export function getClaimRegistryRecord(name: string): ClaimRegistryRecord | null {
  return SEEDED_CLAIM_REGISTRY.find((definition) => definition.name === name) ?? null;
}

export function getClaimsForScopes(scopes: readonly string[]): string[] {
  const uniqueScopes = new Set(scopes.filter(isSupportedScope));

  return CLAIM_DEFINITIONS
    .filter((definition) => definition.scopes.some((scope) => uniqueScopes.has(scope)))
    .map((definition) => definition.name);
}

export function isThresholdPolicySatisfied(
  policy: Pick<IdentityDepthThresholdPolicy, "requiredVerificationClaims" | "requiredStampKeys">,
  input: {
    verificationClaims: readonly string[];
    stampKeys: readonly string[];
  },
): boolean {
  const verificationClaims = new Set(input.verificationClaims);
  const stampKeys = new Set(input.stampKeys);

  return policy.requiredVerificationClaims.every((claim) => verificationClaims.has(claim))
    && policy.requiredStampKeys.every((stampKey) => stampKeys.has(stampKey));
}
