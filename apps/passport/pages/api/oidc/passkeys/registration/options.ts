import type { NextApiRequest, NextApiResponse } from "next"

import {
  forwardOidcJson,
  getOidcSessionId,
} from "@/lib/server/oidcInteractionProxy"

export default async function createPasskeyRegistrationOptions(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "method_not_allowed" })
  }

  const sessionId = getOidcSessionId(req)
  if (!sessionId) {
    return res.status(401).json({
      error: "oidc_session_required",
      error_description: "Sign in with Cubid before registering a passkey.",
    })
  }

  try {
    const result = await forwardOidcJson(
      `/sessions/${encodeURIComponent(sessionId)}/passkeys/registration/options`
    )
    return res.status(result.status).json(result.body)
  } catch (error) {
    console.error(error)
    return res.status(502).json({
      error: "oidc_proxy_error",
      error_description: "Unable to create passkey registration options.",
    })
  }
}
