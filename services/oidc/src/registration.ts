import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import {
  OIDC_GRANT_TYPES,
  OIDC_TOKEN_ENDPOINT_AUTH_METHODS,
  type OidcGrantType,
  type OidcTokenEndpointAuthMethod,
} from "@cubid/auth";
import { ALL_OIDC_SCOPES, isSupportedScope, type OidcScope } from "@cubid/claims";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getOidcRuntimeConfig } from "./config";

export type CubidClientType =
  | "public_web"
  | "confidential_web"
  | "native"
  | "device"
  | "backend_service";

export interface CubidClientRecord {
  clientId: string;
  clientName: string;
  clientType: CubidClientType;
  status: "active" | "suspended" | "revoked";
  verificationStatus: "unverified" | "verified_domain" | "internal";
  tokenEndpointAuthMethod: OidcTokenEndpointAuthMethod;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  grantTypes: OidcGrantType[];
  defaultScopes: OidcScope[];
  allowedScopes: OidcScope[];
  rateLimitTier: "starter" | "trusted" | "internal";
  ownerAccountId: string | null;
  registrationClientUri: string;
  secretVersion: number | null;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
}

export interface DynamicClientRegistrationRequest {
  client_name?: unknown;
  client_type?: unknown;
  redirect_uris?: unknown;
  post_logout_redirect_uris?: unknown;
  grant_types?: unknown;
  default_scopes?: unknown;
  allowed_scopes?: unknown;
  token_endpoint_auth_method?: unknown;
  contacts?: unknown;
  logo_uri?: unknown;
  policy_uri?: unknown;
  tos_uri?: unknown;
}

export interface DynamicClientRegistrationResponse {
  client_id: string;
  client_name: string;
  client_type: CubidClientType;
  client_secret?: string;
  client_secret_expires_at?: number;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  grant_types: OidcGrantType[];
  default_scopes: OidcScope[];
  allowed_scopes: OidcScope[];
  token_endpoint_auth_method: OidcTokenEndpointAuthMethod;
  rate_limit_tier: CubidClientRecord["rateLimitTier"];
  verification_status: CubidClientRecord["verificationStatus"];
  status: CubidClientRecord["status"];
  registration_client_uri: string;
  registration_access_token: string;
  issuer_metadata: {
    issuer: string;
    discovery_uri: string;
    jwks_uri: string;
    registration_endpoint: string;
  };
}

const CLIENT_TYPES: readonly CubidClientType[] = [
  "public_web",
  "confidential_web",
  "native",
  "device",
  "backend_service",
] as const;

const PUBLIC_CLIENT_TYPES = new Set<CubidClientType>(["public_web", "native", "device"]);

type PersistedClientRow = {
  client_id: string;
  client_name: string;
  client_type: CubidClientType;
  status: CubidClientRecord["status"];
  verification_status: CubidClientRecord["verificationStatus"];
  token_endpoint_auth_method: OidcTokenEndpointAuthMethod;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  grant_types: OidcGrantType[];
  default_scopes: OidcScope[];
  allowed_scopes: OidcScope[];
  rate_limit_tier: CubidClientRecord["rateLimitTier"];
  owner_account_id: string | null;
  registration_client_uri: string;
  registration_access_token_hash: string;
  client_secret_hash: string | null;
  secret_version: number | null;
  created_at: string;
  updated_at: string;
  suspended_at: string | null;
  metadata: Record<string, unknown>;
};

function generateOpaqueToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export function hashOidcSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyOidcSecret(secret: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(secret, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expectedBuffer);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isHttpsOrLocalhost(url: URL): boolean {
  return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
}

function validateRedirectUri(clientType: CubidClientType, value: string): string {
  const parsed = new URL(value);

  if (clientType === "native") {
    const isLoopback = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    const isHttps = parsed.protocol === "https:";
    const isCustomScheme = !["http:", "https:"].includes(parsed.protocol);

    if (!isLoopback && !isHttps && !isCustomScheme) {
      throw new Error("Native clients must use loopback, HTTPS app links, or a custom URI scheme.");
    }
  } else if (!isHttpsOrLocalhost(parsed)) {
    throw new Error("Redirect URIs must use HTTPS or localhost HTTP for development.");
  }

  if (parsed.hash) {
    throw new Error("Redirect URIs cannot contain fragments.");
  }

  return parsed.toString();
}

function normalizeRedirectUris(clientType: CubidClientType, value: unknown): string[] {
  const uris = parseStringArray(value).map((entry) => validateRedirectUri(clientType, entry));

  if (["public_web", "confidential_web", "native"].includes(clientType) && uris.length === 0) {
    throw new Error("This client type requires at least one redirect URI.");
  }

  if (["device", "backend_service"].includes(clientType) && uris.length > 0) {
    throw new Error("This client type cannot register redirect URIs.");
  }

  return [...new Set(uris)];
}

function normalizeScopes(value: unknown, fallback: OidcScope[] = []): OidcScope[] {
  const scopes = parseStringArray(value).filter(isSupportedScope) as OidcScope[];
  return [...new Set(scopes.length > 0 ? scopes : fallback)];
}

function defaultGrantTypesForClientType(clientType: CubidClientType): OidcGrantType[] {
  switch (clientType) {
    case "public_web":
      return ["authorization_code"];
    case "confidential_web":
      return ["authorization_code", "refresh_token"];
    case "native":
      return ["authorization_code", "refresh_token"];
    case "device":
      return ["urn:ietf:params:oauth:grant-type:device_code"];
    case "backend_service":
      return ["client_credentials"];
  }
}

function normalizeGrantTypes(clientType: CubidClientType, value: unknown): OidcGrantType[] {
  const fallback = defaultGrantTypesForClientType(clientType);
  const grantTypes = parseStringArray(value)
    .filter((entry): entry is OidcGrantType => (OIDC_GRANT_TYPES as readonly string[]).includes(entry)) as OidcGrantType[];
  const nextGrantTypes = [...new Set(grantTypes.length > 0 ? grantTypes : fallback)];

  if (clientType === "backend_service" && nextGrantTypes.some((entry) => entry !== "client_credentials")) {
    throw new Error("Backend service clients may only use client_credentials.");
  }

  if (clientType === "device" && nextGrantTypes.some((entry) => entry !== "urn:ietf:params:oauth:grant-type:device_code")) {
    throw new Error("Device clients may only use the device authorization grant.");
  }

  if (clientType === "public_web" && nextGrantTypes.includes("refresh_token")) {
    throw new Error("Public web clients cannot receive refresh tokens in v1.");
  }

  if (!["device", "backend_service"].includes(clientType) && !nextGrantTypes.includes("authorization_code")) {
    throw new Error("End-user client types must support authorization_code.");
  }

  return nextGrantTypes;
}

function normalizeAuthMethod(clientType: CubidClientType, value: unknown): OidcTokenEndpointAuthMethod {
  const fallback: OidcTokenEndpointAuthMethod = PUBLIC_CLIENT_TYPES.has(clientType) ? "none" : "client_secret_basic";
  const nextValue = typeof value === "string" && (OIDC_TOKEN_ENDPOINT_AUTH_METHODS as readonly string[]).includes(value)
    ? (value as OidcTokenEndpointAuthMethod)
    : fallback;

  if (nextValue === "private_key_jwt") {
    throw new Error("private_key_jwt client authentication is not implemented yet.");
  }

  if (PUBLIC_CLIENT_TYPES.has(clientType) && nextValue !== "none") {
    throw new Error("Public clients must not use a client secret authentication method.");
  }

  if (!PUBLIC_CLIENT_TYPES.has(clientType) && nextValue === "none") {
    throw new Error("Confidential and backend clients must use a token endpoint authentication method.");
  }

  return nextValue;
}

function parseClientType(value: unknown): CubidClientType {
  if (typeof value !== "string" || !CLIENT_TYPES.includes(value as CubidClientType)) {
    throw new Error("client_type must be one of the supported OIDC client types.");
  }

  return value as CubidClientType;
}

function mapRowToClientRecord(row: PersistedClientRow): CubidClientRecord {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    clientType: row.client_type,
    status: row.status,
    verificationStatus: row.verification_status,
    tokenEndpointAuthMethod: row.token_endpoint_auth_method,
    redirectUris: row.redirect_uris ?? [],
    postLogoutRedirectUris: row.post_logout_redirect_uris ?? [],
    grantTypes: row.grant_types ?? [],
    defaultScopes: row.default_scopes ?? [],
    allowedScopes: row.allowed_scopes ?? [],
    rateLimitTier: row.rate_limit_tier,
    ownerAccountId: row.owner_account_id,
    registrationClientUri: row.registration_client_uri,
    secretVersion: row.secret_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    suspendedAt: row.suspended_at,
  };
}

async function insertAuditEvent(
  supabase: SupabaseClient,
  input: {
    clientId: string;
    eventType: string;
    requestId: string;
    outcome: string;
    actorType: string;
    actorIdentifier: string;
    details: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("oidc_audit_logs").insert({
    log_id: generateOpaqueToken("audit"),
    client_id: input.clientId,
    event_type: input.eventType,
    request_id: input.requestId,
    outcome: input.outcome,
    actor_type: input.actorType,
    actor_identifier: input.actorIdentifier,
    details: input.details,
  });

  if (error) {
    throw new Error(`Failed to insert OIDC audit log: ${error.message}`);
  }
}

export async function createDynamicClientRegistration(
  supabase: SupabaseClient,
  requestBody: DynamicClientRegistrationRequest,
  requestId: string,
): Promise<DynamicClientRegistrationResponse> {
  const clientName = typeof requestBody.client_name === "string" ? requestBody.client_name.trim() : "";
  if (!clientName) {
    throw new Error("client_name is required.");
  }

  const clientType = parseClientType(requestBody.client_type);
  const redirectUris = normalizeRedirectUris(clientType, requestBody.redirect_uris);
  const postLogoutRedirectUris = normalizeRedirectUris(clientType, requestBody.post_logout_redirect_uris);
  const grantTypes = normalizeGrantTypes(clientType, requestBody.grant_types);

  const defaultScopeFallback: OidcScope[] = clientType === "backend_service" ? [] : ["openid", "profile", "email"];
  const defaultScopes = normalizeScopes(requestBody.default_scopes, defaultScopeFallback);
  const allowedScopes = normalizeScopes(requestBody.allowed_scopes, defaultScopes);

  if (clientType === "backend_service" && defaultScopes.includes("openid")) {
    throw new Error("Backend service clients cannot request openid scopes through client_credentials.");
  }

  const tokenEndpointAuthMethod = normalizeAuthMethod(clientType, requestBody.token_endpoint_auth_method);
  const clientId = generateOpaqueToken("cubid");
  const registrationAccessToken = generateOpaqueToken("reg");
  const clientSecret = PUBLIC_CLIENT_TYPES.has(clientType) ? null : generateOpaqueToken("secret");

  const config = getOidcRuntimeConfig();
  const registrationClientUri = `${config.publicOrigin}/register/${clientId}`;
  const now = new Date().toISOString();

  const row = {
    client_id: clientId,
    client_name: clientName,
    client_type: clientType,
    status: "active",
    verification_status: "unverified",
    token_endpoint_auth_method: tokenEndpointAuthMethod,
    redirect_uris: redirectUris,
    post_logout_redirect_uris: postLogoutRedirectUris,
    grant_types: grantTypes,
    default_scopes: defaultScopes,
    allowed_scopes: allowedScopes,
    rate_limit_tier: "starter",
    owner_account_id: null,
    registration_client_uri: registrationClientUri,
    registration_access_token_hash: hashOidcSecret(registrationAccessToken),
    client_secret_hash: clientSecret ? hashOidcSecret(clientSecret) : null,
    secret_version: clientSecret ? 1 : null,
    metadata: {
      contacts: parseStringArray(requestBody.contacts),
      logo_uri: typeof requestBody.logo_uri === "string" ? requestBody.logo_uri.trim() : null,
      policy_uri: typeof requestBody.policy_uri === "string" ? requestBody.policy_uri.trim() : null,
      tos_uri: typeof requestBody.tos_uri === "string" ? requestBody.tos_uri.trim() : null,
    },
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("oidc_clients").insert(row).select("*").single();
  if (error) {
    throw new Error(`Failed to create OIDC client: ${error.message}`);
  }

  await insertAuditEvent(supabase, {
    clientId,
    eventType: "client.registered",
    requestId,
    outcome: "success",
    actorType: "anonymous",
    actorIdentifier: "dynamic-registration",
    details: {
      client_type: clientType,
      grant_types: grantTypes,
      default_scopes: defaultScopes,
    },
  });

  const client = mapRowToClientRecord(data as PersistedClientRow);

  return {
    client_id: client.clientId,
    client_name: client.clientName,
    client_type: client.clientType,
    client_secret: clientSecret ?? undefined,
    client_secret_expires_at: clientSecret ? 0 : undefined,
    redirect_uris: client.redirectUris,
    post_logout_redirect_uris: client.postLogoutRedirectUris,
    grant_types: client.grantTypes,
    default_scopes: client.defaultScopes,
    allowed_scopes: client.allowedScopes,
    token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    rate_limit_tier: client.rateLimitTier,
    verification_status: client.verificationStatus,
    status: client.status,
    registration_client_uri: client.registrationClientUri,
    registration_access_token: registrationAccessToken,
    issuer_metadata: {
      issuer: config.issuer,
      discovery_uri: `${config.publicOrigin}/.well-known/openid-configuration`,
      jwks_uri: `${config.publicOrigin}/jwks`,
      registration_endpoint: `${config.publicOrigin}/register`,
    },
  };
}

export async function getRegisteredClient(
  supabase: SupabaseClient,
  clientId: string,
  registrationAccessToken: string,
): Promise<CubidClientRecord | null> {
  const { data, error } = await supabase
    .from("oidc_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC client: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as PersistedClientRow;
  if (!verifyOidcSecret(registrationAccessToken, row.registration_access_token_hash)) {
    return null;
  }

  return mapRowToClientRecord(row);
}
