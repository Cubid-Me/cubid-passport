import { createHash } from "node:crypto";

import { base64UrlEncode, generateRandomToken, verifyPkceChallenge, type OidcGrantType, type OidcTokenEndpointAuthMethod } from "@cubid/auth";
import type { OidcScope } from "@cubid/claims";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeJwt } from "jose";

import { getOidcRuntimeConfig } from "./config";
import { verifyOidcSecret } from "./registration";
import { signOidcJwt, verifyOidcJwt } from "./signing";

const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;
const ID_TOKEN_LIFETIME_SECONDS = 15 * 60;

type PersistedClientRow = {
  client_id: string;
  client_name: string;
  client_type: string;
  status: "active" | "suspended" | "revoked";
  token_endpoint_auth_method: OidcTokenEndpointAuthMethod;
  client_secret_hash: string | null;
  grant_types: OidcGrantType[];
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  allowed_scopes: OidcScope[];
  rate_limit_tier: "starter" | "trusted" | "internal";
  metadata: Record<string, unknown>;
};

type PersistedAuthorizationCodeRow = {
  code_id: string;
  authorization_code: string;
  client_id: string;
  session_id: string;
  cubid_user_id: number | null;
  human_subject_key: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  nonce: string | null;
  expires_at: string;
  consumed_at: string | null;
  metadata: {
    consent_id?: unknown;
    consent_version?: unknown;
    pairwise_sub?: unknown;
    request_id?: unknown;
  };
  created_at: string;
};

export function buildSessionAuthenticationClaims(session: PersistedSessionRow): {
  acr?: string;
  amr: string[];
} {
  const amr = Array.isArray(session.authentication_methods) ? session.authentication_methods.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
  const acr = typeof session.metadata?.acr === "string" && session.metadata.acr.trim().length > 0 ? session.metadata.acr : undefined;

  return {
    amr,
    ...(acr ? { acr } : {}),
  };
}

export type PersistedSessionRow = {
  session_id: string;
  client_id: string;
  cubid_user_id: number | null;
  human_subject_key: string | null;
  authentication_methods: string[];
  verified_email: string | null;
  verified_phone: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type PersistedConsentRow = {
  consent_id: string;
  human_subject_key: string;
  client_id: string;
  pairwise_sub: string;
  granted_scopes: string[];
  granted_claims: string[];
  consent_version: number;
  revoked_at: string | null;
};

export type PersistedAccessTokenRow = {
  access_token_jti: string;
  client_id: string;
  session_id: string;
  consent_id: string | null;
  consent_version: number | null;
  human_subject_key: string;
  pairwise_sub: string;
  scope: string;
  audience: string;
  expires_at: string;
  revoked_at: string | null;
};

export type TokenEndpointInput = {
  grantType: string | null;
  code: string | null;
  redirectUri: string | null;
  clientId: string | null;
  codeVerifier: string | null;
  clientSecret: string | null;
  basicClientId: string | null;
  basicClientSecret: string | null;
};

export type RevocationEndpointInput = TokenEndpointInput & {
  token: string | null;
  tokenTypeHint: string | null;
};

export class OidcEndpointError extends Error {
  statusCode: number;
  error: string;
  errorDescription: string;

  constructor(statusCode: number, error: string, errorDescription: string) {
    super(errorDescription);
    this.name = "OidcEndpointError";
    this.statusCode = statusCode;
    this.error = error;
    this.errorDescription = errorDescription;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function expiresAt(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

function isExpired(value: string): boolean {
  return new Date(value).getTime() <= Date.now();
}

function opaqueId(prefix: string): string {
  return `${prefix}_${generateRandomToken(24)}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createAccessTokenHash(token: string): string {
  return base64UrlEncode(createHash("sha256").update(token).digest().subarray(0, 16));
}

function normalizeString(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBasicAuth(request: Request): {
  clientId: string | null;
  clientSecret: string | null;
} {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, credentials] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "basic" || !credentials) {
    return { clientId: null, clientSecret: null };
  }

  const decoded = Buffer.from(credentials, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return { clientId: null, clientSecret: null };
  }

  return {
    clientId: decodeURIComponent(decoded.slice(0, separatorIndex)),
    clientSecret: decodeURIComponent(decoded.slice(separatorIndex + 1)),
  };
}

export async function parseTokenEndpointInput(request: Request): Promise<TokenEndpointInput> {
  const basic = parseBasicAuth(request);
  const form = await request.formData();

  return {
    grantType: normalizeString(form.get("grant_type")),
    code: normalizeString(form.get("code")),
    redirectUri: normalizeString(form.get("redirect_uri")),
    clientId: normalizeString(form.get("client_id")),
    codeVerifier: normalizeString(form.get("code_verifier")),
    clientSecret: normalizeString(form.get("client_secret")),
    basicClientId: basic.clientId,
    basicClientSecret: basic.clientSecret,
  };
}

export async function parseRevocationEndpointInput(request: Request): Promise<RevocationEndpointInput> {
  const basic = parseBasicAuth(request);
  const form = await request.formData();

  return {
    grantType: null,
    code: null,
    redirectUri: null,
    clientId: normalizeString(form.get("client_id")),
    codeVerifier: null,
    clientSecret: normalizeString(form.get("client_secret")),
    basicClientId: basic.clientId,
    basicClientSecret: basic.clientSecret,
    token: normalizeString(form.get("token")),
    tokenTypeHint: normalizeString(form.get("token_type_hint")),
  };
}

async function insertAuditEvent(
  supabase: SupabaseClient,
  input: {
    clientId: string | null;
    sessionId?: string | null;
    eventType: string;
    requestId: string;
    outcome: string;
    actorType: string;
    actorIdentifier: string;
    details: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("oidc_audit_logs").insert({
    log_id: opaqueId("audit"),
    client_id: input.clientId,
    session_id: input.sessionId ?? null,
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

async function tryInsertAuditEvent(supabase: SupabaseClient, input: Parameters<typeof insertAuditEvent>[1]): Promise<void> {
  try {
    await insertAuditEvent(supabase, input);
  } catch (error) {
    process.stderr.write(`Failed to write OIDC audit event: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

async function getClient(supabase: SupabaseClient, clientId: string): Promise<PersistedClientRow | null> {
  const { data, error } = await supabase.from("oidc_clients").select("*").eq("client_id", clientId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC client: ${error.message}`);
  }

  return (data as PersistedClientRow | null) ?? null;
}

async function getAuthorizationCode(supabase: SupabaseClient, code: string): Promise<PersistedAuthorizationCodeRow | null> {
  const { data, error } = await supabase.from("oidc_authorization_codes").select("*").eq("authorization_code", code).maybeSingle();

  if (error) {
    throw new Error(`Failed to load authorization code: ${error.message}`);
  }

  return (data as PersistedAuthorizationCodeRow | null) ?? null;
}

async function getSession(supabase: SupabaseClient, sessionId: string): Promise<PersistedSessionRow | null> {
  const { data, error } = await supabase.from("oidc_sessions").select("*").eq("session_id", sessionId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC session: ${error.message}`);
  }

  return (data as PersistedSessionRow | null) ?? null;
}

async function getConsent(supabase: SupabaseClient, consentId: string): Promise<PersistedConsentRow | null> {
  const { data, error } = await supabase.from("oidc_consents").select("*").eq("consent_id", consentId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC consent: ${error.message}`);
  }

  return (data as PersistedConsentRow | null) ?? null;
}

async function markAuthorizationCodeConsumed(supabase: SupabaseClient, codeId: string): Promise<boolean> {
  const { data, error } = await supabase.from("oidc_authorization_codes").update({ consumed_at: nowIso() }).eq("code_id", codeId).is("consumed_at", null).select("code_id");

  if (error) {
    throw new Error(`Failed to consume authorization code: ${error.message}`);
  }

  return Array.isArray(data) && data.length === 1;
}

function resolveTokenClientId(input: TokenEndpointInput): string {
  const clientId = input.basicClientId ?? input.clientId;

  if (!clientId) {
    throw new OidcEndpointError(400, "invalid_request", "client_id is required.");
  }

  if (input.basicClientId && input.clientId && input.basicClientId !== input.clientId) {
    throw new OidcEndpointError(400, "invalid_request", "client_id does not match HTTP Basic credentials.");
  }

  return clientId;
}

function validateClientAuthentication(client: PersistedClientRow, input: TokenEndpointInput): void {
  if (client.token_endpoint_auth_method === "none") {
    if (input.clientSecret || input.basicClientSecret) {
      throw new OidcEndpointError(401, "invalid_client", "Public clients must not authenticate with a client secret.");
    }

    return;
  }

  const suppliedSecret = input.basicClientSecret ?? input.clientSecret;

  if (!client.client_secret_hash || !suppliedSecret || !verifyOidcSecret(suppliedSecret, client.client_secret_hash)) {
    throw new OidcEndpointError(401, "invalid_client", "Client authentication failed.");
  }
}

function getRequiredConsentMetadata(codeRow: PersistedAuthorizationCodeRow): {
  consentId: string;
  consentVersion: number;
  pairwiseSub: string;
} {
  const consentId = typeof codeRow.metadata.consent_id === "string" ? codeRow.metadata.consent_id : null;
  const consentVersion = typeof codeRow.metadata.consent_version === "number" ? codeRow.metadata.consent_version : null;
  const pairwiseSub = typeof codeRow.metadata.pairwise_sub === "string" ? codeRow.metadata.pairwise_sub : null;

  if (!consentId || consentVersion === null || !pairwiseSub) {
    throw new OidcEndpointError(400, "invalid_grant", "Authorization code is missing consent metadata.");
  }

  return { consentId, consentVersion, pairwiseSub };
}

async function persistAccessToken(
  supabase: SupabaseClient,
  input: {
    accessTokenJti: string;
    clientId: string;
    sessionId: string;
    consentId: string;
    consentVersion: number;
    cubidUserId: number | null;
    humanSubjectKey: string;
    pairwiseSub: string;
    scope: string;
    audience: string;
    expiresAt: string;
  },
): Promise<void> {
  const { error } = await supabase.from("oidc_access_tokens").insert({
    access_token_jti: input.accessTokenJti,
    client_id: input.clientId,
    session_id: input.sessionId,
    consent_id: input.consentId,
    consent_version: input.consentVersion,
    cubid_user_id: input.cubidUserId,
    human_subject_key: input.humanSubjectKey,
    pairwise_sub: input.pairwiseSub,
    scope: input.scope,
    audience: input.audience,
    expires_at: input.expiresAt,
  });

  if (error) {
    throw new Error(`Failed to persist OIDC access token: ${error.message}`);
  }
}

export async function exchangeAuthorizationCode(supabase: SupabaseClient, input: TokenEndpointInput, requestId: string): Promise<Record<string, unknown>> {
  if (input.grantType !== "authorization_code") {
    throw new OidcEndpointError(400, "unsupported_grant_type", "Only authorization_code is implemented in this slice.");
  }

  if (!input.code || !input.redirectUri || !input.codeVerifier) {
    throw new OidcEndpointError(400, "invalid_request", "code, redirect_uri, and code_verifier are required.");
  }

  const clientId = resolveTokenClientId(input);
  const client = await getClient(supabase, clientId);

  if (!client || client.status !== "active") {
    throw new OidcEndpointError(401, "invalid_client", "Client is unknown or inactive.");
  }

  validateClientAuthentication(client, input);

  if (!client.grant_types.includes("authorization_code")) {
    throw new OidcEndpointError(400, "unauthorized_client", "Client is not allowed to use authorization_code.");
  }

  const codeRow = await getAuthorizationCode(supabase, input.code);
  if (!codeRow) {
    await insertAuditEvent(supabase, {
      clientId,
      eventType: "token.exchange_failed",
      requestId,
      outcome: "failure",
      actorType: "client",
      actorIdentifier: clientId,
      details: { reason: "unknown_code" },
    });
    throw new OidcEndpointError(400, "invalid_grant", "Authorization code is invalid.");
  }

  if (codeRow.client_id !== clientId || codeRow.redirect_uri !== input.redirectUri || codeRow.consumed_at || isExpired(codeRow.expires_at)) {
    await insertAuditEvent(supabase, {
      clientId,
      sessionId: codeRow.session_id,
      eventType: "token.exchange_failed",
      requestId,
      outcome: "failure",
      actorType: "client",
      actorIdentifier: clientId,
      details: {
        reason: "invalid_grant",
        code_client_id: codeRow.client_id,
        redirect_uri_match: codeRow.redirect_uri === input.redirectUri,
        already_consumed: Boolean(codeRow.consumed_at),
        expired: isExpired(codeRow.expires_at),
      },
    });
    throw new OidcEndpointError(400, "invalid_grant", "Authorization code is invalid for this client or redirect URI.");
  }

  if (codeRow.code_challenge_method !== "S256" || !verifyPkceChallenge(input.codeVerifier, codeRow.code_challenge)) {
    await insertAuditEvent(supabase, {
      clientId,
      sessionId: codeRow.session_id,
      eventType: "token.exchange_failed",
      requestId,
      outcome: "failure",
      actorType: "client",
      actorIdentifier: clientId,
      details: { reason: "invalid_pkce" },
    });
    throw new OidcEndpointError(400, "invalid_grant", "PKCE verification failed.");
  }

  const session = await getSession(supabase, codeRow.session_id);
  if (!session || session.revoked_at || isExpired(session.expires_at) || !session.human_subject_key) {
    throw new OidcEndpointError(400, "invalid_grant", "Authorization session is no longer active.");
  }

  const consentMetadata = getRequiredConsentMetadata(codeRow);
  const consent = await getConsent(supabase, consentMetadata.consentId);
  if (!consent || consent.revoked_at || consent.client_id !== clientId || consent.human_subject_key !== session.human_subject_key || consent.pairwise_sub !== consentMetadata.pairwiseSub) {
    throw new OidcEndpointError(400, "invalid_grant", "Consent grant is no longer valid.");
  }

  const consumed = await markAuthorizationCodeConsumed(supabase, codeRow.code_id);
  if (!consumed) {
    throw new OidcEndpointError(400, "invalid_grant", "Authorization code has already been consumed.");
  }

  const scope = codeRow.scope;
  const accessTokenJti = opaqueId("at");
  const idTokenJti = opaqueId("id");
  const accessTokenExpiresAt = expiresAt(ACCESS_TOKEN_LIFETIME_SECONDS);
  const authTime = Math.floor(new Date(session.created_at).getTime() / 1000);

  const accessToken = await signOidcJwt(
    {
      typ: "access_token",
      token_use: "userinfo",
      client_id: clientId,
      sid: session.session_id,
      scope,
      consent_id: consent.consent_id,
      consent_version: consent.consent_version,
    },
    {
      audience: `${getOidcRuntimeConfig().issuer}/userinfo`,
      expiresInSeconds: ACCESS_TOKEN_LIFETIME_SECONDS,
      jwtId: accessTokenJti,
      subject: consent.pairwise_sub,
    },
  );

  const idToken = await signOidcJwt(
    {
      ...buildSessionAuthenticationClaims(session),
      auth_time: authTime,
      client_id: clientId,
      nonce: codeRow.nonce ?? undefined,
      sid: session.session_id,
      at_hash: createAccessTokenHash(accessToken),
    },
    {
      audience: clientId,
      expiresInSeconds: ID_TOKEN_LIFETIME_SECONDS,
      jwtId: idTokenJti,
      subject: consent.pairwise_sub,
    },
  );

  await persistAccessToken(supabase, {
    accessTokenJti,
    clientId,
    sessionId: session.session_id,
    consentId: consent.consent_id,
    consentVersion: consent.consent_version,
    cubidUserId: session.cubid_user_id,
    humanSubjectKey: session.human_subject_key,
    pairwiseSub: consent.pairwise_sub,
    scope,
    audience: `${getOidcRuntimeConfig().issuer}/userinfo`,
    expiresAt: accessTokenExpiresAt,
  });

  await insertAuditEvent(supabase, {
    clientId,
    sessionId: session.session_id,
    eventType: "token.issued",
    requestId,
    outcome: "success",
    actorType: "client",
    actorIdentifier: clientId,
    details: {
      access_token_jti: accessTokenJti,
      id_token_jti: idTokenJti,
      scope,
      consent_id: consent.consent_id,
    },
  });

  return {
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    access_token: accessToken,
    id_token: idToken,
    scope,
  };
}

async function getAccessTokenRecord(supabase: SupabaseClient, jti: string): Promise<PersistedAccessTokenRow | null> {
  const { data, error } = await supabase.from("oidc_access_tokens").select("*").eq("access_token_jti", jti).maybeSingle();

  if (error) {
    throw new Error(`Failed to load access token: ${error.message}`);
  }

  return (data as PersistedAccessTokenRow | null) ?? null;
}

function hasScope(scope: string, value: string): boolean {
  return scope.split(/\s+/).includes(value);
}

function hasClaim(consent: PersistedConsentRow, claim: string): boolean {
  return consent.granted_claims.includes(claim);
}

export function buildUserInfo(tokenRecord: PersistedAccessTokenRow, session: PersistedSessionRow, consent: PersistedConsentRow): Record<string, unknown> {
  const response: Record<string, unknown> = {
    sub: tokenRecord.pairwise_sub,
  };

  if (hasScope(tokenRecord.scope, "email") && hasClaim(consent, "email") && session.verified_email) {
    response.email = session.verified_email;
    response.email_verified = true;
  } else if (hasScope(tokenRecord.scope, "email") && hasClaim(consent, "email_verified")) {
    response.email_verified = Boolean(session.verified_email);
  }

  if (hasScope(tokenRecord.scope, "profile")) {
    if (hasClaim(consent, "name") && session.verified_email) {
      response.name = session.verified_email.split("@")[0];
    }

    if (hasClaim(consent, "preferred_username") && session.verified_email) {
      response.preferred_username = session.verified_email.split("@")[0];
    }

    if (hasClaim(consent, "updated_at")) {
      response.updated_at = Math.floor(new Date(session.created_at).getTime() / 1000);
    }
  }

  return response;
}

export async function getUserInfo(supabase: SupabaseClient, accessToken: string | null, requestId: string): Promise<Record<string, unknown>> {
  let failureClientId: string | null = null;
  let failureSessionId: string | null = null;
  let failureJti: string | null = null;

  try {
    if (!accessToken) {
      throw new OidcEndpointError(401, "invalid_token", "A bearer access token is required.");
    }

    const verified = await verifyOidcJwt(accessToken, `${getOidcRuntimeConfig().issuer}/userinfo`);
    const jti = verified.payload.jti;

    if (!jti) {
      throw new OidcEndpointError(401, "invalid_token", "Access token is missing a token id.");
    }

    failureJti = jti;

    const tokenRecord = await getAccessTokenRecord(supabase, jti);
    failureClientId = tokenRecord?.client_id ?? null;
    failureSessionId = tokenRecord?.session_id ?? null;

    if (!tokenRecord || tokenRecord.revoked_at || isExpired(tokenRecord.expires_at)) {
      throw new OidcEndpointError(401, "invalid_token", "Access token is not active.");
    }

    const [client, session, consent] = await Promise.all([
      getClient(supabase, tokenRecord.client_id),
      getSession(supabase, tokenRecord.session_id),
      tokenRecord.consent_id ? getConsent(supabase, tokenRecord.consent_id) : Promise.resolve(null),
    ]);

    if (!client || client.status !== "active") {
      throw new OidcEndpointError(401, "invalid_token", "Client is no longer active.");
    }

    if (!session || session.revoked_at || isExpired(session.expires_at)) {
      throw new OidcEndpointError(401, "invalid_token", "Session is no longer active.");
    }

    if (!consent || consent.revoked_at || consent.pairwise_sub !== tokenRecord.pairwise_sub) {
      throw new OidcEndpointError(401, "invalid_token", "Consent is no longer active.");
    }

    const userinfo = buildUserInfo(tokenRecord, session, consent);

    await insertAuditEvent(supabase, {
      clientId: tokenRecord.client_id,
      sessionId: tokenRecord.session_id,
      eventType: "userinfo.returned",
      requestId,
      outcome: "success",
      actorType: "client",
      actorIdentifier: tokenRecord.client_id,
      details: {
        access_token_jti: jti,
        claims: Object.keys(userinfo),
      },
    });

    return userinfo;
  } catch (error) {
    await tryInsertAuditEvent(supabase, {
      clientId: failureClientId,
      sessionId: failureSessionId,
      eventType: "userinfo.failed",
      requestId,
      outcome: "failure",
      actorType: failureClientId ? "client" : "unknown",
      actorIdentifier: failureClientId ?? "unknown",
      details: {
        access_token_jti: failureJti,
        error: error instanceof OidcEndpointError ? error.error : "server_error",
        error_description: error instanceof Error ? error.message : "Unable to return userinfo.",
      },
    });

    throw error;
  }
}

export async function revokeToken(supabase: SupabaseClient, input: RevocationEndpointInput, requestId: string): Promise<void> {
  const clientId = resolveTokenClientId(input);
  const client = await getClient(supabase, clientId);

  if (!client || client.status !== "active") {
    throw new OidcEndpointError(401, "invalid_client", "Client authentication failed.");
  }

  validateClientAuthentication(client, input);

  const token = input.token;

  if (!token) {
    throw new OidcEndpointError(400, "invalid_request", "token is required.");
  }

  let jti: string | null = null;
  let tokenClientId: string | null = null;
  try {
    const decoded = decodeJwt(token);
    jti = typeof decoded.jti === "string" ? decoded.jti : null;
    tokenClientId = typeof decoded.client_id === "string" ? decoded.client_id : null;
  } catch {
    jti = null;
  }

  if (jti) {
    if (tokenClientId !== clientId) {
      throw new OidcEndpointError(400, "invalid_request", "token was not issued to the authenticated client.");
    }

    const { error } = await supabase.from("oidc_access_tokens").update({ revoked_at: nowIso() }).eq("access_token_jti", jti).eq("client_id", clientId).is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke access token: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("oidc_refresh_tokens").update({ revoked_at: nowIso() }).eq("refresh_token_hash", hashToken(token)).eq("client_id", clientId).is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke refresh token: ${error.message}`);
    }
  }

  await insertAuditEvent(supabase, {
    clientId,
    eventType: "token.revoked",
    requestId,
    outcome: "success",
    actorType: "client",
    actorIdentifier: clientId ?? "unknown",
    details: {
      token_jti: jti,
    },
  });
}

export async function logout(supabase: SupabaseClient, request: Request, requestId: string): Promise<{ redirectTo: string | null }> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const postLogoutRedirectUri = url.searchParams.get("post_logout_redirect_uri");
  const state = url.searchParams.get("state");
  let sid = url.searchParams.get("sid");

  const idTokenHint = url.searchParams.get("id_token_hint");
  if (idTokenHint && !sid) {
    try {
      const decoded = decodeJwt(idTokenHint);
      sid = typeof decoded.sid === "string" ? decoded.sid : null;
    } catch {
      throw new OidcEndpointError(400, "invalid_request", "id_token_hint must be a well-formed JWT.");
    }
  }

  if (sid) {
    const { error } = await supabase.from("oidc_sessions").update({ revoked_at: nowIso() }).eq("session_id", sid).is("revoked_at", null);

    if (error) {
      throw new Error(`Failed to revoke OIDC session: ${error.message}`);
    }
  }

  if (!postLogoutRedirectUri) {
    await insertAuditEvent(supabase, {
      clientId,
      sessionId: sid,
      eventType: "logout.completed",
      requestId,
      outcome: "success",
      actorType: "user",
      actorIdentifier: sid ?? "unknown",
      details: { redirected: false },
    });
    return { redirectTo: null };
  }

  if (!clientId) {
    throw new OidcEndpointError(400, "invalid_request", "client_id is required when post_logout_redirect_uri is supplied.");
  }

  const client = await getClient(supabase, clientId);
  if (!client || !client.post_logout_redirect_uris.includes(postLogoutRedirectUri)) {
    throw new OidcEndpointError(400, "invalid_request", "post_logout_redirect_uri must exactly match a registered URI.");
  }

  const redirect = new URL(postLogoutRedirectUri);
  if (state) {
    redirect.searchParams.set("state", state);
  }

  await insertAuditEvent(supabase, {
    clientId,
    sessionId: sid,
    eventType: "logout.completed",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: sid ?? "unknown",
    details: { redirected: true },
  });

  return { redirectTo: redirect.toString() };
}
