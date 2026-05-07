import type { NextApiRequest, NextApiResponse } from "next"

import {
  forwardOidcJson,
  getSingleQueryValue,
} from "@/lib/server/oidcInteractionProxy"

export default async function createPasskeyAuthenticationOptions(
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
      )}/passkeys/authentication/options`,
      req.body
    )

    return res.status(result.status).json(result.body)
  } catch (error) {
    console.error(error)
    return res.status(502).json({
      error: "oidc_proxy_error",
      error_description: "Unable to create passkey authentication options.",
    })
  }
}
