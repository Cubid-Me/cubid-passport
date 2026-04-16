import { getRequiredEnv } from "@cubid/config";

export interface OidcRuntimeConfig {
  issuer: string;
  publicOrigin: string;
  port: number;
  pairwiseSubjectMasterSecret: string;
  passportLoginUrl: string;
  passportConsentUrl: string;
  jwks: { keys: unknown[] };
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

let cachedConfig: OidcRuntimeConfig | null = null;

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
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

export function getOidcRuntimeConfig(): OidcRuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const issuer = getRequiredEnv("OIDC_ISSUER_URL");
  const publicOrigin = getOptionalEnv("OIDC_PUBLIC_ORIGIN") ?? issuer;
  const port = Number(getOptionalEnv("OIDC_PORT") ?? "4280");

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("OIDC_PORT must be a positive number.");
  }

  cachedConfig = {
    issuer,
    publicOrigin,
    port,
    pairwiseSubjectMasterSecret: getRequiredEnv("OIDC_PAIRWISE_SUBJECT_MASTER_SECRET"),
    passportLoginUrl: getOptionalEnv("PASSPORT_LOGIN_URL") ?? "http://localhost:3000/login",
    passportConsentUrl: getOptionalEnv("PASSPORT_CONSENT_URL") ?? "http://localhost:3000/allow",
    jwks: parseJwks(getOptionalEnv("OIDC_JWKS_JSON")),
    supabaseUrl: getRequiredEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };

  return cachedConfig;
}