import { createHash, createHmac, randomBytes } from "node:crypto";

const DERIVATION_CONTEXT = "cubid-sub:v1";

export type ConsentClassification = "identity" | "hashed" | "boolean" | "score" | "json";

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

export function computeConsentFingerprint(grantedScopes: readonly string[], grantedClaims: readonly string[]): string {
  const normalizedScopes = [...new Set(grantedScopes)].sort().join(" ");
  const normalizedClaims = [...new Set(grantedClaims)].sort().join(" ");
  const payload = `${normalizedScopes}|${normalizedClaims}`;

  return base64UrlEncode(createHash("sha256").update(payload).digest());
}