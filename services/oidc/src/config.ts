import {
  parseCsvValue,
} from "@cubid/config";

export interface OidcRuntimeConfig {
  corsAllowedOrigins: string[];
  issuer: string;
  publicOrigin: string;
  port: number;
  pairwiseSubjectMasterSecret: string;
  passportLoginUrl: string;
  passportConsentUrl: string;
  passkeyRpId: string;
  passkeyExpectedOrigins: string[];
  passkeyRpName: string;
  firebaseProjectId: string | null;
  firebaseJwksUrl: string;
  signingPrivateJwk: Record<string, unknown> | null;
  activeSigningKid: string | null;
  jwks: { keys: unknown[] };
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

let cachedConfig: OidcRuntimeConfig | null = null;

function getOptionalEnvFrom(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function getOptionalNumericEnvFrom(
  env: NodeJS.ProcessEnv,
  name: string
): number | null {
  const value = getOptionalEnvFrom(env, name);

  if (value === null) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsedValue;
}

function parseJwks(rawValue: string | null): { keys: unknown[] } {
  if (!rawValue) {
    return { keys: [] };
  }

  const parsed = JSON.parse(rawValue) as { keys?: unknown[] };
  return {
    keys: Array.isArray(parsed.keys) ? parsed.keys : [],
  };
}

function parseJsonObject(rawValue: string | null, envName: string): Record<string, unknown> | null {
  if (!rawValue) {
    return null;
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${envName} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function getRequiredEnvFrom(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

export function buildOidcRuntimeConfig(env: NodeJS.ProcessEnv): OidcRuntimeConfig {
  const issuer = getRequiredEnvFrom(env, "OIDC_ISSUER_URL");
  const publicOrigin = getOptionalEnvFrom(env, "OIDC_PUBLIC_ORIGIN") ?? issuer;
  const port = getOptionalNumericEnvFrom(env, "OIDC_PORT") ?? 4280;

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("OIDC_PORT must be a positive number.");
  }

  const passportLoginUrl = getOptionalEnvFrom(env, "PASSPORT_LOGIN_URL") ?? "http://localhost:3000/login";
  const passportConsentUrl = getOptionalEnvFrom(env, "PASSPORT_CONSENT_URL") ?? "http://localhost:3000/allow";
  const passportPublicOrigin = getOptionalEnvFrom(env, "PASSPORT_PUBLIC_ORIGIN") ?? new URL(passportLoginUrl).origin;
  const passkeyExpectedOrigins = parseCsvValue(getOptionalEnvFrom(env, "OIDC_PASSKEY_EXPECTED_ORIGINS"));

  return {
    corsAllowedOrigins: parseCsvValue(getOptionalEnvFrom(env, "OIDC_CORS_ALLOWED_ORIGINS")),
    issuer,
    publicOrigin,
    port,
    pairwiseSubjectMasterSecret: getRequiredEnvFrom(env, "OIDC_PAIRWISE_SUBJECT_MASTER_SECRET"),
    passportLoginUrl,
    passportConsentUrl,
    passkeyRpId: getOptionalEnvFrom(env, "OIDC_PASSKEY_RP_ID") ?? new URL(passportPublicOrigin).hostname,
    passkeyExpectedOrigins: passkeyExpectedOrigins.length > 0 ? passkeyExpectedOrigins : [passportPublicOrigin],
    passkeyRpName: getOptionalEnvFrom(env, "OIDC_PASSKEY_RP_NAME") ?? "Cubid Passport",
    firebaseProjectId: getOptionalEnvFrom(env, "OIDC_FIREBASE_PROJECT_ID") ?? getOptionalEnvFrom(env, "FIREBASE_PROJECT_ID"),
    firebaseJwksUrl: getOptionalEnvFrom(env, "OIDC_FIREBASE_JWKS_URL") ?? "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    signingPrivateJwk: parseJsonObject(getOptionalEnvFrom(env, "OIDC_SIGNING_PRIVATE_JWK_JSON"), "OIDC_SIGNING_PRIVATE_JWK_JSON"),
    activeSigningKid: getOptionalEnvFrom(env, "OIDC_ACTIVE_SIGNING_KID"),
    jwks: parseJwks(getOptionalEnvFrom(env, "OIDC_JWKS_JSON")),
    supabaseUrl: getRequiredEnvFrom(env, "SUPABASE_URL"),
    supabaseServiceRoleKey: getRequiredEnvFrom(env, "SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getOidcRuntimeConfig(): OidcRuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = buildOidcRuntimeConfig(process.env);

  return cachedConfig;
}
