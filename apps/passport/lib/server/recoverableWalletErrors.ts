export const RECOVERABLE_WALLET_ERROR_CODES = {
  bundleNotFound: "recovery_bundle_not_found",
  bundleRevoked: "bundle_revoked",
  cancelled: "recovery_cancelled",
  consumed: "recovery_session_consumed",
  cooldownActive: "cooldown_active",
  expired: "recovery_session_expired",
  providerOutage: "provider_outage",
  unavailableCredential: "unavailable_credential",
  unsupportedAppContext: "unsupported_app_context",
  verificationRequired: "verification_required",
  wrongUser: "wrong_user",
} as const

export type RecoverableWalletErrorCode =
  (typeof RECOVERABLE_WALLET_ERROR_CODES)[keyof typeof RECOVERABLE_WALLET_ERROR_CODES]
