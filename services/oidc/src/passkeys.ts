import {
  base64UrlDecode,
  base64UrlEncode,
  createCubidWebAuthnUserHandle,
  parseCubidWebAuthnUserHandle,
  type CompleteCubidWebAuthnAuthenticationInput,
  type CompleteCubidWebAuthnRegistrationInput,
  type CubidWebAuthnAuthenticationChallenge,
  type CubidWebAuthnCredentialDescriptor,
  type CubidWebAuthnCredentialRecord,
  type CubidWebAuthnRegistrationChallenge,
} from "@cubid/auth";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AuthorizationRequestError,
  completeLoginChallengeForSubject,
} from "./authorize";
import { getOidcRuntimeConfig } from "./config";

const PASSKEY_CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;

type PersistedAuthorizationRequestRow = {
  request_id: string;
  client_id: string;
  login_challenge_id: string;
  login_hint: string | null;
  status: "pending_login" | "pending_consent" | "approved" | "denied" | "expired";
  expires_at: string;
};

type PersistedSessionRow = {
  session_id: string;
  cubid_user_id: number | null;
  human_subject_key: string | null;
  verified_email: string | null;
  verified_phone: string | null;
  expires_at: string;
  revoked_at: string | null;
};

type PersistedHumanSubjectRow = {
  human_subject_key: string;
  cubid_user_id: number | null;
  primary_email: string | null;
  primary_phone: string | null;
};

type PersistedWebAuthnCredentialRow = {
  credential_id: string;
  user_handle: string;
  human_subject_key: string;
  cubid_user_id: number | null;
  credential_label: string | null;
  public_key_cose: string;
  transports: unknown;
  authenticator_attachment: string | null;
  authenticator_aaguid: string | null;
  attestation_format: string | null;
  attestation_type: string | null;
  backup_eligible: boolean;
  backup_state: boolean;
  sign_count: number;
  last_authenticated_at: string | null;
  revoked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PersistedWebAuthnChallengeRow = {
  challenge_id: string;
  challenge: string;
  challenge_type: "registration" | "authentication";
  login_challenge_id: string | null;
  session_id: string | null;
  human_subject_key: string | null;
  cubid_user_id: number | null;
  user_handle: string | null;
  rp_id: string;
  user_verification: "required" | "preferred" | "discouraged";
  expires_at: string;
  consumed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type OidcPasskeyAuthenticationOptions = CubidWebAuthnAuthenticationChallenge & {
  publicKey: PublicKeyCredentialRequestOptionsJSON;
};

export type OidcPasskeyRegistrationOptions = CubidWebAuthnRegistrationChallenge & {
  publicKey: PublicKeyCredentialCreationOptionsJSON;
};

type CompletePasskeyAuthenticationResult = {
  next: "consent" | "redirect";
  redirectTo: string;
  sessionId: string;
  webAuthnCredentialId: string;
};

type CompletePasskeyRegistrationResult = {
  credential: CubidWebAuthnCredentialRecord;
};

function nowIso(): string {
  return new Date().toISOString();
}

function plusMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function createOpaqueId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function serializeCredentialDescriptor(row: PersistedWebAuthnCredentialRow): CubidWebAuthnCredentialDescriptor {
  return {
    id: row.credential_id,
    transports: ensureStringArray(row.transports),
  };
}

function serializeCredential(row: PersistedWebAuthnCredentialRow): CubidWebAuthnCredentialRecord {
  return {
    credentialId: row.credential_id,
    userHandle: row.user_handle,
    humanSubjectKey: row.human_subject_key,
    cubidUserId: row.cubid_user_id,
    credentialLabel: row.credential_label,
    transports: ensureStringArray(row.transports),
    authenticatorAttachment: (row.authenticator_attachment as CubidWebAuthnCredentialRecord["authenticatorAttachment"]) ?? null,
    aaguid: row.authenticator_aaguid,
    attestationFormat: row.attestation_format,
    attestationType: row.attestation_type,
    backupEligible: row.backup_eligible,
    backupState: row.backup_state,
    signCount: Number(row.sign_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAuthenticatedAt: row.last_authenticated_at,
    revokedAt: row.revoked_at,
    metadata: row.metadata ?? {},
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

async function getLoginRequestByChallenge(
  supabase: SupabaseClient,
  loginChallengeId: string,
): Promise<PersistedAuthorizationRequestRow | null> {
  const { data, error } = await supabase
    .from("oidc_authorization_requests")
    .select("request_id,client_id,login_challenge_id,login_hint,status,expires_at")
    .eq("login_challenge_id", loginChallengeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC login challenge: ${error.message}`);
  }

  return (data as PersistedAuthorizationRequestRow | null) ?? null;
}

async function getActiveSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<PersistedSessionRow | null> {
  const { data, error } = await supabase
    .from("oidc_sessions")
    .select("session_id,cubid_user_id,human_subject_key,verified_email,verified_phone,expires_at,revoked_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC session: ${error.message}`);
  }

  const session = (data as PersistedSessionRow | null) ?? null;
  if (!session || session.revoked_at || isExpired(session.expires_at)) {
    return null;
  }

  return session;
}

async function getHumanSubjectByKey(
  supabase: SupabaseClient,
  humanSubjectKey: string,
): Promise<PersistedHumanSubjectRow | null> {
  const { data, error } = await supabase
    .from("oidc_human_subjects")
    .select("human_subject_key,cubid_user_id,primary_email,primary_phone")
    .eq("human_subject_key", humanSubjectKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load OIDC human subject: ${error.message}`);
  }

  return (data as PersistedHumanSubjectRow | null) ?? null;
}

async function findHumanSubjectByLoginHint(
  supabase: SupabaseClient,
  loginHint: string,
): Promise<PersistedHumanSubjectRow | null> {
  const field = loginHint.includes("@") ? "primary_email" : "primary_phone";
  const { data, error } = await supabase
    .from("oidc_human_subjects")
    .select("human_subject_key,cubid_user_id,primary_email,primary_phone")
    .eq(field, loginHint)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve passkey login hint: ${error.message}`);
  }

  return (data as PersistedHumanSubjectRow | null) ?? null;
}

async function listActiveCredentialsForHumanSubject(
  supabase: SupabaseClient,
  humanSubjectKey: string,
): Promise<PersistedWebAuthnCredentialRow[]> {
  const { data, error } = await supabase
    .from("oidc_webauthn_credentials")
    .select("*")
    .eq("human_subject_key", humanSubjectKey)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load WebAuthn credentials: ${error.message}`);
  }

  return (data as PersistedWebAuthnCredentialRow[]) ?? [];
}

async function getCredentialById(
  supabase: SupabaseClient,
  credentialId: string,
): Promise<PersistedWebAuthnCredentialRow | null> {
  const { data, error } = await supabase
    .from("oidc_webauthn_credentials")
    .select("*")
    .eq("credential_id", credentialId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load WebAuthn credential: ${error.message}`);
  }

  return (data as PersistedWebAuthnCredentialRow | null) ?? null;
}

async function getChallengeById(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<PersistedWebAuthnChallengeRow | null> {
  const { data, error } = await supabase
    .from("oidc_webauthn_challenges")
    .select("*")
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load WebAuthn challenge: ${error.message}`);
  }

  return (data as PersistedWebAuthnChallengeRow | null) ?? null;
}

async function consumeChallenge(
  supabase: SupabaseClient,
  challengeId: string,
  metadataPatch?: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase
    .from("oidc_webauthn_challenges")
    .update({
      consumed_at: nowIso(),
      metadata: metadataPatch,
    })
    .eq("challenge_id", challengeId)
    .is("consumed_at", null)
    .select("challenge_id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to consume WebAuthn challenge: ${error.message}`);
  }

  if (!data) {
    throw new AuthorizationRequestError(
      "challenge_not_found",
      "The requested passkey challenge could not be found or is no longer active.",
      { statusCode: 404 },
    );
  }
}

function ensureChallengeIsActive(
  challenge: PersistedWebAuthnChallengeRow | null,
  expectedType: PersistedWebAuthnChallengeRow["challenge_type"],
): PersistedWebAuthnChallengeRow {
  if (!challenge || challenge.challenge_type !== expectedType || challenge.consumed_at || isExpired(challenge.expires_at)) {
    throw new AuthorizationRequestError(
      "challenge_not_found",
      "The requested passkey challenge could not be found or is no longer active.",
      { statusCode: 404 },
    );
  }

  return challenge;
}

function requireChallengeUserHandle(challenge: PersistedWebAuthnChallengeRow): string {
  const userHandle = normalizeOptionalString(challenge.user_handle);

  if (!userHandle) {
    throw new AuthorizationRequestError(
      "invalid_request",
      "The requested passkey challenge is missing the expected Cubid user handle.",
      { statusCode: 409 },
    );
  }

  return userHandle;
}

function toAuthenticationResponseJSON(input: CompleteCubidWebAuthnAuthenticationInput): AuthenticationResponseJSON {
  const response = input.credential.response as Record<string, unknown>;
  const clientDataJSON = normalizeOptionalString(response.clientDataJSON);
  const authenticatorData = normalizeOptionalString(response.authenticatorData);
  const signature = normalizeOptionalString(response.signature);
  const userHandle = normalizeOptionalString(response.userHandle);

  if (!clientDataJSON || !authenticatorData || !signature) {
    throw new AuthorizationRequestError("invalid_request", "The passkey authentication payload is missing required WebAuthn fields.");
  }

  return {
    id: input.credential.id,
    rawId: input.credential.rawId,
    type: input.credential.type,
    authenticatorAttachment: normalizeOptionalString(input.credential.authenticatorAttachment) as AuthenticationResponseJSON["authenticatorAttachment"],
    clientExtensionResults: input.credential.clientExtensionResults ?? {},
    response: {
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle: userHandle ?? undefined,
    },
  };
}

function toRegistrationResponseJSON(input: CompleteCubidWebAuthnRegistrationInput): RegistrationResponseJSON {
  const response = input.credential.response as Record<string, unknown>;
  const clientDataJSON = normalizeOptionalString(response.clientDataJSON);
  const attestationObject = normalizeOptionalString(response.attestationObject);

  if (!clientDataJSON || !attestationObject) {
    throw new AuthorizationRequestError("invalid_request", "The passkey registration payload is missing required WebAuthn fields.");
  }

  return {
    id: input.credential.id,
    rawId: input.credential.rawId,
    type: input.credential.type,
    authenticatorAttachment: normalizeOptionalString(input.credential.authenticatorAttachment) as RegistrationResponseJSON["authenticatorAttachment"],
    clientExtensionResults: input.credential.clientExtensionResults ?? {},
    response: {
      clientDataJSON,
      attestationObject,
      transports: ensureStringArray(response.transports) as RegistrationResponseJSON["response"]["transports"],
      authenticatorData: normalizeOptionalString(response.authenticatorData) ?? undefined,
      publicKey: normalizeOptionalString(response.publicKey) ?? undefined,
      publicKeyAlgorithm: typeof response.publicKeyAlgorithm === "number" ? response.publicKeyAlgorithm : undefined,
    },
  };
}

function toWebAuthnCredential(row: PersistedWebAuthnCredentialRow): WebAuthnCredential {
  return {
    id: row.credential_id,
    publicKey: base64UrlDecode(row.public_key_cose),
    counter: Number(row.sign_count ?? 0),
    transports: ensureStringArray(row.transports) as WebAuthnCredential["transports"],
  };
}

export async function createPasskeyAuthenticationOptions(
  supabase: SupabaseClient,
  loginChallengeId: string,
  payload: Record<string, unknown>,
  requestId: string,
): Promise<OidcPasskeyAuthenticationOptions> {
  const loginRequest = await getLoginRequestByChallenge(supabase, loginChallengeId);
  if (!loginRequest || loginRequest.status !== "pending_login" || isExpired(loginRequest.expires_at)) {
    throw new AuthorizationRequestError("challenge_not_found", "The login challenge could not be found or is no longer active.", { statusCode: 404 });
  }

  const loginHint = normalizeOptionalString(payload.login_hint) ?? loginRequest.login_hint;
  const hintedSubject = loginHint ? await findHumanSubjectByLoginHint(supabase, loginHint) : null;
  const allowedCredentials = hintedSubject
    ? await listActiveCredentialsForHumanSubject(supabase, hintedSubject.human_subject_key)
    : [];

  const config = getOidcRuntimeConfig();
  const publicKey = await generateAuthenticationOptions({
    rpID: config.passkeyRpId,
    allowCredentials: allowedCredentials.length > 0
      ? allowedCredentials.map((credential) => ({
          id: credential.credential_id,
          transports: ensureStringArray(credential.transports) as NonNullable<WebAuthnCredential["transports"]>,
        }))
      : undefined,
    userVerification: "required",
  });

  const challengeId = createOpaqueId("webauthn_challenge");
  const challengeRow: PersistedWebAuthnChallengeRow = {
    challenge_id: challengeId,
    challenge: publicKey.challenge,
    challenge_type: "authentication",
    login_challenge_id: loginChallengeId,
    session_id: null,
    human_subject_key: hintedSubject?.human_subject_key ?? null,
    cubid_user_id: hintedSubject?.cubid_user_id ?? null,
    user_handle: hintedSubject
      ? createCubidWebAuthnUserHandle({
          humanSubjectKey: hintedSubject.human_subject_key,
          cubidUserId: hintedSubject.cubid_user_id,
        })
      : null,
    rp_id: config.passkeyRpId,
    user_verification: "required",
    expires_at: plusMs(PASSKEY_CHALLENGE_LIFETIME_MS),
    consumed_at: null,
    metadata: {
      request_id: requestId,
      login_hint: loginHint,
      allow_credentials_count: allowedCredentials.length,
    },
    created_at: nowIso(),
  };

  const { error } = await supabase.from("oidc_webauthn_challenges").insert(challengeRow);
  if (error) {
    throw new Error(`Failed to persist WebAuthn authentication challenge: ${error.message}`);
  }

  await insertAuditEvent(supabase, {
    clientId: loginRequest.client_id,
    eventType: "passkey.authentication_challenge.created",
    requestId,
    outcome: "success",
    actorType: hintedSubject ? "user" : "anonymous",
    actorIdentifier: hintedSubject?.human_subject_key ?? "browser",
    details: {
      login_challenge_id: loginChallengeId,
      passkey_challenge_id: challengeId,
      login_hint: loginHint,
      allow_credentials_count: allowedCredentials.length,
    },
  });

  return {
    challengeId,
    challengeType: "authentication",
    challenge: challengeRow.challenge,
    loginChallengeId,
    sessionId: null,
    cubidUserId: challengeRow.cubid_user_id,
    humanSubjectKey: challengeRow.human_subject_key,
    userHandle: challengeRow.user_handle,
    rpId: challengeRow.rp_id,
    userVerification: challengeRow.user_verification,
    expiresAt: challengeRow.expires_at,
    createdAt: challengeRow.created_at,
    metadata: challengeRow.metadata,
    allowCredentials: allowedCredentials.map(serializeCredentialDescriptor),
    publicKey,
  };
}

export async function completePasskeyAuthentication(
  supabase: SupabaseClient,
  loginChallengeId: string,
  input: CompleteCubidWebAuthnAuthenticationInput,
  requestId: string,
): Promise<CompletePasskeyAuthenticationResult> {
  if (input.loginChallengeId && input.loginChallengeId !== loginChallengeId) {
    throw new AuthorizationRequestError("invalid_request", "The passkey authentication payload does not match the requested login challenge.");
  }

  const loginRequest = await getLoginRequestByChallenge(supabase, loginChallengeId);
  if (!loginRequest || loginRequest.status !== "pending_login" || isExpired(loginRequest.expires_at)) {
    throw new AuthorizationRequestError("challenge_not_found", "The login challenge could not be found or is no longer active.", { statusCode: 404 });
  }

  const challenge = ensureChallengeIsActive(await getChallengeById(supabase, input.challengeId), "authentication");
  if (challenge.login_challenge_id !== loginChallengeId) {
    throw new AuthorizationRequestError("invalid_request", "The passkey challenge does not belong to the requested login challenge.");
  }

  const credentialRow = await getCredentialById(supabase, input.credential.id);
  if (!credentialRow || credentialRow.revoked_at) {
    throw new AuthorizationRequestError("invalid_request", "The supplied passkey is not registered for Cubid login.", { statusCode: 401 });
  }

  const response = toAuthenticationResponseJSON(input);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: getOidcRuntimeConfig().passkeyExpectedOrigins,
    expectedRPID: getOidcRuntimeConfig().passkeyRpId,
    credential: toWebAuthnCredential(credentialRow),
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new AuthorizationRequestError("invalid_request", "The passkey assertion could not be verified.", { statusCode: 401 });
  }

  const parsedUserHandle = parseCubidWebAuthnUserHandle(
    normalizeOptionalString(response.response.userHandle) ?? challenge.user_handle ?? credentialRow.user_handle,
  );

  if (
    parsedUserHandle.humanSubjectKey !== credentialRow.human_subject_key
    || parsedUserHandle.cubidUserId !== credentialRow.cubid_user_id
  ) {
    throw new AuthorizationRequestError("invalid_request", "The verified passkey subject does not match the stored Cubid credential.", { statusCode: 409 });
  }

  const humanSubject = await getHumanSubjectByKey(supabase, credentialRow.human_subject_key);
  if (!humanSubject) {
    throw new AuthorizationRequestError("invalid_request", "The passkey subject no longer maps to an active Cubid identity.", { statusCode: 409 });
  }

  const { error: credentialUpdateError } = await supabase
    .from("oidc_webauthn_credentials")
    .update({
      sign_count: verification.authenticationInfo.newCounter,
      backup_state: verification.authenticationInfo.credentialBackedUp,
      last_authenticated_at: nowIso(),
      updated_at: nowIso(),
      metadata: {
        ...(credentialRow.metadata ?? {}),
        last_origin: verification.authenticationInfo.origin,
        last_rp_id: verification.authenticationInfo.rpID,
        credential_device_type: verification.authenticationInfo.credentialDeviceType,
      },
    })
    .eq("credential_id", credentialRow.credential_id);

  if (credentialUpdateError) {
    throw new Error(`Failed to update WebAuthn credential: ${credentialUpdateError.message}`);
  }

  await consumeChallenge(supabase, challenge.challenge_id, {
    ...(challenge.metadata ?? {}),
    consumed_request_id: requestId,
    verified_credential_id: credentialRow.credential_id,
  });

  const result = await completeLoginChallengeForSubject(
    supabase,
    loginChallengeId,
    {
      cubidUserId: humanSubject.cubid_user_id,
      humanSubjectKey: humanSubject.human_subject_key,
      verifiedEmail: humanSubject.primary_email,
      verifiedPhone: humanSubject.primary_phone,
      authenticationMethods: ["passkey"],
      webAuthnCredentialId: credentialRow.credential_id,
      metadata: {
        bootstrap: false,
        passkey_challenge_id: challenge.challenge_id,
        passkey_origin: verification.authenticationInfo.origin,
        passkey_rp_id: verification.authenticationInfo.rpID,
      },
      auditDetails: {
        passkey_challenge_id: challenge.challenge_id,
        passkey_origin: verification.authenticationInfo.origin,
        passkey_rp_id: verification.authenticationInfo.rpID,
      },
    },
    requestId,
  );

  await insertAuditEvent(supabase, {
    clientId: loginRequest.client_id,
    sessionId: result.sessionId,
    eventType: "passkey.authentication.completed",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: humanSubject.human_subject_key,
    details: {
      login_challenge_id: loginChallengeId,
      passkey_challenge_id: challenge.challenge_id,
      credential_id: credentialRow.credential_id,
      origin: verification.authenticationInfo.origin,
      rp_id: verification.authenticationInfo.rpID,
    },
  });

  return {
    next: result.next,
    redirectTo: result.redirectTo,
    sessionId: result.sessionId,
    webAuthnCredentialId: credentialRow.credential_id,
  };
}

export async function createPasskeyRegistrationOptions(
  supabase: SupabaseClient,
  sessionId: string,
  requestId: string,
): Promise<OidcPasskeyRegistrationOptions> {
  const session = await getActiveSession(supabase, sessionId);
  if (!session || !session.human_subject_key) {
    throw new AuthorizationRequestError("invalid_request", "An active OIDC session is required before registering a passkey.", { statusCode: 401 });
  }

  const existingCredentials = await listActiveCredentialsForHumanSubject(supabase, session.human_subject_key);
  const config = getOidcRuntimeConfig();
  const userHandle = createCubidWebAuthnUserHandle({
    humanSubjectKey: session.human_subject_key,
    cubidUserId: session.cubid_user_id,
  });
  const userName = session.verified_email ?? session.verified_phone ?? `cubid-${session.cubid_user_id ?? session.human_subject_key}`;
  const userDisplayName = session.verified_email ?? session.verified_phone ?? "Cubid user";
  const publicKey = await generateRegistrationOptions({
    rpName: config.passkeyRpName,
    rpID: config.passkeyRpId,
    userName,
    userDisplayName,
    userID: base64UrlDecode(userHandle),
    attestationType: "none",
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credential_id,
      transports: ensureStringArray(credential.transports) as NonNullable<WebAuthnCredential["transports"]>,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  const challengeId = createOpaqueId("webauthn_challenge");
  const challengeRow: PersistedWebAuthnChallengeRow = {
    challenge_id: challengeId,
    challenge: publicKey.challenge,
    challenge_type: "registration",
    login_challenge_id: null,
    session_id: sessionId,
    human_subject_key: session.human_subject_key,
    cubid_user_id: session.cubid_user_id,
    user_handle: userHandle,
    rp_id: config.passkeyRpId,
    user_verification: "required",
    expires_at: plusMs(PASSKEY_CHALLENGE_LIFETIME_MS),
    consumed_at: null,
    metadata: {
      request_id: requestId,
      attestation: "none",
      resident_key: "required",
    },
    created_at: nowIso(),
  };

  const { error } = await supabase.from("oidc_webauthn_challenges").insert(challengeRow);
  if (error) {
    throw new Error(`Failed to persist WebAuthn registration challenge: ${error.message}`);
  }

  await insertAuditEvent(supabase, {
    clientId: null,
    sessionId,
    eventType: "passkey.registration_challenge.created",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: session.human_subject_key,
    details: {
      session_id: sessionId,
      passkey_challenge_id: challengeId,
      exclude_credentials_count: existingCredentials.length,
    },
  });

  return {
    challengeId,
    challengeType: "registration",
    challenge: challengeRow.challenge,
    loginChallengeId: null,
    sessionId,
    cubidUserId: session.cubid_user_id,
    humanSubjectKey: session.human_subject_key,
    userHandle,
    rpId: challengeRow.rp_id,
    userVerification: challengeRow.user_verification,
    expiresAt: challengeRow.expires_at,
    createdAt: challengeRow.created_at,
    metadata: challengeRow.metadata,
    rpName: config.passkeyRpName,
    user: {
      id: userHandle,
      name: userName,
      displayName: userDisplayName,
    },
    excludeCredentials: existingCredentials.map(serializeCredentialDescriptor),
    authenticatorAttachment: null,
    residentKey: "required",
    attestation: "none",
    publicKey,
  };
}

export async function completePasskeyRegistration(
  supabase: SupabaseClient,
  sessionId: string,
  input: CompleteCubidWebAuthnRegistrationInput,
  requestId: string,
): Promise<CompletePasskeyRegistrationResult> {
  if (input.sessionId && input.sessionId !== sessionId) {
    throw new AuthorizationRequestError("invalid_request", "The passkey registration payload does not match the requested session.");
  }

  const session = await getActiveSession(supabase, sessionId);
  if (!session || !session.human_subject_key) {
    throw new AuthorizationRequestError("invalid_request", "An active OIDC session is required before registering a passkey.", { statusCode: 401 });
  }

  const challenge = ensureChallengeIsActive(await getChallengeById(supabase, input.challengeId), "registration");
  if (challenge.session_id !== sessionId) {
    throw new AuthorizationRequestError("invalid_request", "The passkey challenge does not belong to the requested session.");
  }

  const response = toRegistrationResponseJSON(input);
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: getOidcRuntimeConfig().passkeyExpectedOrigins,
    expectedRPID: getOidcRuntimeConfig().passkeyRpId,
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new AuthorizationRequestError("invalid_request", "The passkey registration could not be verified.", { statusCode: 401 });
  }

  const existingCredential = await getCredentialById(supabase, verification.registrationInfo.credential.id);
  if (existingCredential && !existingCredential.revoked_at) {
    throw new AuthorizationRequestError("invalid_request", "This passkey is already registered with Cubid.", { statusCode: 409 });
  }

  const challengeUserHandle = requireChallengeUserHandle(challenge);
  const subjectFromHandle = parseCubidWebAuthnUserHandle(challengeUserHandle);
  if (
    subjectFromHandle.humanSubjectKey !== session.human_subject_key
    || subjectFromHandle.cubidUserId !== session.cubid_user_id
  ) {
    throw new AuthorizationRequestError("invalid_request", "The passkey registration subject does not match the active Cubid session.", { statusCode: 409 });
  }

  const persistedCredential = {
    credential_id: verification.registrationInfo.credential.id,
    user_handle: challengeUserHandle,
    human_subject_key: session.human_subject_key,
    cubid_user_id: session.cubid_user_id,
    credential_label: normalizeOptionalString(input.credentialLabel),
    public_key_cose: base64UrlEncode(verification.registrationInfo.credential.publicKey),
    authenticator_attachment: normalizeOptionalString(response.authenticatorAttachment),
    authenticator_aaguid: verification.registrationInfo.aaguid,
    attestation_format: verification.registrationInfo.fmt,
    attestation_type: normalizeOptionalString(challenge.metadata?.attestation),
    transports: response.response.transports ?? [],
    backup_eligible: verification.registrationInfo.credentialDeviceType === "multiDevice",
    backup_state: verification.registrationInfo.credentialBackedUp,
    sign_count: verification.registrationInfo.credential.counter,
    metadata: {
      request_id: requestId,
      registration_challenge_id: challenge.challenge_id,
      credential_device_type: verification.registrationInfo.credentialDeviceType,
      origin: verification.registrationInfo.origin,
      rp_id: verification.registrationInfo.rpID,
    },
  };

  const { data, error } = await supabase
    .from("oidc_webauthn_credentials")
    .insert(persistedCredential)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to persist WebAuthn credential: ${error.message}`);
  }

  await consumeChallenge(supabase, challenge.challenge_id, {
    ...(challenge.metadata ?? {}),
    consumed_request_id: requestId,
    registered_credential_id: verification.registrationInfo.credential.id,
  });

  const credential = serializeCredential(data as PersistedWebAuthnCredentialRow);

  await insertAuditEvent(supabase, {
    clientId: null,
    sessionId,
    eventType: "passkey.registration.completed",
    requestId,
    outcome: "success",
    actorType: "user",
    actorIdentifier: session.human_subject_key,
    details: {
      session_id: sessionId,
      passkey_challenge_id: challenge.challenge_id,
      credential_id: credential.credentialId,
      origin: verification.registrationInfo.origin,
      rp_id: verification.registrationInfo.rpID,
    },
  });

  return {
    credential,
  };
}