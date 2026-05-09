# ClearPass Verify Stamp

ClearPass Verify is a third-party KYC/personhood provider that Cubid can accept
as a high-value stamp. User-facing copy should say "Verify with ClearPass" and
must not frame this as "Cubid KYC".

## Contract

- Stamp slug: `clearpass_verify`.
- Collection URL: `/verify/clearpass?uid=<dapp_user_uuid>&page_id=<page_id>`.
- Callback URL: `/verify/clearpass/callback?clearpass_session=<signed-token>&verification_id=<id>`.
- Provider origin: `CLEARPASS_VERIFY_ORIGIN`, expected to be `https://scan.clearpass.app`.

Passport creates a short-lived ClearPass start token with partner app id
`cubid`, an opaque Cubid verification session id as the subject, and the Cubid
callback URL. ClearPass returns a signed completion token. Passport verifies the
signature, rejects expired or replayed sessions, mints the `clearpass_verify`
stamp, and persists the existing Allow Page disclosure grant for the requesting
dapp.

## Stored Data

Cubid stores provider metadata, ClearPass verification id, approved status,
assurance level, verified timestamp, and allowlisted derived claims such as
legal name, age or over-age flags, country, and state when ClearPass includes
them in the signed token.

Cubid must not store ClearPass document images, face images, raw OCR payloads,
biometric payloads, or raw provider internals in stamp data.

## SDK Boundary

Public SDK changes belong in `Cubid-Me/cubid-sdk`. The SDK should launch the
Cubid-hosted collection URL, not ClearPass directly, then refresh disclosed
stamps after the popup closes or redirects.
