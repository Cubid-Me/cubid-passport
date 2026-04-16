import { getRequiredEnv } from "@cubid/config";

export interface OidcRuntimeConfig {
  issuer: string;
  publicOrigin: string;
  port: number;
  pairwiseSubjectMasterSecret: string;
  passportLoginUrl: string;
  passportConsentUrl: string;
  passkeyRpId: string;
  passkeyExpectedOrigins: string[];
  passkeyRpName: string;
  jwks: { keys: unknown[] };
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

let cachedConfig: OidcRuntimeConfig | null = null;

function getOptionalEnv(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
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

function splitCsv(rawValue: string | null): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
  const publicOrigin = getOptionalEnv(env, "OIDC_PUBLIC_ORIGIN") ?? issuer;
  const port = Number(getOptionalEnv(env, "OIDC_PORT") ?? "4280");

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("OIDC_PORT must be a positive number.");
  }

  const passportLoginUrl = getOptionalEnv(env, "PASSPORT_LOGIN_URL") ?? "http://localhost:3000/login";
  const passportConsentUrl = getOptionalEnv(env, "PASSPORT_CONSENT_URL") ?? "http://localhost:3000/allow";
  const passportPublicOrigin = getOptionalEnv(env, "PASSPORT_PUBLIC_ORIGIN") ?? new URL(passportLoginUrl).origin;
  const passkeyExpectedOrigins = splitCsv(getOptionalEnv(env, "OIDC_PASSKEY_EXPECTED_ORIGINS"));

  return {
    issuer,
    publicOrigin,
    port,
    pairwiseSubjectMasterSecret: getRequiredEnvFrom(env, "OIDC_PAIRWISE_SUBJECT_MASTER_SECRET"),
    passportLoginUrl,
    passportConsentUrl,
    passkeyRpId: getOptionalEnv(env, "OIDC_PASSKEY_RP_ID") ?? new URL(passportPublicOrigin).hostname,
    passkeyExpectedOrigins: passkeyExpectedOrigins.length > 0 ? passkeyExpectedOrigins : [passportPublicOrigin],
    passkeyRpName: getOptionalEnv(env, "OIDC_PASSKEY_RP_NAME") ?? "Cubid Passport",
    jwks: parseJwks(getOptionalEnv(env, "OIDC_JWKS_JSON")),
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