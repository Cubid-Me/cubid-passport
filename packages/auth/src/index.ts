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

export type OidcGrantType = typeof OIDC_GRANT_TYPES[number];
export type OidcCodeChallengeMethod = typeof OIDC_CODE_CHALLENGE_METHODS[number];
export type OidcTokenEndpointAuthMethod = typeof OIDC_TOKEN_ENDPOINT_AUTH_METHODS[number];

export type OidcChallengeType = "login" | "consent";

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

export function generateRandomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
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