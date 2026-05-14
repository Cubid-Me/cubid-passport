# ClearPass Verify Stamp

ClearPass Verify is a third-party KYC/personhood provider that Cubid can accept
as a high-value stamp. User-facing copy should say "Verify with ClearPass" and
must not frame this as "Cubid KYC".

## Contract

- Stamp slug: `clearpass_verify`.
- Collection URL: `/verify/clearpass?uid=<dapp_user_uuid>&page_id=<page_id>`.
- Callback URL: `/verify/clearpass/callback?clearpass_session=<signed-completion-token>&verification_id=<optional-consistency-check>`.
- Provider origin: `CLEARPASS_VERIFY_ORIGIN`, expected to be `https://scan.clearpass.app`.

Passport creates a short-lived ClearPass start token with partner app id
`cubid`, token use `clearpass_start`, an opaque Cubid verification session id as
the subject, and the Cubid callback URL. ClearPass must return a distinct signed
completion token with token use `clearpass_completion`, status `approved`, the
same opaque session id, and the provider verification id inside the signed
payload. Passport verifies the signature and token use, rejects expired,
non-approved, mismatched, or replayed sessions, mints the `clearpass_verify`
stamp, and persists the existing Allow Page disclosure grant for the requesting
dapp. The optional `verification_id` query parameter is only a consistency check
against the signed completion token; it is never trusted as proof by itself.

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
