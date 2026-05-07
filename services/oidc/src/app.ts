import {
  CUBID_ACR_VALUES,
  OIDC_CODE_CHALLENGE_METHODS,
} from "@cubid/auth";
import {
  ApiSecurityError,
  assertAllowedOrigin,
  buildOidcErrorEnvelope,
  createCorsHeaders,
  enforceApiRateLimit,
  getRequestIdFromFetchRequest,
  parseJsonBody,
  z,
  type ApiRateLimitAdapterInput,
} from "@cubid/auth/server";
import { ALL_OIDC_SCOPES } from "@cubid/claims";

import { AuthorizationRequestError, approveConsentChallenge, completeLoginChallenge, createLoginChallengeFromAuthorizationRequest, getConsentChallenge, getLoginChallenge, rejectConsentChallenge } from "./authorize";
import { getOidcRuntimeConfig } from "./config";
import { completePasskeyAuthentication, completePasskeyRegistration, createPasskeyAuthenticationOptions, createPasskeyRegistrationOptions } from "./passkeys";
import { enforceRateLimit, getRateLimitKey, RateLimitError } from "./rateLimit";
import { createDynamicClientRegistration, getRegisteredClient } from "./registration";
import { createOidcJwks } from "./signing";
import { getOidcSupabase } from "./supabase";
import { exchangeAuthorizationCode, getUserInfo, logout, OidcEndpointError, parseRevocationEndpointInput, parseTokenEndpointInput, revokeToken } from "./tokens";

const IMPLEMENTED_GRANT_TYPES = ["authorization_code"] as const;
const IMPLEMENTED_TOKEN_ENDPOINT_AUTH_METHODS = [
  "none",
  "client_secret_basic",
  "client_secret_post",
] as const;

const dynamicClientRegistrationSchema = z
  .object({
    allowed_scopes: z.array(z.string()).optional(),
    client_name: z.string().trim().min(1).optional(),
    client_type: z.string().trim().min(1).optional(),
    contacts: z.array(z.string()).optional(),
    default_scopes: z.array(z.string()).optional(),
    grant_types: z.array(z.string()).optional(),
    logo_uri: z.string().trim().min(1).optional(),
    policy_uri: z.string().trim().min(1).optional(),
    post_logout_redirect_uris: z.array(z.string()).optional(),
    redirect_uris: z.array(z.string()).optional(),
    token_endpoint_auth_method: z.string().trim().min(1).optional(),
    tos_uri: z.string().trim().min(1).optional(),
  })
  .passthrough();

const loginCompletionSchema = z
  .object({
    authentication_methods: z.array(z.string()).optional(),
    cubid_user_id: z.number().int().optional(),
    firebase_id_token: z.string().trim().min(1).optional(),
    verified_email: z.string().trim().min(1).optional(),
    verified_phone: z.string().trim().min(1).optional(),
  })
  .passthrough();

const passkeyCredentialResponseSchema = z
  .object({
    authenticatorAttachment: z.string().trim().min(1).nullable().optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    id: z.string().trim().min(1),
    rawId: z.string().trim().min(1),
    response: z.record(z.unknown()),
    type: z.literal("public-key"),
  })
  .passthrough();

const passkeyAuthenticationOptionsSchema = z
  .object({
    login_hint: z.string().trim().min(1).optional(),
  })
  .passthrough();

const passkeyAuthenticationCompleteSchema = z
  .object({
    challengeId: z.string().trim().min(1),
    credential: passkeyCredentialResponseSchema,
    loginChallengeId: z.string().trim().min(1).nullable().optional(),
  })
  .passthrough();

const passkeyRegistrationCompleteSchema = z
  .object({
    challengeId: z.string().trim().min(1),
    credential: passkeyCredentialResponseSchema,
    credentialLabel: z.string().trim().min(1).nullable().optional(),
    loginChallengeId: z.string().trim().min(1).nullable().optional(),
    sessionId: z.string().trim().min(1).nullable().optional(),
  })
  .passthrough();

type OidcCorsPolicy = {
  allowedMethods: string[];
};

export function jsonResponse(
  requestId: string,
  status: number,
  body: unknown,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
      ...(headers ?? {}),
    },
  });
}

export function redirectResponse(
  requestId: string,
  location: string,
  status = 302,
  headers?: Record<string, string>
): Response {
  return new Response(null, {
    status,
    headers: {
      location,
      "x-request-id": requestId,
      ...(headers ?? {}),
    },
  });
}

export function oidcErrorResponse(
  requestId: string,
  error: unknown,
  headers?: Record<string, string>
): Response {
  if (error instanceof OidcEndpointError) {
    return jsonResponse(requestId, error.statusCode, {
      error: error.error,
      error_description: error.errorDescription,
    }, headers);
  }

  if (error instanceof RateLimitError) {
    const envelope = buildOidcErrorEnvelope(requestId, error);
    return jsonResponse(requestId, envelope.statusCode, envelope.body, {
      ...(envelope.headers ?? {}),
      ...(headers ?? {}),
    });
  }

  if (error instanceof ApiSecurityError) {
    const envelope = buildOidcErrorEnvelope(requestId, error);
    return jsonResponse(requestId, envelope.statusCode, envelope.body, {
      ...(envelope.headers ?? {}),
      ...(headers ?? {}),
    });
  }

  const envelope = buildOidcErrorEnvelope(requestId, error);
  return jsonResponse(requestId, envelope.statusCode, envelope.body, {
    ...(envelope.headers ?? {}),
    ...(headers ?? {}),
  });
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function resolveOidcCorsPolicy(pathname: string): OidcCorsPolicy | null {
  const pathParts = pathname.split("/").filter(Boolean);

  if (
    pathParts[0] === "interaction" &&
    pathParts[1] === "login" &&
    pathParts.length === 3
  ) {
    return { allowedMethods: ["GET", "OPTIONS"] };
  }

  if (
    pathParts[0] === "interaction" &&
    pathParts[1] === "login" &&
    pathParts.length === 4 &&
    pathParts[3] === "complete"
  ) {
    return { allowedMethods: ["POST", "OPTIONS"] };
  }

  if (
    pathParts[0] === "interaction" &&
    pathParts[1] === "login" &&
    pathParts.length === 6 &&
    pathParts[3] === "passkeys" &&
    pathParts[4] === "authentication"
  ) {
    return { allowedMethods: ["POST", "OPTIONS"] };
  }

  if (
    pathParts[0] === "interaction" &&
    pathParts[1] === "consent" &&
    pathParts.length === 3
  ) {
    return { allowedMethods: ["GET", "OPTIONS"] };
  }

  if (
    pathParts[0] === "interaction" &&
    pathParts[1] === "consent" &&
    pathParts.length === 4 &&
    ["approve", "reject"].includes(pathParts[3])
  ) {
    return { allowedMethods: ["POST", "OPTIONS"] };
  }

  if (
    pathParts[0] === "sessions" &&
    pathParts.length === 5 &&
    pathParts[2] === "passkeys" &&
    pathParts[3] === "registration"
  ) {
    return { allowedMethods: ["POST", "OPTIONS"] };
  }

  return null;
}

export function createOidcCorsHeaders(
  request: Request,
  allowedMethods: string[]
): Record<string, string> {
  const origin = assertAllowedOrigin(
    request.headers.get("origin")?.trim() || null,
    getOidcRuntimeConfig().corsAllowedOrigins
  );

  return createCorsHeaders(origin, allowedMethods);
}

function preflightResponse(
  requestId: string,
  request: Request,
  policy: OidcCorsPolicy
) {
  const origin = assertAllowedOrigin(
    request.headers.get("origin")?.trim() || null,
    getOidcRuntimeConfig().corsAllowedOrigins,
    {
      allowMissingOrigin: false,
    }
  );

  return new Response(null, {
    status: 204,
    headers: {
      ...createCorsHeaders(origin, policy.allowedMethods),
      "x-request-id": requestId,
    },
  });
}

const oidcRateLimitAdapter = {
  async enforce(input: ApiRateLimitAdapterInput) {
    await enforceRateLimit(getOidcSupabase(), {
      clientId: input.clientId,
      key: input.key,
      requestId: input.requestId,
      route: input.route,
      tier:
        input.tier === "starter" ||
        input.tier === "trusted" ||
        input.tier === "internal"
          ? input.tier
          : undefined,
    });
  },
};

export function createOpenIdConfiguration() {
  const config = getOidcRuntimeConfig();
  const publicOrigin = config.publicOrigin;

  return {
    issuer: config.issuer,
    authorization_endpoint: `${publicOrigin}/authorize`,
    token_endpoint: `${publicOrigin}/token`,
    userinfo_endpoint: `${publicOrigin}/userinfo`,
    jwks_uri: `${publicOrigin}/jwks`,
    revocation_endpoint: `${publicOrigin}/revoke`,
    end_session_endpoint: `${publicOrigin}/logout`,
    registration_endpoint: `${publicOrigin}/register`,
    grant_types_supported: IMPLEMENTED_GRANT_TYPES,
    response_types_supported: ["code"],
    scopes_supported: ALL_OIDC_SCOPES,
    subject_types_supported: ["pairwise"],
    acr_values_supported: CUBID_ACR_VALUES,
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: IMPLEMENTED_TOKEN_ENDPOINT_AUTH_METHODS,
    code_challenge_methods_supported: OIDC_CODE_CHALLENGE_METHODS,
  };
}

export async function handleOidcRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const requestId = getRequestIdFromFetchRequest(request, "oidc");
  const corsPolicy = resolveOidcCorsPolicy(pathname);

  if (method === "OPTIONS" && corsPolicy) {
    try {
      return preflightResponse(requestId, request, corsPolicy);
    } catch (error) {
      return oidcErrorResponse(requestId, error);
    }
  }

  let corsHeaders: Record<string, string> = {};

  if (corsPolicy) {
    try {
      corsHeaders = createOidcCorsHeaders(request, corsPolicy.allowedMethods);
    } catch (error) {
      return oidcErrorResponse(requestId, error);
    }
  }

  if (method === "GET" && pathname === "/health") {
    const jwks = await createOidcJwks();
    return jsonResponse(requestId, 200, {
      ok: true,
      service: "oidc",
      issuer: getOidcRuntimeConfig().issuer,
      jwks_active: jwks.keys.length > 0,
    }, corsHeaders);
  }

  if (method === "GET" && pathname === "/.well-known/openid-configuration") {
    return jsonResponse(requestId, 200, createOpenIdConfiguration(), corsHeaders);
  }

  if (method === "GET" && pathname === "/jwks") {
    return jsonResponse(requestId, 200, await createOidcJwks(), corsHeaders);
  }

  if (method === "POST" && pathname === "/register") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: request.headers.get("origin") ?? "register",
        requestId,
        route: "register",
      });
      const requestBody = await parseJsonBody(
        request,
        dynamicClientRegistrationSchema,
        "OIDC client registration payload is invalid."
      );
      const responseBody = await createDynamicClientRegistration(getOidcSupabase(), requestBody, requestId);
      return jsonResponse(requestId, 201, responseBody, {
        ...corsHeaders,
        location: responseBody.registration_client_uri,
      });
    } catch (error) {
      if (!(error instanceof ApiSecurityError)) {
        return jsonResponse(requestId, 400, {
          error: "invalid_client_metadata",
          error_description: error instanceof Error ? error.message : "Unable to create OIDC client.",
        }, corsHeaders);
      }

      return oidcErrorResponse(requestId, error, corsHeaders);
    }
  }

  if (method === "GET" && pathname.startsWith("/register/")) {
    const clientId = pathname.replace("/register/", "").trim();
    const registrationAccessToken = getBearerToken(request);

    if (!clientId || !registrationAccessToken) {
      return jsonResponse(requestId, 401, {
        error: "invalid_registration_access_token",
        error_description: "A valid registration access token is required.",
      }, corsHeaders);
    }

    try {
      const client = await getRegisteredClient(getOidcSupabase(), clientId, registrationAccessToken);

      if (!client) {
        return jsonResponse(requestId, 404, {
          error: "client_not_found",
          error_description: "No matching OIDC client could be found for the supplied registration token.",
        }, corsHeaders);
      }

      return jsonResponse(requestId, 200, client, corsHeaders);
    } catch (error) {
      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to load OIDC client.",
      }, corsHeaders);
    }
  }

  if (method === "GET" && pathname === "/authorize") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        clientId: url.searchParams.get("client_id"),
        key: getRateLimitKey(request, url.searchParams.get("client_id") ?? "anonymous"),
        requestId,
        route: "authorize",
      });
      const result = await createLoginChallengeFromAuthorizationRequest(getOidcSupabase(), request, requestId);
      return redirectResponse(requestId, result.redirectTo, 302, corsHeaders);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      if (error instanceof AuthorizationRequestError) {
        if (error.redirectTo) {
          return redirectResponse(requestId, error.redirectTo, 302, corsHeaders);
        }

        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to create authorization challenge.",
      }, corsHeaders);
    }
  }

  const pathParts = pathname.split("/").filter(Boolean);

  if (pathParts[0] === "interaction" && pathParts[1] === "login" && method === "GET" && pathParts.length === 3) {
    try {
      const challenge = await getLoginChallenge(getOidcSupabase(), pathParts[2]);

      if (!challenge) {
        return jsonResponse(requestId, 404, {
          error: "challenge_not_found",
          error_description: "The login challenge could not be found or is no longer active.",
        }, corsHeaders);
      }

      return jsonResponse(requestId, 200, challenge, corsHeaders);
    } catch (error) {
      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to load login challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "login" && method === "POST" && pathParts.length === 4 && pathParts[3] === "complete") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
        route: "login_complete",
      });
      const requestBody = await parseJsonBody(
        request,
        loginCompletionSchema,
        "OIDC login completion payload is invalid."
      );
      const result = await completeLoginChallenge(getOidcSupabase(), pathParts[2], requestBody, requestId);

      return jsonResponse(requestId, 200, {
        status: "ok",
        next: result.next,
        redirect_to: result.redirectTo,
        session_id: result.sessionId,
      }, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete login challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "login" && pathParts.length === 6 && pathParts[3] === "passkeys" && pathParts[4] === "authentication" && pathParts[5] === "options" && method === "POST") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
        route: "passkey_challenge",
      });
      const requestBody = await parseJsonBody(
        request,
        passkeyAuthenticationOptionsSchema,
        "Passkey authentication options payload is invalid."
      );
      const result = await createPasskeyAuthenticationOptions(getOidcSupabase(), pathParts[2], requestBody, requestId);
      return jsonResponse(requestId, 200, result, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to create passkey authentication challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "login" && pathParts.length === 6 && pathParts[3] === "passkeys" && pathParts[4] === "authentication" && pathParts[5] === "complete" && method === "POST") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
        route: "passkey_challenge",
      });
      const requestBody = await parseJsonBody(
        request,
        passkeyAuthenticationCompleteSchema,
        "Passkey authentication payload is invalid."
      );
      const result = await completePasskeyAuthentication(getOidcSupabase(), pathParts[2], requestBody as unknown as Parameters<typeof completePasskeyAuthentication>[2], requestId);

      return jsonResponse(requestId, 200, {
        status: "ok",
        next: result.next,
        redirect_to: result.redirectTo,
        session_id: result.sessionId,
        webauthn_credential_id: result.webAuthnCredentialId,
      }, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete passkey authentication.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "consent" && method === "GET" && pathParts.length === 3) {
    try {
      const challenge = await getConsentChallenge(getOidcSupabase(), pathParts[2]);

      if (!challenge) {
        return jsonResponse(requestId, 404, {
          error: "challenge_not_found",
          error_description: "The consent challenge could not be found or is no longer active.",
        }, corsHeaders);
      }

      return jsonResponse(requestId, 200, challenge, corsHeaders);
    } catch (error) {
      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to load consent challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "consent" && method === "POST" && pathParts.length === 4 && pathParts[3] === "approve") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
        route: "consent_complete",
      });
      const result = await approveConsentChallenge(getOidcSupabase(), pathParts[2], requestId);

      return jsonResponse(requestId, 200, {
        status: "ok",
        redirect_to: result.redirectTo,
        authorization_code: result.authorizationCode,
      }, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to approve consent challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "consent" && method === "POST" && pathParts.length === 4 && pathParts[3] === "reject") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
        route: "consent_complete",
      });
      const result = await rejectConsentChallenge(getOidcSupabase(), pathParts[2], requestId);

      return jsonResponse(requestId, 200, {
        status: "rejected",
        redirect_to: result.redirectTo,
      }, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to reject consent challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "sessions" && pathParts.length === 5 && pathParts[2] === "passkeys" && pathParts[3] === "registration" && pathParts[4] === "options" && method === "POST") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[1]),
        requestId,
        route: "passkey_challenge",
      });
      const result = await createPasskeyRegistrationOptions(getOidcSupabase(), pathParts[1], requestId);
      return jsonResponse(requestId, 200, result, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to create passkey registration challenge.",
      }, corsHeaders);
    }
  }

  if (pathParts[0] === "sessions" && pathParts.length === 5 && pathParts[2] === "passkeys" && pathParts[3] === "registration" && pathParts[4] === "complete" && method === "POST") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, pathParts[1]),
        requestId,
        route: "passkey_challenge",
      });
      const requestBody = await parseJsonBody(
        request,
        passkeyRegistrationCompleteSchema,
        "Passkey registration payload is invalid."
      );
      const result = await completePasskeyRegistration(getOidcSupabase(), pathParts[1], requestBody as unknown as Parameters<typeof completePasskeyRegistration>[2], requestId);
      return jsonResponse(requestId, 200, {
        status: "ok",
        credential: result.credential,
      }, corsHeaders);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(requestId, error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        }, corsHeaders);
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(requestId, error, corsHeaders);
      }

      return jsonResponse(requestId, 500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete passkey registration.",
      }, corsHeaders);
    }
  }

  if (method === "POST" && pathname === "/token") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, "token"),
        requestId,
        route: "token",
      });
      const input = await parseTokenEndpointInput(request);
      const responseBody = await exchangeAuthorizationCode(getOidcSupabase(), input, requestId);
      return jsonResponse(requestId, 200, responseBody, {
        ...corsHeaders,
        "cache-control": "no-store",
        pragma: "no-cache",
      });
    } catch (error) {
      return oidcErrorResponse(requestId, error, corsHeaders);
    }
  }

  if ((method === "GET" || method === "POST") && pathname === "/userinfo") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, "userinfo"),
        requestId,
        route: "userinfo",
      });
      return jsonResponse(requestId, 200, await getUserInfo(getOidcSupabase(), getBearerToken(request), requestId), corsHeaders);
    } catch (error) {
      return oidcErrorResponse(requestId, error, corsHeaders);
    }
  }

  if (method === "POST" && pathname === "/revoke") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, "revoke"),
        requestId,
        route: "revoke",
      });
      await revokeToken(getOidcSupabase(), await parseRevocationEndpointInput(request), requestId);
      return new Response(null, {
        status: 200,
        headers: {
          "x-request-id": requestId,
          ...(corsHeaders ?? {}),
        },
      });
    } catch (error) {
      return oidcErrorResponse(requestId, error, corsHeaders);
    }
  }

  if (method === "GET" && pathname === "/logout") {
    try {
      await enforceApiRateLimit(oidcRateLimitAdapter, {
        key: getRateLimitKey(request, "logout"),
        requestId,
        route: "logout",
      });
      const result = await logout(getOidcSupabase(), request, requestId);
      if (result.redirectTo) {
        return redirectResponse(requestId, result.redirectTo, 302, corsHeaders);
      }

      return jsonResponse(requestId, 200, { status: "ok" }, corsHeaders);
    } catch (error) {
      return oidcErrorResponse(requestId, error, corsHeaders);
    }
  }

  return jsonResponse(requestId, 404, {
    error: "not_found",
    error_description: `No OIDC route is defined for ${method} ${pathname}.`,
  }, corsHeaders);
}
