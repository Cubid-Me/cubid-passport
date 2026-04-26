import type { NextApiRequest, NextApiResponse } from "next"

export const OIDC_SESSION_COOKIE_NAME = "cubid_oidc_session_id"

export type OidcProxyResult = {
  status: number
  body: unknown
}

export function getOidcSessionId(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie

  if (!cookieHeader) {
    return null
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=")
    if (rawName === OIDC_SESSION_COOKIE_NAME) {
      try {
        return decodeURIComponent(rawValueParts.join("="))
      } catch {
        return null
      }
    }
  }

  return null
}

export function setOidcSessionCookie(res: NextApiResponse, sessionId: string) {
  const cookieParts = [
    `${OIDC_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=43200",
  ]

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure")
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "))
}

export function getOidcProxyOrigin() {
  return (
    process.env.OIDC_INTERNAL_ORIGIN ??
    process.env.NEXT_PUBLIC_OIDC_ORIGIN ??
    "http://localhost:4280"
  ).replace(/\/$/, "")
}

export async function forwardOidcJson(
  path: string,
  body?: unknown
): Promise<OidcProxyResult> {
  const response = await fetch(`${getOidcProxyOrigin()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const responseText = await response.text()
  const responseBody = responseText ? JSON.parse(responseText) : {}

  return {
    status: response.status,
    body: responseBody,
  }
}

export async function fetchOidcJson(path: string): Promise<OidcProxyResult> {
  const response = await fetch(`${getOidcProxyOrigin()}${path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  })

  const responseText = await response.text()
  const responseBody = responseText ? JSON.parse(responseText) : {}

  return {
    status: response.status,
    body: responseBody,
  }
}

export function getSingleQueryValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}
