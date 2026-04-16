import {
  generateRandomToken,
  type OidcAuthorizationRequestContext,
  type OidcConsentChallenge,
  type OidcLoginChallenge,
  type OidcTokenEndpointAuthMethod,
} from "@cubid/auth";
import {
  getClaimDefinition,
  getClaimsForScopes,
  isSupportedScope,
  type OidcScope,
} from "@cubid/claims";
import {
  computeConsentFingerprint,
  createHumanSubjectKey,
  derivePairwiseSubject,
} from "@cubid/identity";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getOidcRuntimeConfig } from "./config";
import type { CubidClientRecord, CubidClientType } from "./registration";

const LOGIN_CHALLENGE_LIFETIME_MS = 10 * 60 * 1000;
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;
const AUTHORIZATION_CODE_LIFETIME_MS = 5 * 60 * 1000;
const SUPPORTED_PROMPTS = new Set(["none", "login", "consent", "select_account"]);

type AuthorizationRequestStatus = "pending_login" | "pending_consent" | "approved" | "denied" | "expired";

type PersistedClientRow = {
  client_id: string;
  client_name: string;
  client_type: CubidClientType;
  status: CubidClientRecord["status"];
  verification_status: CubidClientRecord["verificationStatus"];
  token_endpoint_auth_method: OidcTokenEndpointAuthMethod;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  grant_types: string[];
  default_scopes: OidcScope[];
  allowed_scopes: OidcScope[];
  rate_limit_tier: CubidClientRecord["rateLimitTier"];
  owner_account_id: string | null;
  registration_client_uri: string;
  secret_version: number | null;
  created_at: string;
  updated_at: string;
  suspended_at: string | null;
  metadata: Record<string, unknown>;
};

type PersistedAuthorizationRequestRow = {
  request_id: string;
  login_challenge_id: string;
  consent_challenge_id: string | null;
  client_id: string;
  session_id: string | null;
  status: AuthorizationRequestStatus;
  response_type: string;
  redirect_uri: string;
  scope: string;
  requested_claims: string[];
  state: string | null;
  nonce: string | null;
  code_challenge: string;
  code_challenge_method: string;
  login_hint: string | null;
  prompt: string | null;
  expires_at: string;
  authenticated_at: string | null;
  approved_at: string | null;
  denied_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PersistedSessionRow = {
  session_id: string;
  client_id: string;
  cubid_user_id: number | null;
  human_subject_key: string | null;
  login_challenge_id: string | null;
  consent_challenge_id: string | null;
  authentication_methods: string[];
  verified_email: string | null;
  verified_phone: string | null;
  expires_at: string;
  revoked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PersistedConsentRow = {
  consent_id: string;
  human_subject_key: string;
  client_id: string;
  pairwise_sub: string;
  granted_scopes: string[];
  granted_claims: string[];
  claim_classification_summary: Array<{
    claim: string;
    dataClass: string;
  }>;
  consent_version: number;
  policy_version: string;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: "user" | "operator" | null;
  source: "passport";
};

type PersistedUserRow = {
  id: number;
  email: string | null;
  phone: string | null;
};

type PersistedHumanSubjectRow = {
  human_subject_key: string;
  cubid_user_id: number | null;
  primary_email: string | null;
  primary_phone: string | null;
  created_at: string;
  updated_at: string;
};

type ChallengeClientSummary = {
  client_id: string;
  client_name: string;
  client_type: CubidClientType;
  verification_status: CubidClientRecord["verificationStatus"];
  logo_uri: string | null;
  policy_uri: string | null;
  tos_uri: string | null;
};

export type OidcLoginChallengeView = OidcLoginChallenge & {
  client: ChallengeClientSummary;
  requested_scopes: OidcScope[];
};

export type OidcConsentChallengeView = OidcConsentChallenge & {
  client: ChallengeClientSummary;
  requested_scopes: OidcScope[];
};

type LoginCompletionInput = {
  verifiedEmail: string | null;
  verifiedPhone: string | null;
  cubidUserId: number | null;
  authenticationMethods: string[];
};

type CompleteLoginChallengeResult = {
  next: "consent" | "redirect";
  redirectTo: string;
  sessionId: string;
};

type ConsentApprovalResult = {
  redirectTo: string;
  authorizationCode: string;
};

type ConsentGrantResult = {
  consentId: string;
  consentVersion: number;
  pairwiseSub: string;
};

export class AuthorizationRequestError extends Error {
  error: string;
  errorDescription: string;
  statusCode: number;
  redirectTo: string | null;

  constructor(
    error: string,
    errorDescription: string,
    options?: {
      statusCode?: number;
      redirectTo?: string | null;
    },
  ) {
    super(errorDescription);
    this.name = "AuthorizationRequestError";
    this.error = error;
    this.errorDescription = errorDescription;
    this.statusCode = options?.statusCode ?? 400;
    this.redirectTo = options?.redirectTo ?? null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function plusMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function createOpaqueId(prefix: string): string {
  return `${prefix}_${generateRandomToken(24)}`;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function ensureArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function parseScopeSet(scope: string): OidcScope[] {
  const deduped = [...new Set(scope.split(/\s+/).map((entry) => entry.trim()).filter(Boolean))];

  if (deduped.length === 0) {
    throw new AuthorizationRequestError("invalid_scope", "scope is required.");
  }

  const unsupportedScope = deduped.find((entry) => !isSupportedScope(entry));

  if (unsupportedScope) {
    throw new AuthorizationRequestError("invalid_scope", `Unsupported scope requested: ${unsupportedScope}.`);
  }

  return deduped as OidcScope[];
}

export function parsePromptSet(prompt: string | null): string[] {
  if (!prompt) {
    return [];
  }

  const values = [...new Set(prompt.split(/\s+/).map((entry) => entry.trim()).filter(Boolean))];

  const unsupported = values.find((entry) => !SUPPORTED_PROMPTS.has(entry));
  if (unsupported) {
    throw new AuthorizationRequestError("invalid_request", `Unsupported prompt value: ${unsupported}.`);
  }

  if (values.includes("none") && values.length > 1) {
    throw new AuthorizationRequestError("invalid_request", 'prompt value "none" cannot be combined with other prompt values.');
  }

  return values;
}

export function buildAuthorizationSuccessRedirect(redirectUri: string, code: string, state: string | null): string {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

export function buildAuthorizationErrorRedirect(
  redirectUri: string,
  error: string,
  errorDescription: string,
  state: string | null,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", errorDescription);

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

function buildPassportInteractionUrl(baseUrl: string, challengeParam: string, challengeId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set(challengeParam, challengeId);
  return url.toString();
}

function mapClientRecord(row: PersistedClientRow): CubidClientRecord & { metadata: Record<string, unknown> } {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    clientType: row.client_type,
    status: row.status,
    verificationStatus: row.verification_status,
    tokenEndpointAuthMethod: row.token_endpoint_auth_method,
    redirectUris: row.redirect_uris ?? [],
    postLogoutRedirectUris: row.post_logout_redirect_uris ?? [],
    grantTypes: (row.grant_types ?? []) as CubidClientRecord["grantTypes"],
    defaultScopes: row.default_scopes ?? [],
    allowedScopes: row.allowed_scopes ?? [],
    rateLimitTier: row.rate_limit_tier,
    ownerAccountId: row.owner_account_id,
    registrationClientUri: row.registration_client_uri,
    secretVersion: row.secret_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    suspendedAt: row.suspended_at,
    metadata: row.metadata ?? {},
  };
}

function mapChallengeClient(client: CubidClientRecord & { metadata: Record<string, unknown> }): ChallengeClientSummary {
  return {
    client_id: client.clientId,
    client_name: client.clientName,
    client_type: client.clientType,
    verification_status: client.verificationStatus,
    logo_uri: normalizeOptionalString(client.metadata.logo_uri),
    policy_uri: normalizeOptionalString(client.metadata.policy_uri),
    tos_uri: normalizeOptionalString(client.metadata.tos_uri),
  };
}

function createAuthorizationContext(row: PersistedAuthorizationRequestRow): OidcAuthorizationRequestContext {
  return {
    clientId: row.client_id,
    redirectUri: row.redirect_uri,
    scope: row.scope,
    state: row.state,
    nonce: row.nonce,
    codeChallenge: row.code_challenge,
    codeChallengeMethod: row.code_challenge_method as OidcAuthorizationRequestContext["codeChallengeMethod"],
    loginHint: row.login_hint,
    prompt: row.prompt,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

async function getClientById(supabase: SupabaseClient, clientId: string): Promise<(CubidClientRecord & { metadata: Record<string, unknown> }) | null> {
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

  return mapClientRecord(data as PersistedClientRow);
}

async function getAuthorizationRequestByLoginChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<PersistedAuthorizationRequestRow | null> {
  const { data, error } = await supabase
    .from("oidc_authorization_requests")
    .select("*")
    .eq("login_challenge_id", challengeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC authorization request: ${error.message}`);
  }

  return (data as PersistedAuthorizationRequestRow | null) ?? null;
}

async function getAuthorizationRequestByConsentChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<PersistedAuthorizationRequestRow | null> {
  const { data, error } = await supabase
    .from("oidc_authorization_requests")
    .select("*")
    .eq("consent_challenge_id", challengeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC consent challenge: ${error.message}`);
  }

  return (data as PersistedAuthorizationRequestRow | null) ?? null;
}

async function getSessionById(supabase: SupabaseClient, sessionId: string): Promise<PersistedSessionRow | null> {
  const { data, error } = await supabase
    .from("oidc_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC session: ${error.message}`);
  }

  return (data as PersistedSessionRow | null) ?? null;
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
    log_id: createOpaqueId("audit"),
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

async function updateAuthorizationRequest(
  supabase: SupabaseClient,
  requestId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("oidc_authorization_requests")
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq("request_id", requestId);

  if (error) {
    throw new Error(`Failed to update OIDC authorization request: ${error.message}`);
  }
}

async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("oidc_sessions")
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(`Failed to update OIDC session: ${error.message}`);
  }
}

function parseLoginCompletionInput(payload: Record<string, unknown>): LoginCompletionInput {
  const verifiedEmail = normalizeOptionalString(payload.verified_email) ?? normalizeOptionalString(payload.verifiedEmail);
  const verifiedPhone = normalizeOptionalString(payload.verified_phone) ?? normalizeOptionalString(payload.verifiedPhone);
  const cubidUserId = normalizeOptionalNumber(payload.cubid_user_id) ?? normalizeOptionalNumber(payload.cubidUserId);

  const authenticationMethods = [
    ...new Set([
      ...ensureArrayOfStrings(payload.authentication_methods),
      ...ensureArrayOfStrings(payload.authenticationMethods),
    ]),
  ];

  if (!verifiedEmail && !verifiedPhone && cubidUserId === null) {
    throw new AuthorizationRequestError(
      "invalid_request",
      "Login completion requires a verified email, a verified phone number, or an existing Cubid user id.",
    );
  }

  if (authenticationMethods.length === 0) {
    if (verifiedEmail) {
      authenticationMethods.push("email_otp");
    }
    if (verifiedPhone) {
      authenticationMethods.push("phone_otp");
    }
  }

  return {
    verifiedEmail,
    verifiedPhone,
    cubidUserId,
    authenticationMethods,
  };
}

async function resolveUserByIdentifiers(
  supabase: SupabaseClient,
  input: LoginCompletionInput,
): Promise<PersistedUserRow> {
  let userById: PersistedUserRow | null = null;
  let userByEmail: PersistedUserRow | null = null;
  let userByPhone: PersistedUserRow | null = null;

  if (input.cubidUserId !== null) {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,phone")
      .eq("id", input.cubidUserId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load Cubid user by id: ${error.message}`);
    }

    userById = (data as PersistedUserRow | null) ?? null;
  }

  if (input.verifiedEmail) {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,phone")
      .eq("email", input.verifiedEmail)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load Cubid user by email: ${error.message}`);
    }

    userByEmail = (data as PersistedUserRow | null) ?? null;
  }

  if (input.verifiedPhone) {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,phone")
      .eq("phone", input.verifiedPhone)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load Cubid user by phone: ${error.message}`);
    }

    userByPhone = (data as PersistedUserRow | null) ?? null;
  }

  const resolvedUsers = [userById, userByEmail, userByPhone].filter((entry): entry is PersistedUserRow => Boolean(entry));
  const distinctIds = [...new Set(resolvedUsers.map((entry) => entry.id))];

  if (distinctIds.length > 1) {
    throw new AuthorizationRequestError(
      "invalid_request",
      "The verified login identifiers map to different Cubid users and cannot be merged automatically.",
      { statusCode: 409 },
    );
  }

  if (resolvedUsers[0]) {
    const targetUser = resolvedUsers[0];
    const patch: Record<string, unknown> = {};

    if (input.verifiedEmail && !targetUser.email) {
      patch.email = input.verifiedEmail;
    }

    if (input.verifiedPhone && !targetUser.phone) {
      patch.phone = input.verifiedPhone;
    }

    if (Object.keys(patch).length > 0) {
      const { data, error } = await supabase
        .from("users")
        .update(patch)
        .eq("id", targetUser.id)
        .select("id,email,phone")
        .single();

      if (error) {
        throw new Error(`Failed to update Cubid user identifiers: ${error.message}`);
      }

      return data as PersistedUserRow;
    }

    return targetUser;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      email: input.verifiedEmail,
      phone: input.verifiedPhone,
      is_3rd_party: false,
    })
    .select("id,email,phone")
    .single();

  if (error) {
    throw new Error(`Failed to create Cubid user during OIDC login: ${error.message}`);
  }

  return data as PersistedUserRow;
}

async function resolveHumanSubject(
  supabase: SupabaseClient,
  user: PersistedUserRow,
): Promise<PersistedHumanSubjectRow> {
  const { data: existing, error: lookupError } = await supabase
    .from("oidc_human_subjects")
    .select("*")
    .eq("cubid_user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to load OIDC human subject: ${lookupError.message}`);
  }

  if (existing) {
    const patch: Record<string, unknown> = {};

    if (user.email && existing.primary_email !== user.email) {
      patch.primary_email = user.email;
    }

    if (user.phone && existing.primary_phone !== user.phone) {
      patch.primary_phone = user.phone;
    }

    if (Object.keys(patch).length > 0) {
      const { data, error } = await supabase
        .from("oidc_human_subjects")
        .update({
          ...patch,
          updated_at: nowIso(),
        })
        .eq("human_subject_key", existing.human_subject_key)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to update OIDC human subject: ${error.message}`);
      }

      return data as PersistedHumanSubjectRow;
    }

    return existing as PersistedHumanSubjectRow;
  }

  const { data, error } = await supabase
    .from("oidc_human_subjects")
    .insert({
      human_subject_key: createHumanSubjectKey(),
      cubid_user_id: user.id,
      primary_email: user.email,
      primary_phone: user.phone,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create OIDC human subject: ${error.message}`);
  }

  return data as PersistedHumanSubjectRow;
}

function buildRequestedClaims(row: PersistedAuthorizationRequestRow): string[] {
  return row.requested_claims?.length > 0 ? row.requested_claims : getClaimsForScopes(parseScopeSet(row.scope));
}

async function findMatchingConsent(
  supabase: SupabaseClient,
  humanSubjectKey: string,
  clientId: string,
  requestedScopes: OidcScope[],
  requestedClaims: string[],
): Promise<PersistedConsentRow | null> {
  const { data, error } = await supabase
    .from("oidc_consents")
    .select("*")
    .eq("human_subject_key", humanSubjectKey)
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .order("consent_version", { ascending: false });

  if (error) {
    throw new Error(`Failed to load existing OIDC consents: ${error.message}`);
  }

  const requestedFingerprint = computeConsentFingerprint(requestedScopes, requestedClaims);
  const matching = (data as PersistedConsentRow[]).find((entry) => {
    return computeConsentFingerprint(entry.granted_scopes ?? [], entry.granted_claims ?? []) === requestedFingerprint;
  });

  return matching ?? null;
}

async function createOrReuseConsentGrant(
  supabase: SupabaseClient,
  requestRow: PersistedAuthorizationRequestRow,
  sessionRow: PersistedSessionRow,
): Promise<ConsentGrantResult> {
  if (!sessionRow.human_subject_key) {
    throw new Error("OIDC session is missing a human subject key.");
  }

  const requestedScopes = parseScopeSet(requestRow.scope);
  const requestedClaims = buildRequestedClaims(requestRow);
  const existingConsent = await findMatchingConsent(
    supabase,
    sessionRow.human_subject_key,
    requestRow.client_id,
    requestedScopes,
    requestedClaims,
  );

  const pairwise = derivePairwiseSubject(
    {
      derivationVersion: "v1",
      issuer: getOidcRuntimeConfig().issuer,
      clientId: requestRow.client_id,
      humanSubjectKey: sessionRow.human_subject_key,
    },
    getOidcRuntimeConfig().pairwiseSubjectMasterSecret,
  );

  if (existingConsent) {
    return {
      consentId: existingConsent.consent_id,
      consentVersion: existingConsent.consent_version,
      pairwiseSub: pairwise.sub,
    };
  }

  const { data: existingConsents, error: consentsError } = await supabase
    .from("oidc_consents")
    .select("consent_version")
    .eq("human_subject_key", sessionRow.human_subject_key)
    .eq("client_id", requestRow.client_id)
    .order("consent_version", { ascending: false });

  if (consentsError) {
    throw new Error(`Failed to load OIDC consent versions: ${consentsError.message}`);
  }

  const nextVersion = Math.max(0, ...((existingConsents ?? []).map((entry) => entry.consent_version ?? 0))) + 1;
  const claimClassificationSummary = requestedClaims.map((claim) => ({
    claim,
    dataClass: getClaimDefinition(claim)?.classification ?? "json",
  }));

  const consentId = createOpaqueId("consent");
  const { error } = await supabase.from("oidc_consents").insert({
    consent_id: consentId,
    human_subject_key: sessionRow.human_subject_key,
    client_id: requestRow.client_id,
    pairwise_sub: pairwise.sub,
    granted_scopes: requestedScopes,
    granted_claims: requestedClaims,
    claim_classification_summary: claimClassificationSummary,
    consent_version: nextVersion,
    policy_version: "v1",
    source: "passport",
  });

  if (error) {
    throw new Error(`Failed to persist OIDC consent grant: ${error.message}`);
  }

  return {
    consentId,
    consentVersion: nextVersion,
    pairwiseSub: pairwise.sub,
  };
}

async function issueAuthorizationCode(
  supabase: SupabaseClient,
  requestRow: PersistedAuthorizationRequestRow,
  sessionRow: PersistedSessionRow,
  consentGrant: ConsentGrantResult,
  requestId: string,
): Promise<ConsentApprovalResult> {
  const authorizationCode = createOpaqueId("code");

  const { error } = await supabase.from("oidc_authorization_codes").insert({
    code_id: createOpaqueId("authcode"),
    authorization_code: authorizationCode,
    client_id: requestRow.client_id,
    session_id: sessionRow.session_id,
    cubid_user_id: sessionRow.cubid_user_id,
    human_subject_key: sessionRow.human_subject_key,
    redirect_uri: requestRow.redirect_uri,
    code_challenge: requestRow.code_challenge,
    code_challenge_method: requestRow.code_challenge_method,
    scope: requestRow.scope,
    state: requestRow.state,
    nonce: requestRow.nonce,
    expires_at: plusMs(AUTHORIZATION_CODE_LIFETIME_MS),
    metadata: {
      consent_id: consentGrant.consentId,
      consent_version: consentGrant.consentVersion,
      pairwise_sub: consentGrant.pairwiseSub,
      request_id: requestId,
    },
  });

  if (error) {
    throw new Error(`Failed to issue authorization code: ${error.message}`);
  }

  await updateAuthorizationRequest(supabase, requestRow.request_id, {
    status: "approved",
    approved_at: nowIso(),
  });

  await insertAuditEvent(supabase, {
    clientId: requestRow.client_id,
    sessionId: sessionRow.session_id,
    eventType: "authorization_code.issued",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: sessionRow.human_subject_key ?? String(sessionRow.cubid_user_id ?? "unknown"),
    details: {
      consent_id: consentGrant.consentId,
      consent_version: consentGrant.consentVersion,
      granted_scope: requestRow.scope,
    },
  });

  return {
    redirectTo: buildAuthorizationSuccessRedirect(requestRow.redirect_uri, authorizationCode, requestRow.state),
    authorizationCode,
  };
}

async function maybeReuseExistingConsentAndRedirect(
  supabase: SupabaseClient,
  requestRow: PersistedAuthorizationRequestRow,
  sessionRow: PersistedSessionRow,
  requestId: string,
): Promise<ConsentApprovalResult | null> {
  if (!sessionRow.human_subject_key) {
    return null;
  }

  const requestedScopes = parseScopeSet(requestRow.scope);
  const requestedClaims = buildRequestedClaims(requestRow);
  const existingConsent = await findMatchingConsent(
    supabase,
    sessionRow.human_subject_key,
    requestRow.client_id,
    requestedScopes,
    requestedClaims,
  );

  if (!existingConsent) {
    return null;
  }

  return issueAuthorizationCode(
    supabase,
    requestRow,
    sessionRow,
    {
      consentId: existingConsent.consent_id,
      consentVersion: existingConsent.consent_version,
      pairwiseSub: existingConsent.pairwise_sub,
    },
    requestId,
  );
}

export async function createLoginChallengeFromAuthorizationRequest(
  supabase: SupabaseClient,
  request: Request,
  requestId: string,
): Promise<{
  redirectTo: string;
  challenge: OidcLoginChallengeView;
}> {
  const url = new URL(request.url);
  const clientId = normalizeOptionalString(url.searchParams.get("client_id"));
  const redirectUri = normalizeOptionalString(url.searchParams.get("redirect_uri"));
  const responseType = normalizeOptionalString(url.searchParams.get("response_type"));
  const scope = normalizeOptionalString(url.searchParams.get("scope"));
  const state = normalizeOptionalString(url.searchParams.get("state"));
  const nonce = normalizeOptionalString(url.searchParams.get("nonce"));
  const codeChallenge = normalizeOptionalString(url.searchParams.get("code_challenge"));
  const codeChallengeMethod = normalizeOptionalString(url.searchParams.get("code_challenge_method"));
  const loginHint = normalizeOptionalString(url.searchParams.get("login_hint"));
  const prompt = normalizeOptionalString(url.searchParams.get("prompt"));

  if (!clientId) {
    throw new AuthorizationRequestError("invalid_request", "client_id is required.");
  }

  const client = await getClientById(supabase, clientId);
  if (!client) {
    throw new AuthorizationRequestError("invalid_client", "Unknown OIDC client.");
  }

  if (client.status !== "active") {
    throw new AuthorizationRequestError("unauthorized_client", "This OIDC client is not active.", { statusCode: 403 });
  }

  if (!redirectUri) {
    throw new AuthorizationRequestError("invalid_request", "redirect_uri is required.");
  }

  const redirectIsRegistered = client.redirectUris.includes(redirectUri);
  if (!redirectIsRegistered) {
    throw new AuthorizationRequestError("invalid_request", "redirect_uri must exactly match a registered redirect URI.");
  }

  if (responseType !== "code") {
    throw new AuthorizationRequestError(
      "unsupported_response_type",
      'Only response_type="code" is supported.',
      {
        redirectTo: buildAuthorizationErrorRedirect(
          redirectUri,
          "unsupported_response_type",
          'Only response_type="code" is supported.',
          state,
        ),
      },
    );
  }

  if (!client.grantTypes.includes("authorization_code")) {
    throw new AuthorizationRequestError(
      "unauthorized_client",
      "This OIDC client is not allowed to use the authorization_code grant.",
      {
        statusCode: 403,
        redirectTo: buildAuthorizationErrorRedirect(
          redirectUri,
          "unauthorized_client",
          "This OIDC client is not allowed to use the authorization_code grant.",
          state,
        ),
      },
    );
  }

  if (!scope) {
    throw new AuthorizationRequestError(
      "invalid_scope",
      "scope is required.",
      { redirectTo: buildAuthorizationErrorRedirect(redirectUri, "invalid_scope", "scope is required.", state) },
    );
  }

  const requestedScopes = parseScopeSet(scope);
  if (!requestedScopes.includes("openid")) {
    throw new AuthorizationRequestError(
      "invalid_scope",
      'OIDC authorization requests must include the "openid" scope.',
      {
        redirectTo: buildAuthorizationErrorRedirect(
          redirectUri,
          "invalid_scope",
          'OIDC authorization requests must include the "openid" scope.',
          state,
        ),
      },
    );
  }

  const disallowedScope = requestedScopes.find((entry) => !client.allowedScopes.includes(entry));
  if (disallowedScope) {
    throw new AuthorizationRequestError(
      "invalid_scope",
      `Requested scope is not allowed for this client: ${disallowedScope}.`,
      {
        redirectTo: buildAuthorizationErrorRedirect(
          redirectUri,
          "invalid_scope",
          `Requested scope is not allowed for this client: ${disallowedScope}.`,
          state,
        ),
      },
    );
  }

  if (!codeChallenge) {
    throw new AuthorizationRequestError(
      "invalid_request",
      "code_challenge is required.",
      {
        redirectTo: buildAuthorizationErrorRedirect(redirectUri, "invalid_request", "code_challenge is required.", state),
      },
    );
  }

  if (codeChallengeMethod !== "S256") {
    throw new AuthorizationRequestError(
      "invalid_request",
      'code_challenge_method must be "S256".',
      {
        redirectTo: buildAuthorizationErrorRedirect(
          redirectUri,
          "invalid_request",
          'code_challenge_method must be "S256".',
          state,
        ),
      },
    );
  }

  const promptValues = parsePromptSet(prompt);
  if (promptValues.includes("none")) {
    throw new AuthorizationRequestError(
      "login_required",
      "prompt=none cannot be satisfied until issuer-side session reuse is implemented.",
      {
        redirectTo: buildAuthorizationErrorRedirect(
          redirectUri,
          "login_required",
          "prompt=none cannot be satisfied until issuer-side session reuse is implemented.",
          state,
        ),
      },
    );
  }

  const createdAt = nowIso();
  const expiresAt = plusMs(LOGIN_CHALLENGE_LIFETIME_MS);
  const loginChallengeId = createOpaqueId("login");
  const requestRow: PersistedAuthorizationRequestRow = {
    request_id: createOpaqueId("authreq"),
    login_challenge_id: loginChallengeId,
    consent_challenge_id: null,
    client_id: clientId,
    session_id: null,
    status: "pending_login",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: requestedScopes.join(" "),
    requested_claims: getClaimsForScopes(requestedScopes),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    login_hint: loginHint,
    prompt: promptValues.length > 0 ? promptValues.join(" ") : null,
    expires_at: expiresAt,
    authenticated_at: null,
    approved_at: null,
    denied_at: null,
    metadata: {
      request_id: requestId,
    },
    created_at: createdAt,
    updated_at: createdAt,
  };

  const { error } = await supabase.from("oidc_authorization_requests").insert(requestRow);
  if (error) {
    throw new Error(`Failed to create OIDC login challenge: ${error.message}`);
  }

  await insertAuditEvent(supabase, {
    clientId,
    eventType: "authorization.requested",
    requestId,
    outcome: "success",
    actorType: "anonymous",
    actorIdentifier: "browser",
    details: {
      login_challenge_id: loginChallengeId,
      scope: requestedScopes,
      redirect_uri: redirectUri,
    },
  });

  const authorizationRequest = createAuthorizationContext(requestRow);
  const challenge: OidcLoginChallengeView = {
    challengeId: loginChallengeId,
    type: "login",
    authorizationRequest,
    passportReturnUrl: buildPassportInteractionUrl(getOidcRuntimeConfig().passportLoginUrl, "login_challenge", loginChallengeId),
    createdAt: createdAt,
    expiresAt,
    client: mapChallengeClient(client),
    requested_scopes: requestedScopes,
  };

  return {
    redirectTo: challenge.passportReturnUrl,
    challenge,
  };
}

export async function getLoginChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<OidcLoginChallengeView | null> {
  const requestRow = await getAuthorizationRequestByLoginChallenge(supabase, challengeId);
  if (!requestRow || requestRow.status !== "pending_login" || isExpired(requestRow.expires_at)) {
    return null;
  }

  const client = await getClientById(supabase, requestRow.client_id);
  if (!client) {
    return null;
  }

  return {
    challengeId: requestRow.login_challenge_id,
    type: "login",
    authorizationRequest: createAuthorizationContext(requestRow),
    passportReturnUrl: buildPassportInteractionUrl(getOidcRuntimeConfig().passportLoginUrl, "login_challenge", requestRow.login_challenge_id),
    createdAt: requestRow.created_at,
    expiresAt: requestRow.expires_at,
    client: mapChallengeClient(client),
    requested_scopes: parseScopeSet(requestRow.scope),
  };
}

export async function completeLoginChallenge(
  supabase: SupabaseClient,
  challengeId: string,
  payload: Record<string, unknown>,
  requestId: string,
): Promise<CompleteLoginChallengeResult> {
  const requestRow = await getAuthorizationRequestByLoginChallenge(supabase, challengeId);
  if (!requestRow || requestRow.status !== "pending_login" || isExpired(requestRow.expires_at)) {
    throw new AuthorizationRequestError("challenge_not_found", "The login challenge could not be found or is no longer active.", { statusCode: 404 });
  }

  const client = await getClientById(supabase, requestRow.client_id);
  if (!client || client.status !== "active") {
    throw new AuthorizationRequestError("unauthorized_client", "The OIDC client is not available for login completion.", { statusCode: 403 });
  }

  const input = parseLoginCompletionInput(payload);
  const user = await resolveUserByIdentifiers(supabase, input);
  const humanSubject = await resolveHumanSubject(supabase, user);
  const sessionId = createOpaqueId("session");
  const sessionExpiresAt = plusMs(SESSION_LIFETIME_MS);

  const { error } = await supabase.from("oidc_sessions").insert({
    session_id: sessionId,
    client_id: requestRow.client_id,
    cubid_user_id: user.id,
    human_subject_key: humanSubject.human_subject_key,
    login_challenge_id: requestRow.login_challenge_id,
    authentication_methods: input.authenticationMethods,
    verified_email: input.verifiedEmail,
    verified_phone: input.verifiedPhone,
    expires_at: sessionExpiresAt,
    metadata: {
      request_id: requestId,
      bootstrap: input.verifiedEmail || input.verifiedPhone ? true : false,
    },
  });

  if (error) {
    throw new Error(`Failed to create OIDC session: ${error.message}`);
  }

  const promptValues = parsePromptSet(requestRow.prompt);
  const sessionRow = await getSessionById(supabase, sessionId);
  if (!sessionRow) {
    throw new Error("OIDC session could not be reloaded after creation.");
  }

  await insertAuditEvent(supabase, {
    clientId: requestRow.client_id,
    sessionId,
    eventType: "login_challenge.completed",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: humanSubject.human_subject_key,
    details: {
      verified_email: input.verifiedEmail,
      verified_phone: input.verifiedPhone,
      authentication_methods: input.authenticationMethods,
    },
  });

  if (!promptValues.includes("consent")) {
    const reused = await maybeReuseExistingConsentAndRedirect(supabase, requestRow, sessionRow, requestId);
    if (reused) {
      await updateAuthorizationRequest(supabase, requestRow.request_id, {
        session_id: sessionId,
        authenticated_at: nowIso(),
      });

      return {
        next: "redirect",
        redirectTo: reused.redirectTo,
        sessionId,
      };
    }
  }

  const consentChallengeId = createOpaqueId("consent_challenge");
  await updateAuthorizationRequest(supabase, requestRow.request_id, {
    session_id: sessionId,
    consent_challenge_id: consentChallengeId,
    status: "pending_consent",
    authenticated_at: nowIso(),
  });
  await updateSession(supabase, sessionId, {
    consent_challenge_id: consentChallengeId,
  });

  return {
    next: "consent",
    redirectTo: buildPassportInteractionUrl(getOidcRuntimeConfig().passportConsentUrl, "consent_challenge", consentChallengeId),
    sessionId,
  };
}

export async function getConsentChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<OidcConsentChallengeView | null> {
  const requestRow = await getAuthorizationRequestByConsentChallenge(supabase, challengeId);
  if (!requestRow || requestRow.status !== "pending_consent" || isExpired(requestRow.expires_at) || !requestRow.session_id) {
    return null;
  }

  const client = await getClientById(supabase, requestRow.client_id);
  const session = await getSessionById(supabase, requestRow.session_id);

  if (!client || !session || session.revoked_at || isExpired(session.expires_at)) {
    return null;
  }

  return {
    challengeId,
    type: "consent",
    authorizationRequest: createAuthorizationContext(requestRow),
    sessionId: session.session_id,
    cubidUserId: session.cubid_user_id,
    humanSubjectKey: session.human_subject_key,
    requestedClaims: buildRequestedClaims(requestRow),
    createdAt: requestRow.created_at,
    expiresAt: requestRow.expires_at,
    client: mapChallengeClient(client),
    requested_scopes: parseScopeSet(requestRow.scope),
  };
}

export async function approveConsentChallenge(
  supabase: SupabaseClient,
  challengeId: string,
  requestId: string,
): Promise<ConsentApprovalResult> {
  const requestRow = await getAuthorizationRequestByConsentChallenge(supabase, challengeId);
  if (!requestRow || requestRow.status !== "pending_consent" || isExpired(requestRow.expires_at) || !requestRow.session_id) {
    throw new AuthorizationRequestError("challenge_not_found", "The consent challenge could not be found or is no longer active.", { statusCode: 404 });
  }

  const sessionRow = await getSessionById(supabase, requestRow.session_id);
  if (!sessionRow || sessionRow.revoked_at || isExpired(sessionRow.expires_at)) {
    throw new AuthorizationRequestError("login_required", "The login session for this consent challenge is no longer active.", { statusCode: 401 });
  }

  const consentGrant = await createOrReuseConsentGrant(supabase, requestRow, sessionRow);

  await insertAuditEvent(supabase, {
    clientId: requestRow.client_id,
    sessionId: sessionRow.session_id,
    eventType: "consent.approved",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: sessionRow.human_subject_key ?? String(sessionRow.cubid_user_id ?? "unknown"),
    details: {
      consent_id: consentGrant.consentId,
      consent_version: consentGrant.consentVersion,
      scope: requestRow.scope,
    },
  });

  return issueAuthorizationCode(supabase, requestRow, sessionRow, consentGrant, requestId);
}

export async function rejectConsentChallenge(
  supabase: SupabaseClient,
  challengeId: string,
  requestId: string,
): Promise<{ redirectTo: string }> {
  const requestRow = await getAuthorizationRequestByConsentChallenge(supabase, challengeId);
  if (!requestRow) {
    throw new AuthorizationRequestError("challenge_not_found", "The consent challenge could not be found.", { statusCode: 404 });
  }

  await updateAuthorizationRequest(supabase, requestRow.request_id, {
    status: "denied",
    denied_at: nowIso(),
  });

  await insertAuditEvent(supabase, {
    clientId: requestRow.client_id,
    sessionId: requestRow.session_id,
    eventType: "consent.rejected",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: challengeId,
    details: {
      scope: requestRow.scope,
    },
  });

  return {
    redirectTo: buildAuthorizationErrorRedirect(
      requestRow.redirect_uri,
      "access_denied",
      "The user denied the requested access.",
      requestRow.state,
    ),
  };
}