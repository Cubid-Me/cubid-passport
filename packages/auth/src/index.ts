import { createHash, randomBytes } from "node:crypto";

export const OIDC_GRANT_TYPES = [
  "authorization_code",
  "refresh_token",
  "urn:ietf:params:oauth:grant-type:device_code",
  "client_credentials",
] as const;

export const OIDC_CODE_CHALLENGE_METHODS = ["S256"] as const;

export const OIDC_TOKEN_ENDPOINT_AUTH_METHODS = [
  "none",
  "client_secret_basic",
  "client_secret_post",
  "private_key_jwt",
] as const;

export const CUBID_AUTHENTICATION_METHODS = [
  "email_ownid",
  "email_otp",
  "phone_otp",
  "firebase_phone",
  "passkey",
] as const;

export const CUBID_WEBAUTHN_CHALLENGE_TYPES = [
  "registration",
  "authentication",
] as const;

export const CUBID_WEBAUTHN_AUTHENTICATOR_ATTACHMENTS = [
  "platform",
  "cross-platform",
] as const;

export const CUBID_WEBAUTHN_ATTESTATION_PREFERENCES = [
  "none",
  "indirect",
  "direct",
  "enterprise",
] as const;

export const CUBID_WEBAUTHN_USER_VERIFICATION_REQUIREMENTS = [
  "required",
  "preferred",
  "discouraged",
] as const;

export const CUBID_WEBAUTHN_RESIDENT_KEY_REQUIREMENTS = [
  "required",
  "preferred",
  "discouraged",
] as const;

export type OidcGrantType = typeof OIDC_GRANT_TYPES[number];
export type OidcCodeChallengeMethod = typeof OIDC_CODE_CHALLENGE_METHODS[number];
export type OidcTokenEndpointAuthMethod = typeof OIDC_TOKEN_ENDPOINT_AUTH_METHODS[number];
export type CubidAuthenticationMethod = typeof CUBID_AUTHENTICATION_METHODS[number];
export type CubidWebAuthnChallengeType = typeof CUBID_WEBAUTHN_CHALLENGE_TYPES[number];
export type CubidWebAuthnAuthenticatorAttachment = typeof CUBID_WEBAUTHN_AUTHENTICATOR_ATTACHMENTS[number];
export type CubidWebAuthnAttestationPreference = typeof CUBID_WEBAUTHN_ATTESTATION_PREFERENCES[number];
export type CubidWebAuthnUserVerificationRequirement = typeof CUBID_WEBAUTHN_USER_VERIFICATION_REQUIREMENTS[number];
export type CubidWebAuthnResidentKeyRequirement = typeof CUBID_WEBAUTHN_RESIDENT_KEY_REQUIREMENTS[number];

export type OidcChallengeType = "login" | "consent";

export interface CubidWebAuthnUserHandlePayload {
  humanSubjectKey: string;
  cubidUserId: number | null;
}

export interface CubidWebAuthnCredentialRecord {
  credentialId: string;
  userHandle: string;
  humanSubjectKey: string;
  cubidUserId: number | null;
  credentialLabel: string | null;
  transports: readonly string[];
  authenticatorAttachment: CubidWebAuthnAuthenticatorAttachment | null;
  aaguid: string | null;
  attestationFormat: string | null;
  attestationType: string | null;
  backupEligible: boolean;
  backupState: boolean;
  signCount: number;
  createdAt: string;
  updatedAt: string;
  lastAuthenticatedAt: string | null;
  revokedAt: string | null;
  metadata: Readonly<Record<string, unknown>>;
}

export interface CubidWebAuthnChallengeRecord {
  challengeId: string;
  challengeType: CubidWebAuthnChallengeType;
  challenge: string;
  loginChallengeId: string | null;
  sessionId: string | null;
  cubidUserId: number | null;
  humanSubjectKey: string | null;
  userHandle: string | null;
  rpId: string;
  userVerification: CubidWebAuthnUserVerificationRequirement;
  expiresAt: string;
  createdAt: string;
  metadata: Readonly<Record<string, unknown>>;
}

export interface CubidWebAuthnCredentialDescriptor {
  id: string;
  transports: readonly string[];
}

export interface CubidWebAuthnRegistrationChallenge extends CubidWebAuthnChallengeRecord {
  challengeType: "registration";
  rpName: string;
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  excludeCredentials: readonly CubidWebAuthnCredentialDescriptor[];
  authenticatorAttachment: CubidWebAuthnAuthenticatorAttachment | null;
  residentKey: CubidWebAuthnResidentKeyRequirement;
  attestation: CubidWebAuthnAttestationPreference;
}

export interface CubidWebAuthnAuthenticationChallenge extends CubidWebAuthnChallengeRecord {
  challengeType: "authentication";
  allowCredentials: readonly CubidWebAuthnCredentialDescriptor[];
}

export interface CubidWebAuthnCredentialResponseEnvelope {
  id: string;
  rawId: string;
  type: "public-key";
  authenticatorAttachment?: string | null;
  clientExtensionResults?: Record<string, unknown>;
  response: Record<string, unknown>;
}

export interface CompleteCubidWebAuthnRegistrationInput {
  challengeId: string;
  loginChallengeId: string | null;
  sessionId: string | null;
  credentialLabel?: string | null;
  credential: CubidWebAuthnCredentialResponseEnvelope;
}

export interface CompleteCubidWebAuthnAuthenticationInput {
  challengeId: string;
  loginChallengeId: string | null;
  credential: CubidWebAuthnCredentialResponseEnvelope;
}

export interface OidcAuthorizationRequestContext {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string | null;
  nonce: string | null;
  codeChallenge: string;
  codeChallengeMethod: OidcCodeChallengeMethod;
  loginHint: string | null;
  prompt: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface OidcLoginChallenge {
  challengeId: string;
  type: "login";
  authorizationRequest: OidcAuthorizationRequestContext;
  passportReturnUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface OidcConsentChallenge {
  challengeId: string;
  type: "consent";
  authorizationRequest: OidcAuthorizationRequestContext;
  sessionId: string;
  cubidUserId: number | null;
  humanSubjectKey: string | null;
  requestedClaims: string[];
  createdAt: string;
  expiresAt: string;
}

export interface CubidSessionEnvelope {
  sessionId: string;
  actorType: "human";
  cubidUserId: number | null;
  humanSubjectKey: string | null;
  verifiedEmail: string | null;
  verifiedPhone: string | null;
  webAuthnCredentialId?: string | null;
  authenticationMethods: string[];
  createdAt: string;
  expiresAt: string;
}

export interface OidcErrorEnvelope {
  error: string;
  error_description: string;
  statusCode: number;
}

export function base64UrlEncode(input: Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Uint8Array.from(Buffer.from(`${normalized}${padding}`, "base64"));
}

export function generateRandomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export function createCubidWebAuthnUserHandle(payload: CubidWebAuthnUserHandlePayload): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
}

export function parseCubidWebAuthnUserHandle(userHandle: string): CubidWebAuthnUserHandlePayload {
  let decodedValue: unknown;

  try {
    decodedValue = JSON.parse(Buffer.from(base64UrlDecode(userHandle)).toString("utf8"));
  } catch {
    throw new Error("Invalid Cubid WebAuthn user handle.");
  }

  if (
    typeof decodedValue !== "object" ||
    decodedValue === null ||
    typeof (decodedValue as { humanSubjectKey?: unknown }).humanSubjectKey !== "string" ||
    !(typeof (decodedValue as { cubidUserId?: unknown }).cubidUserId === "number"
      || (decodedValue as { cubidUserId?: unknown }).cubidUserId === null)
  ) {
    throw new Error("Invalid Cubid WebAuthn user handle.");
  }

  return {
    humanSubjectKey: (decodedValue as { humanSubjectKey: string }).humanSubjectKey,
    cubidUserId: (decodedValue as { cubidUserId: number | null }).cubidUserId,
  };
}

export function generatePkceVerifier(length = 96): string {
  let verifier = "";

  while (verifier.length < length) {
    verifier += generateRandomToken(32);
  }

  return verifier.slice(0, length);
}

export function derivePkceChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

export function verifyPkceChallenge(verifier: string, challenge: string): boolean {
  return derivePkceChallenge(verifier) === challenge;
}