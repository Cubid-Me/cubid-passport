export const STANDARD_OIDC_SCOPES = ["openid", "profile", "email"] as const;
export const CUBID_SCOPES = ["cubid:score", "cubid:stamps", "cubid:claims", "cubid:verification"] as const;

export const ALL_OIDC_SCOPES = [...STANDARD_OIDC_SCOPES, ...CUBID_SCOPES] as const;

export type OidcScope = typeof ALL_OIDC_SCOPES[number];
export type CubidClaimClassification = "identity" | "hashed" | "boolean" | "score" | "json";

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
] as const;

export function isSupportedScope(scope: string): scope is OidcScope {
  return (ALL_OIDC_SCOPES as readonly string[]).includes(scope);
}

export function getClaimDefinition(name: string): OidcClaimDefinition | null {
  return CLAIM_DEFINITIONS.find((definition) => definition.name === name) ?? null;
}

export function getClaimsForScopes(scopes: readonly string[]): string[] {
  const uniqueScopes = new Set(scopes.filter(isSupportedScope));

  return CLAIM_DEFINITIONS
    .filter((definition) => definition.scopes.some((scope) => uniqueScopes.has(scope)))
    .map((definition) => definition.name);
}