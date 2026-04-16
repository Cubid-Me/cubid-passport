import {
  OIDC_CODE_CHALLENGE_METHODS,
  OIDC_GRANT_TYPES,
  OIDC_TOKEN_ENDPOINT_AUTH_METHODS,
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
import { createDynamicClientRegistration, getRegisteredClient } from "./registration";
import { getOidcSupabase } from "./supabase";

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(headers ?? {}),
    },
  });
}

function notImplemented(feature: string): Response {
  return jsonResponse(501, {
    error: "not_implemented",
    error_description: `${feature} is not implemented yet in the current B02 slice.`,
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
    device_authorization_endpoint: `${publicOrigin}/device_authorization`,
    grant_types_supported: OIDC_GRANT_TYPES,
    response_types_supported: ["code"],
    scopes_supported: ALL_OIDC_SCOPES,
    subject_types_supported: ["pairwise"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: OIDC_TOKEN_ENDPOINT_AUTH_METHODS,
    code_challenge_methods_supported: OIDC_CODE_CHALLENGE_METHODS,
  };
}

export async function handleOidcRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  if (method === "GET" && pathname === "/health") {
    return jsonResponse(200, { ok: true, service: "oidc" });
  }

  if (method === "GET" && pathname === "/.well-known/openid-configuration") {
    return jsonResponse(200, createOpenIdConfiguration());
  }

  if (method === "GET" && pathname === "/jwks") {
    return jsonResponse(200, getOidcRuntimeConfig().jwks);
  }

  if (method === "POST" && pathname === "/register") {
    try {
      const requestBody = (await request.json()) as Record<string, unknown>;
      const responseBody = await createDynamicClientRegistration(getOidcSupabase(), requestBody, getRequestId(request));
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
      const result = await createLoginChallengeFromAuthorizationRequest(getOidcSupabase(), request, getRequestId(request));
      return redirectResponse(result.redirectTo);
    } catch (error) {
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
      const requestBody = (await request.json()) as Record<string, unknown>;
      const result = await completeLoginChallenge(getOidcSupabase(), pathParts[2], requestBody, getRequestId(request));

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

      return jsonResponse(500, {
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unable to complete login challenge.",
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
      const result = await approveConsentChallenge(getOidcSupabase(), pathParts[2], getRequestId(request));

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
      const result = await rejectConsentChallenge(getOidcSupabase(), pathParts[2], getRequestId(request));

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

  if (method === "POST" && pathname === "/token") {
    return notImplemented("Token exchange");
  }

  if ((method === "GET" || method === "POST") && pathname === "/userinfo") {
    return notImplemented("Userinfo");
  }

  if (method === "POST" && pathname === "/revoke") {
    return notImplemented("Token revocation");
  }

  if (method === "GET" && pathname === "/logout") {
    return notImplemented("Logout");
  }

  if (method === "POST" && pathname === "/device_authorization") {
    return notImplemented("Device authorization");
  }

  return jsonResponse(404, {
    error: "not_found",
    error_description: `No OIDC route is defined for ${method} ${pathname}.`,
  });
}