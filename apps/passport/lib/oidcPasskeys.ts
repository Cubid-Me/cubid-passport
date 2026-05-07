import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser"
import axios from "axios"

type PasskeyAuthenticationInput = {
  loginChallengeId: string
  loginHint?: string
}

type PasskeyRegistrationInput = {
  credentialLabel?: string
}

export { browserSupportsWebAuthn }

export async function authenticateLoginChallengeWithPasskey({
  loginChallengeId,
  loginHint,
}: PasskeyAuthenticationInput) {
  const { data: optionsEnvelope } = await axios.post(
    `/api/oidc/interactions/login/${loginChallengeId}/passkeys/authentication/options`,
    loginHint ? { login_hint: loginHint } : {}
  )
  const credential = await startAuthentication({
    optionsJSON: optionsEnvelope.publicKey,
  })

  const { data } = await axios.post(
    `/api/oidc/interactions/login/${loginChallengeId}/passkeys/authentication/complete`,
    {
      challengeId: optionsEnvelope.challengeId,
      loginChallengeId,
      credential,
    }
  )

  return data
}

export async function registerOidcPasskey({
  credentialLabel = "Passport passkey",
}: PasskeyRegistrationInput = {}) {
  const { data: optionsEnvelope } = await axios.post(
    "/api/oidc/passkeys/registration/options"
  )
  const credential = await startRegistration({
    optionsJSON: optionsEnvelope.publicKey,
  })

  const { data } = await axios.post(
    "/api/oidc/passkeys/registration/complete",
    {
      challengeId: optionsEnvelope.challengeId,
      sessionId: optionsEnvelope.sessionId,
      credentialLabel,
      credential,
    }
  )

  return data
}
