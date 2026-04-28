import {
  getRequiredSecret,
  getRequiredSecretFromEnvAliases,
} from "@cubid/config"

export const getNearIssuerPrivateKey = () =>
  getRequiredSecretFromEnvAliases(["NEAR_ISSUER_PRIVATE_KEY", "private_key_near"])

export const getTwilioAccountSid = () =>
  getRequiredSecretFromEnvAliases(["TWILIO_ACCOUNT_SID", "twilio_sid"])

export const getTwilioAuthToken = () =>
  getRequiredSecretFromEnvAliases(["TWILIO_AUTH_TOKEN", "authToken"])

export const getTwilioVerifyServiceSid = () =>
  getRequiredSecret("TWILIO_VERIFY_SERVICE_SID")

export const getPassportInternalApiToken = () =>
  getRequiredSecret("PASSPORT_INTERNAL_API_TOKEN", { minLength: 16 })
