import type { NextApiRequest, NextApiResponse } from "next"

import {
  forwardOidcJson,
  getSingleQueryValue,
  setOidcSessionCookie,
} from "@/lib/server/oidcInteractionProxy"

export default async function completePasskeyAuthentication(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "method_not_allowed" })
  }

  const loginChallenge = getSingleQueryValue(req.query.loginChallenge)
  if (!loginChallenge) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing login challenge.",
    })
  }

  try {
    const result = await forwardOidcJson(
      `/interaction/login/${encodeURIComponent(
        loginChallenge
      )}/passkeys/authentication/complete`,
      req.body
    )

    if (
      result.status >= 200 &&
      result.status < 300 &&
      typeof result.body === "object" &&
      result.body !== null &&
      typeof (result.body as { session_id?: unknown }).session_id === "string"
    ) {
      setOidcSessionCookie(
        res,
        (result.body as { session_id: string }).session_id
      )
    }

    return res.status(result.status).json(result.body)
  } catch (error) {
    console.error(error)
    return res.status(502).json({
      error: "oidc_proxy_error",
      error_description: "Unable to complete passkey authentication.",
    })
  }
}
