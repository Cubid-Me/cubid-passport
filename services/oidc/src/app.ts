import {
  OIDC_CODE_CHALLENGE_METHODS,
} from "@cubid/auth";
import { ALL_OIDC_SCOPES } from "@cubid/claims";

import {
  AuthorizationRequestError,
  approveConsentChallenge,
  completeLoginChallenge,
  createLoginChallengeFromAuthorizationRequest,
  getConsentChallenge,
  getLoginChallenge,
  rejectConsentChallenge,
} from "./authorize";
import { getOidcRuntimeConfig } from "./config";
import {
  completePasskeyAuthentication,
  completePasskeyRegistration,
  createPasskeyAuthenticationOptions,
  createPasskeyRegistrationOptions,
} from "./passkeys";
import {
  enforceRateLimit,
  getRateLimitKey,
  RateLimitError,
} from "./rateLimit";
import { createDynamicClientRegistration, getRegisteredClient } from "./registration";
import { createOidcJwks } from "./signing";
import { getOidcSupabase } from "./supabase";
import {
  exchangeAuthorizationCode,
  getUserInfo,
  logout,
  OidcEndpointError,
  parseTokenEndpointInput,
  revokeToken,
} from "./tokens";

const IMPLEMENTED_GRANT_TYPES = ["authorization_code"] as const;
const IMPLEMENTED_TOKEN_ENDPOINT_AUTH_METHODS = ["none", "client_secret_basic", "client_secret_post"] as const;

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(headers ?? {}),
    },
  });
}

function redirectResponse(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      location,
    },
  });
}

function oidcErrorResponse(error: unknown): Response {
  if (error instanceof OidcEndpointError) {
    return jsonResponse(error.statusCode, {
      error: error.error,
      error_description: error.errorDescription,
    });
  }

  if (error instanceof RateLimitError) {
    return jsonResponse(
      429,
      {
        error: "rate_limit_exceeded",
        error_description: "Too many requests for this OIDC endpoint.",
      },
      {
        "retry-after": String(error.retryAfterSeconds),
      },
    );
  }

  return jsonResponse(500, {
    error: "server_error",
    error_description: error instanceof Error ? error.message : "Unable to process OIDC request.",
  });
}

function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

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
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: IMPLEMENTED_TOKEN_ENDPOINT_AUTH_METHODS,
    code_challenge_methods_supported: OIDC_CODE_CHALLENGE_METHODS,
  };
}

export async function handleOidcRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const requestId = getRequestId(request);

  if (method === "GET" && pathname === "/health") {
    const jwks = await createOidcJwks();
    return jsonResponse(200, {
      ok: true,
      service: "oidc",
      issuer: getOidcRuntimeConfig().issuer,
      jwks_active: jwks.keys.length > 0,
    });
  }

  if (method === "GET" && pathname === "/.well-known/openid-configuration") {
    return jsonResponse(200, createOpenIdConfiguration());
  }

  if (method === "GET" && pathname === "/jwks") {
    return jsonResponse(200, await createOidcJwks());
  }

  if (method === "POST" && pathname === "/register") {
    try {
      const requestBody = (await request.json()) as Record<string, unknown>;
      const responseBody = await createDynamicClientRegistration(getOidcSupabase(), requestBody, requestId);
      return jsonResponse(201, responseBody, { location: responseBody.registration_client_uri });
    } catch (error) {
      return jsonResponse(400, {
        error: "invalid_client_metadata",
        error_description: error instanceof Error ? error.message : "Unable to create OIDC client.",
      });
    }
  }

  if (method === "GET" && pathname.startsWith("/register/")) {
    const clientId = pathname.replace("/register/", "").trim();
    const registrationAccessToken = getBearerToken(request);

    if (!clientId || !registrationAccessToken) {
      return jsonResponse(401, {
        error: "invalid_registration_access_token",
        error_description: "A valid registration access token is required.",
      });
    }

    try {
      const client = await getRegisteredClient(getOidcSupabase(), clientId, registrationAccessToken);

      if (!client) {
        return jsonResponse(404, {
          error: "client_not_found",
          error_description: "No matching OIDC client could be found for the supplied registration token.",
        });
      }

      return jsonResponse(200, client);
    } catch (error) {
      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to load OIDC client.",
      });
    }
  }

  if (method === "GET" && pathname === "/authorize") {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "authorize",
        key: getRateLimitKey(request, url.searchParams.get("client_id") ?? "anonymous"),
        clientId: url.searchParams.get("client_id"),
        requestId,
      });
      const result = await createLoginChallengeFromAuthorizationRequest(getOidcSupabase(), request, requestId);
      return redirectResponse(result.redirectTo);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return oidcErrorResponse(error);
      }

      if (error instanceof AuthorizationRequestError) {
        if (error.redirectTo) {
          return redirectResponse(error.redirectTo);
        }

        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to create authorization challenge.",
      });
    }
  }

  const pathParts = pathname.split("/").filter(Boolean);

  if (pathParts[0] === "interaction" && pathParts[1] === "login" && method === "GET" && pathParts.length === 3) {
    try {
      const challenge = await getLoginChallenge(getOidcSupabase(), pathParts[2]);

      if (!challenge) {
        return jsonResponse(404, {
          error: "challenge_not_found",
          error_description: "The login challenge could not be found or is no longer active.",
        });
      }

      return jsonResponse(200, challenge);
    } catch (error) {
      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to load login challenge.",
      });
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "login" && method === "POST" && pathParts.length === 4 && pathParts[3] === "complete") {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "login_complete",
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
      });
      const requestBody = (await request.json()) as Record<string, unknown>;
      const result = await completeLoginChallenge(getOidcSupabase(), pathParts[2], requestBody, requestId);

      return jsonResponse(200, {
        status: "ok",
        next: result.next,
        redirect_to: result.redirectTo,
        session_id: result.sessionId,
      });
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(error);
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete login challenge.",
      });
    }
  }

  if (
    pathParts[0] === "interaction"
    && pathParts[1] === "login"
    && pathParts.length === 6
    && pathParts[3] === "passkeys"
    && pathParts[4] === "authentication"
    && pathParts[5] === "options"
    && method === "POST"
  ) {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "passkey_challenge",
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
      });
      const requestBody = (await request.json()) as Record<string, unknown>;
      const result = await createPasskeyAuthenticationOptions(getOidcSupabase(), pathParts[2], requestBody, requestId);
      return jsonResponse(200, result);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(error);
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to create passkey authentication challenge.",
      });
    }
  }

  if (
    pathParts[0] === "interaction"
    && pathParts[1] === "login"
    && pathParts.length === 6
    && pathParts[3] === "passkeys"
    && pathParts[4] === "authentication"
    && pathParts[5] === "complete"
    && method === "POST"
  ) {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "passkey_challenge",
        key: getRateLimitKey(request, pathParts[2]),
        requestId,
      });
      const requestBody = (await request.json()) as Record<string, unknown>;
      const result = await completePasskeyAuthentication(
        getOidcSupabase(),
        pathParts[2],
        requestBody as unknown as Parameters<typeof completePasskeyAuthentication>[2],
        requestId,
      );

      return jsonResponse(200, {
        status: "ok",
        next: result.next,
        redirect_to: result.redirectTo,
        session_id: result.sessionId,
        webauthn_credential_id: result.webAuthnCredentialId,
      });
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(error);
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete passkey authentication.",
      });
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "consent" && method === "GET" && pathParts.length === 3) {
    try {
      const challenge = await getConsentChallenge(getOidcSupabase(), pathParts[2]);

      if (!challenge) {
        return jsonResponse(404, {
          error: "challenge_not_found",
          error_description: "The consent challenge could not be found or is no longer active.",
        });
      }

      return jsonResponse(200, challenge);
    } catch (error) {
      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to load consent challenge.",
      });
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "consent" && method === "POST" && pathParts.length === 4 && pathParts[3] === "approve") {
    try {
      const result = await approveConsentChallenge(getOidcSupabase(), pathParts[2], requestId);

      return jsonResponse(200, {
        status: "ok",
        redirect_to: result.redirectTo,
        authorization_code: result.authorizationCode,
      });
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to approve consent challenge.",
      });
    }
  }

  if (pathParts[0] === "interaction" && pathParts[1] === "consent" && method === "POST" && pathParts.length === 4 && pathParts[3] === "reject") {
    try {
      const result = await rejectConsentChallenge(getOidcSupabase(), pathParts[2], requestId);

      return jsonResponse(200, {
        status: "rejected",
        redirect_to: result.redirectTo,
      });
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to reject consent challenge.",
      });
    }
  }

  if (
    pathParts[0] === "sessions"
    && pathParts.length === 5
    && pathParts[2] === "passkeys"
    && pathParts[3] === "registration"
    && pathParts[4] === "options"
    && method === "POST"
  ) {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "passkey_challenge",
        key: getRateLimitKey(request, pathParts[1]),
        requestId,
      });
      const result = await createPasskeyRegistrationOptions(getOidcSupabase(), pathParts[1], requestId);
      return jsonResponse(200, result);
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(error);
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to create passkey registration challenge.",
      });
    }
  }

  if (
    pathParts[0] === "sessions"
    && pathParts.length === 5
    && pathParts[2] === "passkeys"
    && pathParts[3] === "registration"
    && pathParts[4] === "complete"
    && method === "POST"
  ) {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "passkey_challenge",
        key: getRateLimitKey(request, pathParts[1]),
        requestId,
      });
      const requestBody = (await request.json()) as Record<string, unknown>;
      const result = await completePasskeyRegistration(
        getOidcSupabase(),
        pathParts[1],
        requestBody as unknown as Parameters<typeof completePasskeyRegistration>[2],
        requestId,
      );
      return jsonResponse(200, {
        status: "ok",
        credential: result.credential,
      });
    } catch (error) {
      if (error instanceof AuthorizationRequestError) {
        return jsonResponse(error.statusCode, {
          error: error.error,
          error_description: error.errorDescription,
        });
      }

      if (error instanceof RateLimitError) {
        return oidcErrorResponse(error);
      }

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete passkey registration.",
      });
    }
  }

  if (method === "POST" && pathname === "/token") {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "token",
        key: getRateLimitKey(request, "token"),
        requestId,
      });
      const input = await parseTokenEndpointInput(request);
      const responseBody = await exchangeAuthorizationCode(getOidcSupabase(), input, requestId);
      return jsonResponse(200, responseBody, { "cache-control": "no-store", pragma: "no-cache" });
    } catch (error) {
      return oidcErrorResponse(error);
    }
  }

  if ((method === "GET" || method === "POST") && pathname === "/userinfo") {
    try {
      await enforceRateLimit(getOidcSupabase(), {
        route: "userinfo",
        key: getRateLimitKey(request, "userinfo"),
        requestId,
      });
      return jsonResponse(200, await getUserInfo(getOidcSupabase(), getBearerToken(request), requestId));
    } catch (error) {
      return oidcErrorResponse(error);
    }
  }

  if (method === "POST" && pathname === "/revoke") {
    try {
      await revokeToken(getOidcSupabase(), await request.formData(), requestId);
      return new Response(null, { status: 200 });
    } catch (error) {
      return oidcErrorResponse(error);
    }
  }

  if (method === "GET" && pathname === "/logout") {
    try {
      const result = await logout(getOidcSupabase(), request, requestId);
      if (result.redirectTo) {
        return redirectResponse(result.redirectTo);
      }

      return jsonResponse(200, { status: "ok" });
    } catch (error) {
      return oidcErrorResponse(error);
    }
  }

  return jsonResponse(404, {
    error: "not_found",
    error_description: `No OIDC route is defined for ${method} ${pathname}.`,
  });
}
